"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.render = exports.normalizeMapboxStyleURL = exports.normalizeMapboxSpriteURL = exports.normalizeMapboxGlyphURL = exports.isMapboxURL = exports.isMapboxStyleURL = exports["default"] = void 0;

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _sharp = _interopRequireDefault(require("sharp"));

var _zlib = _interopRequireDefault(require("zlib"));

var _geoViewport = _interopRequireDefault(require("@mapbox/geo-viewport"));

var _mapboxGlNative = _interopRequireDefault(require("@mapbox/mapbox-gl-native"));

var _mbtiles = _interopRequireDefault(require("@mapbox/mbtiles"));

var _request = _interopRequireDefault(require("request"));

var _url = _interopRequireDefault(require("url"));

/* eslint-disable no-new */
// sharp must be before zlib and other imports or sharp gets wrong version of zlib and breaks on some servers
var TILE_REGEXP = RegExp('mbtiles://([^/]+)/(\\d+)/(\\d+)/(\\d+)');
var MBTILES_REGEXP = /mbtiles:\/\/(\S+?)(?=[/"]+)/gi;

var isMapboxURL = function isMapboxURL(url) {
  return url.startsWith('mapbox://');
};

exports.isMapboxURL = isMapboxURL;

var isMapboxStyleURL = function isMapboxStyleURL(url) {
  return url.startsWith('mapbox://styles/');
};

exports.isMapboxStyleURL = isMapboxStyleURL;

var isMBTilesURL = function isMBTilesURL(url) {
  return url.startsWith('mbtiles://');
}; // normalize functions derived from: https://github.com/mapbox/mapbox-gl-js/blob/master/src/util/mapbox.js

/**
 * Normalize a Mapbox source URL to a full URL
 * @param {string} url - url to mapbox source in style json, e.g. "url": "mapbox://mapbox.mapbox-streets-v7"
 * @param {string} token - mapbox public token
 */


var normalizeMapboxSourceURL = function normalizeMapboxSourceURL(url, token) {
  var urlObject = _url["default"].parse(url);

  urlObject.query = urlObject.query || {};
  urlObject.pathname = "/v4/".concat(url.split('mapbox://')[1], ".json");
  urlObject.protocol = 'https';
  urlObject.host = 'api.mapbox.com';
  urlObject.query.secure = true;
  urlObject.query.access_token = token;
  return _url["default"].format(urlObject);
};
/**
 * Normalize a Mapbox tile URL to a full URL
 * @param {string} url - url to mapbox tile in style json or resolved from source
 * e.g. mapbox://tiles/mapbox.mapbox-streets-v7/1/0/1.vector.pbf
 * @param {string} token - mapbox public token
 */


var normalizeMapboxTileURL = function normalizeMapboxTileURL(url, token) {
  var urlObject = _url["default"].parse(url);

  urlObject.query = urlObject.query || {};
  urlObject.pathname = "/v4".concat(urlObject.path);
  urlObject.protocol = 'https';
  urlObject.host = 'a.tiles.mapbox.com';
  urlObject.query.access_token = token;
  return _url["default"].format(urlObject);
};
/**
 * Normalize a Mapbox style URL to a full URL
 * @param {string} url - url to mapbox source in style json, e.g. "url": "mapbox://styles/mapbox/streets-v9"
 * @param {string} token - mapbox public token
 */


var normalizeMapboxStyleURL = function normalizeMapboxStyleURL(url, token) {
  var urlObject = _url["default"].parse(url);

  urlObject.query = {
    access_token: token,
    secure: true
  };
  urlObject.pathname = "styles/v1".concat(urlObject.path);
  urlObject.protocol = 'https';
  urlObject.host = 'api.mapbox.com';
  return _url["default"].format(urlObject);
};
/**
 * Normalize a Mapbox sprite URL to a full URL
 * @param {string} url - url to mapbox sprite, e.g. "url": "mapbox://sprites/mapbox/streets-v9.png"
 * @param {string} token - mapbox public token
 *
 * Returns {string} - url, e.g., "https://api.mapbox.com/styles/v1/mapbox/streets-v9/sprite.png?access_token=<token>"
 */


exports.normalizeMapboxStyleURL = normalizeMapboxStyleURL;

var normalizeMapboxSpriteURL = function normalizeMapboxSpriteURL(url, token) {
  var extMatch = /(\.png|\.json)$/g.exec(url);
  var ratioMatch = /(@\d+x)\./g.exec(url);
  var trimIndex = Math.min(ratioMatch != null ? ratioMatch.index : Infinity, extMatch.index);

  var urlObject = _url["default"].parse(url.substring(0, trimIndex));

  var extPart = extMatch[1];
  var ratioPart = ratioMatch != null ? ratioMatch[1] : '';
  urlObject.query = urlObject.query || {};
  urlObject.query.access_token = token;
  urlObject.pathname = "/styles/v1".concat(urlObject.path, "/sprite").concat(ratioPart).concat(extPart);
  urlObject.protocol = 'https';
  urlObject.host = 'api.mapbox.com';
  return _url["default"].format(urlObject);
};
/**
 * Normalize a Mapbox glyph URL to a full URL
 * @param {string} url - url to mapbox sprite, e.g. "url": "mapbox://sprites/mapbox/streets-v9.png"
 * @param {string} token - mapbox public token
 *
 * Returns {string} - url, e.g., "https://api.mapbox.com/styles/v1/mapbox/streets-v9/sprite.png?access_token=<token>"
 */


exports.normalizeMapboxSpriteURL = normalizeMapboxSpriteURL;

var normalizeMapboxGlyphURL = function normalizeMapboxGlyphURL(url, token) {
  var urlObject = _url["default"].parse(url);

  urlObject.query = urlObject.query || {};
  urlObject.query.access_token = token;
  urlObject.pathname = "/fonts/v1".concat(urlObject.path);
  urlObject.protocol = 'https';
  urlObject.host = 'api.mapbox.com';
  return _url["default"].format(urlObject);
};
/**
 * Very simplistic function that splits out mbtiles service name from the URL
 *
 * @param {String} url - URL to resolve
 */


exports.normalizeMapboxGlyphURL = normalizeMapboxGlyphURL;

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
  return _path["default"].format({
    dir: tilePath,
    name: resolveNamefromURL(url),
    ext: '.mbtiles'
  });
};
/**
 * Given a URL to a local mbtiles file, get the TileJSON for that to load correct tiles.
 *
 * @param {String} tilePath - path containing mbtiles files.
 * @param {String} url - url of a data source in style.json file.
 * @param {function} callback - function to call with (err, {data}).
 */


var getLocalTileJSON = function getLocalTileJSON(tilePath, url, callback) {
  var mbtilesFilename = resolveMBTilesURL(tilePath, url);
  var service = resolveNamefromURL(url);
  new _mbtiles["default"](mbtilesFilename, function (err, mbtiles) {
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
        tiles: ["mbtiles://".concat(service, "/{z}/{x}/{y}").concat(ext)],
        minzoom: minzoom,
        maxzoom: maxzoom,
        center: center,
        bounds: bounds
      };
      callback(null, {
        data: Buffer.from(JSON.stringify(tileJSON))
      });
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
 * @param {function} callback - function to call with (err, {data}).
 */


var getLocalTile = function getLocalTile(tilePath, url, callback) {
  var matches = url.match(TILE_REGEXP);

  var _matches$slice = matches.slice(matches.length - 3, matches.length),
      _matches$slice2 = (0, _slicedToArray2["default"])(_matches$slice, 3),
      z = _matches$slice2[0],
      x = _matches$slice2[1],
      y = _matches$slice2[2];

  var isVector = _path["default"].extname(url) === '.pbf';
  var mbtilesFile = resolveMBTilesURL(tilePath, url);
  new _mbtiles["default"](mbtilesFile, function (err, mbtiles) {
    if (err) {
      callback(err);
      return null;
    }

    mbtiles.getTile(z, x, y, function (tileErr, data) {
      if (tileErr) {
        // console.error(`error fetching tile: z:${z} x:${x} y:${y} from ${mbtilesFile}\n${tileErr}`)
        callback(null, {});
        return null;
      }

      if (isVector) {
        // if the tile is compressed, unzip it (for vector tiles only!)
        _zlib["default"].unzip(data, function (unzipErr, unzippedData) {
          callback(unzipErr, {
            data: unzippedData
          });
        });
      } else {
        callback(null, {
          data: data
        });
      }

      return null;
    });
    return null;
  });
};
/**
 * Fetch a remotely hosted tile.
 * Empty or missing tiles return null data to the callback function, which
 * result in those tiles not rendering but no errors being raised.
 *
 * @param {String} url - URL of the tile
 * @param {function} callback - callback to call with (err, {data})
 */


var getRemoteTile = function getRemoteTile(url, callback) {
  (0, _request["default"])({
    url: url,
    encoding: null,
    gzip: true
  }, function (err, res, data) {
    if (err) {
      return callback(err);
    }

    switch (res.statusCode) {
      case 200:
        {
          return callback(null, {
            data: data
          });
        }

      case 204:
        {
          // No data for this url
          return callback(null, {});
        }

      case 404:
        {
          // Tile not found
          // this may be valid for some tilesets that have partial coverage
          // on servers that do not return blank tiles in these areas.
          console.warn("Missing tile at: ".concat(url));
          return callback(null, {});
        }

      default:
        {
          // assume error
          console.error("Error with request for: ".concat(url, "\nstatus: ").concat(res.statusCode));
          return callback(new Error("Error with request for: ".concat(url, "\nstatus: ").concat(res.statusCode)));
        }
    }
  });
};
/**
 * Fetch a remotely hosted asset: glyph, sprite, etc
 * Anything other than a HTTP 200 response results in an exception.
 *
 *
 * @param {String} url - URL of the asset
 * @param {function} callback - callback to call with (err, {data})
 */


var getRemoteAsset = function getRemoteAsset(url, callback) {
  (0, _request["default"])({
    url: url,
    encoding: null,
    gzip: true
  }, function (err, res, data) {
    if (err) {
      return callback(err);
    }

    switch (res.statusCode) {
      case 200:
        {
          return callback(null, {
            data: data
          });
        }

      default:
        {
          // assume error
          console.error("Error with request for: ".concat(url, "\nstatus: ").concat(res.statusCode));
          return callback(new Error("Error with request for: ".concat(url, "\nstatus: ").concat(res.statusCode)));
        }
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
 * width, height, bounds: [west, south, east, north], ratio, padding
 * @param {String} tilePath - path to directory containing local mbtiles files that are
 * referenced from the style.json as "mbtiles://<tileset>"
 */


var render = function render(style) {
  var width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1024;
  var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1024;
  var options = arguments.length > 3 ? arguments[3] : undefined;
  return new Promise(function (resolve, reject) {
    var _options$bounds = options.bounds,
        bounds = _options$bounds === void 0 ? null : _options$bounds,
        _options$bearing = options.bearing,
        bearing = _options$bearing === void 0 ? 0 : _options$bearing,
        _options$pitch = options.pitch,
        pitch = _options$pitch === void 0 ? 0 : _options$pitch,
        _options$token = options.token,
        token = _options$token === void 0 ? null : _options$token,
        _options$ratio = options.ratio,
        ratio = _options$ratio === void 0 ? 1 : _options$ratio,
        _options$padding = options.padding,
        padding = _options$padding === void 0 ? 0 : _options$padding;
    var _options$center = options.center,
        center = _options$center === void 0 ? null : _options$center,
        _options$zoom = options.zoom,
        zoom = _options$zoom === void 0 ? null : _options$zoom,
        _options$tilePath = options.tilePath,
        tilePath = _options$tilePath === void 0 ? null : _options$tilePath;

    if (!style) {
      throw new Error('style is a required parameter');
    }

    if (!(width && height)) {
      throw new Error('width and height are required parameters and must be non-zero');
    }

    if (center !== null) {
      if (center.length !== 2) {
        throw new Error("Center must be longitude,latitude.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(center)));
      }

      if (Math.abs(center[0]) > 180) {
        throw new Error("Center longitude is outside world bounds (-180 to 180 deg): ".concat(center[0]));
      }

      if (Math.abs(center[1]) > 90) {
        throw new Error("Center latitude is outside world bounds (-90 to 90 deg): ".concat(center[1]));
      }
    }

    if (zoom !== null && (zoom < 0 || zoom > 22)) {
      throw new Error("Zoom level is outside supported range (0-22): ".concat(zoom));
    }

    if (bearing !== null && (bearing < 0 || bearing > 360)) {
      throw new Error("bearing is outside supported range (0-360): ".concat(bearing));
    }

    if (pitch !== null && (pitch < 0 || pitch > 60)) {
      throw new Error("pitch is outside supported range (0-60): ".concat(pitch));
    }

    if (bounds !== null) {
      if (bounds.length !== 4) {
        throw new Error("Bounds must be west,south,east,north.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(bounds)));
      }

      if (padding) {
        // padding must not be greater than width / 2 and height / 2
        if (Math.abs(padding) >= width / 2) {
          throw new Error('Padding must be less than width / 2');
        }

        if (Math.abs(padding) >= height / 2) {
          throw new Error('Padding must be less than height / 2');
        }
      }
    } // calculate zoom and center from bounds and image dimensions


    if (bounds !== null && (zoom === null || center === null)) {
      var viewport = _geoViewport["default"].viewport(bounds, // add padding to width and height to effectively
      // zoom out the target zoom level.
      [width - 2 * padding, height - 2 * padding], undefined, undefined, undefined, true);

      zoom = Math.max(viewport.zoom - 1, 0);
      /* eslint-disable prefer-destructuring */

      center = viewport.center;
    } // validate that all local mbtiles referenced in style are
    // present in tilePath and that tilePath is not null


    if (tilePath) {
      tilePath = _path["default"].normalize(tilePath);
    }

    var localMbtilesMatches = JSON.stringify(style).match(MBTILES_REGEXP);

    if (localMbtilesMatches && !tilePath) {
      throw new Error('Style has local mbtiles file sources, but no tilePath is set');
    }

    if (localMbtilesMatches) {
      localMbtilesMatches.forEach(function (name) {
        var mbtileFilename = _path["default"].normalize(_path["default"].format({
          dir: tilePath,
          name: name.split('://')[1],
          ext: '.mbtiles'
        }));

        if (!_fs["default"].existsSync(mbtileFilename)) {
          throw new Error("Mbtiles file ".concat(_path["default"].format({
            name: name,
            ext: '.mbtiles'
          }), " in style file is not found in: ").concat(_path["default"].resolve(tilePath)));
        }
      });
    } // Options object for configuring loading of map data sources.
    // Note: could not find a way to make this work with mapbox vector sources and styles!


    var mapOptions = {
      request: function request(req, callback) {
        var url = req.url,
            kind = req.kind;
        var isMapbox = isMapboxURL(url);

        if (isMapbox && !token) {
          throw new Error('ERROR: mapbox access token is required');
        }

        try {
          switch (kind) {
            case 2:
              {
                // source
                if (isMBTilesURL(url)) {
                  getLocalTileJSON(tilePath, url, callback);
                } else if (isMapbox) {
                  getRemoteAsset(normalizeMapboxSourceURL(url, token), callback);
                } else {
                  getRemoteAsset(url, callback);
                }

                break;
              }

            case 3:
              {
                // tile
                if (isMBTilesURL(url)) {
                  getLocalTile(tilePath, url, callback);
                } else if (isMapbox) {
                  // This seems to be due to a bug in how the mapbox tile
                  // JSON is handled within mapbox-gl-native
                  // since it returns fully resolved tiles!
                  getRemoteTile(normalizeMapboxTileURL(url, token), callback);
                } else {
                  getRemoteTile(url, callback);
                }

                break;
              }

            case 4:
              {
                // glyph
                getRemoteAsset(isMapbox ? normalizeMapboxGlyphURL(url, token) : _url["default"].parse(url), callback);
                break;
              }

            case 5:
              {
                // sprite image
                getRemoteAsset(isMapbox ? normalizeMapboxSpriteURL(url, token) : _url["default"].parse(url), callback);
                break;
              }

            case 6:
              {
                // sprite json
                getRemoteAsset(isMapbox ? normalizeMapboxSpriteURL(url, token) : _url["default"].parse(url), callback);
                break;
              }

            case 7:
              {
                // image source
                getRemoteAsset(_url["default"].parse(url), callback);
                break;
              }

            default:
              {
                // NOT HANDLED!
                throw new Error("ERROR: Request kind not handled: ".concat(kind));
              }
          }
        } catch (err) {
          console.error('Error while making tile request: %j', err);
          callback(err);
        }
      },
      ratio: ratio
    };
    var map = new _mapboxGlNative["default"].Map(mapOptions);
    map.load(style);
    map.render({
      zoom: zoom,
      center: center,
      height: height,
      width: width,
      bearing: bearing,
      pitch: pitch
    }, function (err, buffer) {
      if (err) {
        console.error('Error rendering map');
        console.error(err);
        return reject(err);
      }

      map.release(); // release map resources to prevent reusing in future render requests
      // Un-premultiply pixel values
      // Mapbox GL buffer contains premultiplied values, which are not handled correctly by sharp
      // https://github.com/mapbox/mapbox-gl-native/issues/9124
      // since we are dealing with 8-bit RGBA values, normalize alpha onto 0-255 scale and divide
      // it out of RGB values

      for (var i = 0; i < buffer.length; i += 4) {
        var alpha = buffer[i + 3];
        var norm = alpha / 255;

        if (alpha === 0) {
          buffer[i] = 0;
          buffer[i + 1] = 0;
          buffer[i + 2] = 0;
        } else {
          buffer[i] = buffer[i] / norm;
          buffer[i + 1] = buffer[i + 1] / norm;
          buffer[i + 2] = buffer[i + 2] / norm;
        }
      } // Convert raw image buffer to PNG


      try {
        return (0, _sharp["default"])(buffer, {
          raw: {
            width: width * ratio,
            height: height * ratio,
            channels: 4
          }
        }).png().toBuffer().then(resolve)["catch"](reject);
      } catch (pngErr) {
        console.error('Error encoding PNG');
        console.error(pngErr);
        return reject(pngErr);
      }
    });
  });
};

exports.render = render;
var _default = render;
exports["default"] = _default;