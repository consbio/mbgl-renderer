'use strict';

var _restify = require('restify');

var _restify2 = _interopRequireDefault(_restify);

var _nodeRestifyValidation = require('node-restify-validation');

var _nodeRestifyValidation2 = _interopRequireDefault(_nodeRestifyValidation);

var _restifyErrors = require('restify-errors');

var _restifyErrors2 = _interopRequireDefault(_restifyErrors);

var _render = require('./render');

var _render2 = _interopRequireDefault(_render);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var parseListToFloat = function parseListToFloat(text) {
    return text.split(',').map(Number);
};

var port = 8000;
var tilePath = null;

var PARAMS = {
    style: { isRequired: true, isString: true }, // stringified JSON.  TODO: add further validation of structure
    width: { isRequired: true, isInt: true },
    height: { isRequired: true, isInt: true },
    zoom: { isRequired: false, isInt: true
        // center: {
        //     // longitude, latitude
        //     isRequired: false,
        //     isArray: {
        //         minLength: 2,
        //         maxLength: 2,
        //         element: { isDecimal: true }
        //     }
        // },

        // bounds: {
        //     // west, south, east, north
        //     isRequired: false,
        //     isArray: {
        //         minLength: 4,
        //         maxLength: 4,
        //         element: { isDecimal: true }
        //     }
        // }
    } };

var server = _restify2.default.createServer();
server.use(_restify2.default.plugins.queryParser());
server.use(_restify2.default.plugins.bodyParser());
server.use(_nodeRestifyValidation2.default.validationPlugin({
    errorsAsArray: false,
    forbidUndefinedVariables: false,
    errorHandler: _restifyErrors2.default.InvalidArgumentError
}));

server.get({
    url: '/render',
    validation: {
        queries: PARAMS
    }
}, function (req, res, next) {
    var _req$query = req.query,
        width = _req$query.width,
        height = _req$query.height;
    var _req$query2 = req.query,
        style = _req$query2.style,
        _req$query2$zoom = _req$query2.zoom,
        zoom = _req$query2$zoom === undefined ? null : _req$query2$zoom,
        _req$query2$center = _req$query2.center,
        center = _req$query2$center === undefined ? null : _req$query2$center,
        _req$query2$bounds = _req$query2.bounds,
        bounds = _req$query2$bounds === undefined ? null : _req$query2$bounds;


    console.log('query params', req.query);

    try {
        style = JSON.parse(style);
    } catch (jsonErr) {
        console.error('Error parsing JSON style in request: %j', jsonErr);
        return next(new _restifyErrors2.default.BadRequestError({ cause: jsonErr }, 'Error parsing JSON style'));
    }

    // TODO: parse center, zoom, bounds from strings to appropriate types
    if (center !== null) {
        center = parseListToFloat(center);
        if (center.length !== 2) {
            return next(new _restifyErrors2.default.BadRequestError('Center must be longitude,latitude.  Invalid value found: ' + [].concat(_toConsumableArray(center))));
        }

        if (Number.isNaN(center[0]) || Math.abs(center[0]) > 180) {
            return next(new _restifyErrors2.default.BadRequestError('Center longitude is outside world bounds (-180 to 180 deg): ' + center[0]));
        }

        if (Number.isNaN(center[1]) || Math.abs(center[1]) > 90) {
            return next(new _restifyErrors2.default.BadRequestError('Center latitude is outside world bounds (-90 to 90 deg): ' + center[1]));
        }
    }
    if (zoom !== null) {
        zoom = parseInt(zoom, 10);
        if (zoom < 0 || zoom > 22) {
            return next(new _restifyErrors2.default.BadRequestError('Zoom level is outside supported range (0-22): ' + zoom));
        }
    }
    if (bounds !== null) {
        bounds = parseListToFloat(bounds);
        if (bounds.length !== 4) {
            return next(new _restifyErrors2.default.BadRequestError('Bounds must be west,south,east,north.  Invalid value found: ' + [].concat(_toConsumableArray(bounds))));
        }
        bounds.forEach(function (b) {
            if (Number.isNaN(b)) {
                return next(new _restifyErrors2.default.BadRequestError('Bounds must be west,south,east,north.  Invalid value found: ' + [].concat(_toConsumableArray(bounds))));
            }
            return null;
        });
    }

    if (!(center && zoom !== null) || bounds) {
        return next(new _restifyErrors2.default.BadRequestError('Either center and zoom OR bounds must be provided'));
    }

    try {
        (0, _render2.default)(style, parseInt(width, 10), parseInt(height, 10), {
            zoom: zoom,
            center: center,
            bounds: bounds,
            tilePath: tilePath
        }).then(function (data, rejected) {
            if (rejected) {
                console.error('render request rejected', rejected);
                return next(new _restifyErrors2.default.InternalServerError({ cause: rejected }, 'Error processing render request'));
            }
            return res.sendRaw(200, data, { 'content-type': 'image/png' });
        }).catch(function (err) {
            console.error('Error processing render request', err);
            return next(new _restifyErrors2.default.InternalServerError({ cause: err }, 'Error processing render request'));
        });
    } catch (err) {
        console.error('Error processing render request', err);
        return next(new _restifyErrors2.default.InternalServerError({ cause: err }, 'Error processing render request'));
    }

    return null;
});

server.post({
    url: '/render',
    validation: {
        content: PARAMS
    }
}, function (req, res, next) {
    var _req$body = req.body,
        styleJSON = _req$body.style,
        width = _req$body.width,
        height = _req$body.height,
        _req$body$zoom = _req$body.zoom,
        zoom = _req$body$zoom === undefined ? null : _req$body$zoom,
        _req$body$center = _req$body.center,
        center = _req$body$center === undefined ? null : _req$body$center,
        _req$body$bounds = _req$body.bounds,
        bounds = _req$body$bounds === undefined ? null : _req$body$bounds;


    var style = null;
    try {
        style = JSON.parse(styleJSON);
    } catch (jsonErr) {
        console.error('Error parsing JSON style in request: %j', jsonErr);
        return next(new _restifyErrors2.default.BadRequestError({ cause: jsonErr }, 'Error parsing JSON style'));
    }

    try {
        (0, _render2.default)(style, width, height, {
            zoom: zoom,
            center: center,
            bounds: bounds,
            tilePath: tilePath
        }).then(function (data, rejected) {
            if (rejected) {
                console.error('render request rejected', rejected);
                return next(new _restifyErrors2.default.InternalServerError({ cause: rejected }, 'Error processing render request'));
            }
            return res.sendRaw(200, data, { 'content-type': 'image/png' });
        }).catch(function (err) {
            console.error('Error processing render request', err);
            return next(new _restifyErrors2.default.InternalServerError({ cause: err }, 'Error processing render request'));
        });
    } catch (err) {
        console.error('Error processing render request', err);
        return next(new _restifyErrors2.default.InternalServerError({ cause: err }, 'Error processing render request'));
    }

    return null;
});

// server.post('/render', (req, res, next) => {
//     const required = ['style', 'zoom', 'width', 'height', 'center']
//     const missing = required.filter(item => !req.body.hasOwnProperty(item))
//     if (missing.length) {
//         return next(new errs.BadRequestError('Missing parameters: ' + missing.join(', ')))
//     }

//     const { style, zoom, width, height, center, bounds } = req.body

//     render(style, imgWidth, imgHeight, {
//         zoom,
//         center,
//         bounds,
//         tilePath
//     })
//         .then((data) => {
//             fs.writeFileSync(imgFilename, data)
//             console.log('Done!')
//             console.log('\n')
//         })
//         .catch((err) => {
//             console.error(err)
//         })

// if (bounds !== null && (zoom === null || center === null)) {
//     let viewport = geoViewport.viewport(bounds, [width, height])
//     zoom = Math.max(viewport.zoom - 1, 0)
//     center = viewport.center
// }

// let map = new mbgl.Map(options)
// map.load(style)
// map.render({zoom, width, height, center}, (err, buffer) => {
//     if (err) {
//         return next(new errs.InternalServerError())
//     }

//     // Convert raw pixel values to png
//     sharp(buffer, {raw: {width, height, channels: 4}}).png().toBuffer().then(data => {
//         res.sendRaw(200, data, {'content-type': 'image/png'})
//     })
// })
// })

server.listen(port, function () {
    console.log('Mapbox GL static rendering server started and listening at %s', server.url);
});