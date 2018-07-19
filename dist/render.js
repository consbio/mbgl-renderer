'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _geoViewport = require('@mapbox/geo-viewport');

var _geoViewport2 = _interopRequireDefault(_geoViewport);

var _mapboxGlNative = require('@mapbox/mapbox-gl-native');

var _mapboxGlNative2 = _interopRequireDefault(_mapboxGlNative);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _sharp = require('sharp');

var _sharp2 = _interopRequireDefault(_sharp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Options object for configuring loading of map data sources.
 * Note: could not find a way to make this work with mapbox vector sources and styles!
 */
var mapOptions = {
    request: function request(req, callback) {
        var url = req.url;
        // console.log('tile:', url)

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
    }

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
     */
};var render = function render(style) {
    var width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1024;
    var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1024;
    var options = arguments[3];
    return new Promise(function (resolve) {
        var _options$bounds = options.bounds,
            bounds = _options$bounds === undefined ? null : _options$bounds;
        var center = options.center,
            zoom = options.zoom;


        if (!style) {
            throw new Error('style is a required parameter');
        }
        if (!(width && height)) {
            throw new Error('width and height are required parameters');
        }

        // TODO: validate center, zoom, bounds

        // calculate zoom and center from bounds and image dimensions
        if (bounds !== null && (zoom === null || center === null)) {
            var viewport = _geoViewport2.default.viewport(bounds, [width, height]);
            zoom = Math.max(viewport.zoom - 1, 0);
            /* eslint-disable prefer-destructuring */
            center = viewport.center;
        }

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