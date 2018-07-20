'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }(); /* eslint-disable no-new */


var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _geoViewport = require('@mapbox/geo-viewport');

var _geoViewport2 = _interopRequireDefault(_geoViewport);

var _mapboxGlNative = require('@mapbox/mapbox-gl-native');

var _mapboxGlNative2 = _interopRequireDefault(_mapboxGlNative);

var _mbtiles = require('@mapbox/mbtiles');

var _mbtiles2 = _interopRequireDefault(_mbtiles);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _sharp = require('sharp');

var _sharp2 = _interopRequireDefault(_sharp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var TILE_REGEXP = RegExp('mbtiles://([^/]+)/(\\d+)/(\\d+)/(\\d+)');
var NAME_REGEXP = RegExp('(?<=mbtiles://)(\\S+?)(?=[/"]+)');

/**
 * Very simplistic function that splits out mbtiles service name from the URL
 *
 * @param {String} url - URL to resolve
 */
var resolveNamefromURL = function resolveNamefromURL(url) {
    return url.split('://')[1].split('/')[0];
};

/**
 * Resolve a URL of a local mbtiles file to a file path
 * Expected to follow this format "mbtiles://<service_name>/*"
 *
 * @param {String} tilePath - path containing mbtiles files
 * @param {String} url - url of a data source in style.json file.
 */
var resolveMBTilesURL = function resolveMBTilesURL(tilePath, url) {
    return _path2.default.format({ dir: tilePath, name: resolveNamefromURL(url), ext: '.mbtiles' });
};

/**
 * Given a URL to a local mbtiles file, get the TileJSON for that to load correct tiles.
 *
 * @param {String} tilePath - path containing mbtiles files.
 * @param {String} url - url of a data source in style.json file.
 * @param {function} callback - function to call with (err, data).
 */
var getTileJSON = function getTileJSON(tilePath, url, callback) {
    var mbtilesFilename = resolveMBTilesURL(tilePath, url);
    var service = resolveNamefromURL(url);

    new _mbtiles2.default(mbtilesFilename, function (err, mbtiles) {
        if (err) {
            callback(err);
            return null;
        }

        mbtiles.getInfo(function (infoErr, info) {
            if (infoErr) {
                callback(infoErr);
                return null;
            }

            var minzoom = info.minzoom,
                maxzoom = info.maxzoom,
                center = info.center,
                bounds = info.bounds,
                format = info.format;


            var ext = format === 'pbf' ? '.pbf' : '';

            var tileJSON = {
                tilejson: '1.0.0',
                tiles: ['mbtiles://' + service + '/{z}/{x}/{y}' + ext],
                minzoom: minzoom,
                maxzoom: maxzoom,
                center: center,
                bounds: bounds
            };

            callback(null, { data: Buffer.from(JSON.stringify(tileJSON)) });
            return null;
        });

        return null;
    });
};

/**
 * Fetch a tile from a local mbtiles file.
 *
 * @param {String} tilePath - path containing mbtiles files.
 * @param {String} url - url of a data source in style.json file.
 * @param {function} callback - function to call with (err, data).
 */
var getTile = function getTile(tilePath, url, callback) {
    var matches = url.match(TILE_REGEXP);

    var _matches$slice = matches.slice(matches.length - 3, matches.length),
        _matches$slice2 = _slicedToArray(_matches$slice, 3),
        z = _matches$slice2[0],
        x = _matches$slice2[1],
        y = _matches$slice2[2];

    var isVector = _path2.default.extname(url) === '.pbf';
    var mbtilesFile = resolveMBTilesURL(tilePath, url);

    new _mbtiles2.default(mbtilesFile, function (err, mbtiles) {
        if (err) {
            callback(err);
            return null;
        }

        mbtiles.getTile(z, x, y, function (tileErr, data) {
            if (tileErr) {
                // console.log(`error fetching tile: z:${z} x:${x} y:${y} from ${mbtilesFile}\n${tileErr}`)
                callback(null, {});
                return null;
            }

            if (isVector) {
                // if the tile is compressed, unzip it (for vector tiles only!)
                _zlib2.default.unzip(data, function (unzipErr, unzippedData) {
                    callback(unzipErr, { data: unzippedData });
                });
            } else {
                callback(null, { data: data });
            }

            return null;
        });

        return null;
    });
};

/**
 * Fetch a remotely hosted tile
 *
 * @param {String} url - URL of remote tile
 * @param {function} callback - callback to call with (err, {data})
 */
var getRemoteTile = function getRemoteTile(url, callback) {
    (0, _request2.default)({
        url: url,
        encoding: null,
        gzip: true
    }, function (err, res, body) {
        if (err) {
            callback(err);
        } else if (res.statusCode === 200) {
            var response = {};

            if (res.headers.modified) {
                response.modified = new Date(res.headers.modified);
            }
            if (res.headers.expires) {
                response.expires = new Date(res.headers.expires);
            }
            if (res.headers.etag) {
                response.etag = res.headers.etag;
            }

            response.data = body;

            callback(null, response);
        } else {
            callback(new Error(JSON.parse(body).message));
        }
    });
};

/**
 * Render a map using Mapbox GL, based on layers specified in style.
 * Returns a Promise with the PNG image data as its first parameter for the map image.
 * If zoom and center are not provided, bounds must be provided
 * and will be used to calculate center and zoom based on image dimensions.
 *
 * @param {Object} style - Mapbox GL style object
 * @param {number} width - width of output map (default: 1024)
 * @param {number} height - height of output map (default: 1024)
 * @param {Object} - configuration object containing style, zoom, center: [lng, lat],
 * width, height, bounds: [west, south, east, north]
 * @param {String} tilePath - path to directory containing local mbtiles files that are
 * referenced from the style.json as "mbtiles://<tileset>"
 */
var render = function render(style) {
    var width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1024;
    var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1024;
    var options = arguments[3];
    return new Promise(function (resolve) {
        var _options$bounds = options.bounds,
            bounds = _options$bounds === undefined ? null : _options$bounds;
        var _options$center = options.center,
            center = _options$center === undefined ? null : _options$center,
            _options$zoom = options.zoom,
            zoom = _options$zoom === undefined ? null : _options$zoom,
            _options$tilePath = options.tilePath,
            tilePath = _options$tilePath === undefined ? null : _options$tilePath;


        if (!style) {
            throw new Error('style is a required parameter');
        }
        if (!(width && height)) {
            throw new Error('width and height are required parameters and must be non-zero');
        }

        if (center !== null) {
            if (center.length !== 2) {
                throw new Error('Center must be longitude,latitude.  Invalid value found: ' + [].concat(_toConsumableArray(center)));
            }

            if (Math.abs(center[0]) > 180) {
                throw new Error('Center longitude is outside world bounds (-180 to 180 deg): ' + center[0]);
            }

            if (Math.abs(center[1]) > 90) {
                throw new Error('Center latitude is outside world bounds (-90 to 90 deg): ' + center[1]);
            }
        }

        if (zoom !== null && (zoom < 0 || zoom > 22)) {
            throw new Error('Zoom level is outside supported range (0-22): ' + zoom);
        }

        if (bounds !== null) {
            if (bounds.length !== 4) {
                throw new Error('Bounds must be west,south,east,north.  Invalid value found: ' + [].concat(_toConsumableArray(bounds)));
            }
        }

        // calculate zoom and center from bounds and image dimensions
        if (bounds !== null && (zoom === null || center === null)) {
            var viewport = _geoViewport2.default.viewport(bounds, [width, height]);
            zoom = Math.max(viewport.zoom - 1, 0);
            /* eslint-disable prefer-destructuring */
            center = viewport.center;
        }

        // validate that all local mbtiles referenced in style are
        // present in tilePath and that tilePath is not null
        if (tilePath) {
            tilePath = _path2.default.normalize(tilePath);
        }

        var localMbtilesMatches = NAME_REGEXP.exec(JSON.stringify(style));
        if (localMbtilesMatches && !tilePath) {
            throw new Error('Style has local mbtiles file sources, but no tilePath is set');
        }

        localMbtilesMatches.forEach(function (name) {
            var mbtileFilename = _path2.default.normalize(_path2.default.format({ dir: tilePath, name: name, ext: '.mbtiles' }));
            if (!_fs2.default.existsSync(mbtileFilename)) {
                throw new Error('Mbtiles file ' + _path2.default.format({ name: name, ext: '.mbtiles' }) + ' in style file is not found in: ' + tilePath);
            }
        });

        // Options object for configuring loading of map data sources.
        // Note: could not find a way to make this work with mapbox vector sources and styles!
        var mapOptions = {
            request: function request(req, callback) {
                var url = req.url,
                    kind = req.kind;

                var isMBTiles = url.startsWith('mbtiles://');

                try {
                    switch (kind) {
                        case 2:
                            {
                                // source
                                if (isMBTiles) {
                                    getTileJSON(tilePath, url, callback);
                                }
                                // else is not currently handled
                                break;
                            }
                        case 3:
                            {
                                // tile
                                if (isMBTiles) {
                                    getTile(tilePath, url, callback);
                                } else {
                                    getRemoteTile(url, callback);
                                }
                                break;
                            }
                    }
                } catch (err) {
                    console.error(err);
                    callback(err);
                }
            }
        };

        var map = new _mapboxGlNative2.default.Map(mapOptions);
        map.load(style);

        map.render({
            zoom: zoom,
            center: center,
            height: height,
            width: width
        }, function (err, buffer) {
            if (err) throw err;

            // Convert raw image buffer to PNG
            return (0, _sharp2.default)(buffer, { raw: { width: width, height: height, channels: 4 } }).png().toBuffer().then(resolve);
        });
    });
};

exports.default = render;