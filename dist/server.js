#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.server = exports["default"] = void 0;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _fs = _interopRequireDefault(require("fs"));
var _restify = _interopRequireDefault(require("restify"));
var _nodeRestifyValidation = _interopRequireDefault(require("node-restify-validation"));
var _restifyErrors = _interopRequireDefault(require("restify-errors"));
var _commander = require("commander");
var _restifyPinoLogger = _interopRequireDefault(require("restify-pino-logger"));
var _package = _interopRequireDefault(require("../package.json"));
var _render = require("./render.js");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
var version = _package["default"].version;
var parseListToFloat = function parseListToFloat(text) {
  return text.split(',').map(Number);
};
var PARAMS = {
  style: {
    isRequired: true,
    isString: true
  },
  width: {
    isRequired: true,
    isInt: true
  },
  height: {
    isRequired: true,
    isInt: true
  },
  padding: {
    isRequired: false,
    isInt: true
  },
  zoom: {
    isRequired: false,
    isDecimal: true
  },
  ratio: {
    isRequired: false,
    isDecimal: true
  },
  bearing: {
    isRequired: false,
    isDecimal: true
  },
  pitch: {
    isRequired: false,
    isDecimal: true
  },
  token: {
    isRequired: false,
    isString: true
  },
  images: {
    isRequired: false,
    isObject: true
  }
};
var renderImage = function renderImage(params, response, next, tilePath, logger) {
  var width = params.width,
    height = params.height,
    _params$token = params.token,
    token = _params$token === void 0 ? null : _params$token,
    _params$padding = params.padding,
    padding = _params$padding === void 0 ? 0 : _params$padding,
    _params$bearing = params.bearing,
    bearing = _params$bearing === void 0 ? null : _params$bearing,
    _params$pitch = params.pitch,
    pitch = _params$pitch === void 0 ? null : _params$pitch;
  var style = params.style,
    _params$zoom = params.zoom,
    zoom = _params$zoom === void 0 ? null : _params$zoom,
    _params$center = params.center,
    center = _params$center === void 0 ? null : _params$center,
    _params$bounds = params.bounds,
    bounds = _params$bounds === void 0 ? null : _params$bounds,
    _params$ratio = params.ratio,
    ratio = _params$ratio === void 0 ? 1 : _params$ratio,
    _params$images = params.images,
    images = _params$images === void 0 ? null : _params$images;
  if (typeof style === 'string') {
    try {
      style = JSON.parse(style);
    } catch (jsonErr) {
      return next(new _restifyErrors["default"].BadRequestError({
        cause: jsonErr
      }, 'Error parsing JSON style'));
    }
  }
  if (center !== null) {
    if (typeof center === 'string') {
      center = parseListToFloat(center);
    }
    if (center.length !== 2) {
      return next(new _restifyErrors["default"].BadRequestError("Center must be longitude,latitude.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(center))));
    }
    if (!Number.isFinite(center[0]) || Math.abs(center[0]) > 180) {
      return next(new _restifyErrors["default"].BadRequestError("Center longitude is outside world bounds (-180 to 180 deg): ".concat(center[0])));
    }
    if (!Number.isFinite(center[1]) || Math.abs(center[1]) > 90) {
      return next(new _restifyErrors["default"].BadRequestError("Center latitude is outside world bounds (-90 to 90 deg): ".concat(center[1])));
    }
  }
  if (zoom !== null) {
    zoom = parseFloat(zoom);
    if (zoom < 0 || zoom > 22) {
      return next(new _restifyErrors["default"].BadRequestError("Zoom level is outside supported range (0-22): ".concat(zoom)));
    }
  }
  if (ratio !== null) {
    ratio = parseInt(ratio, 10);
    if (!ratio || ratio < 1) {
      return next(new _restifyErrors["default"].BadRequestError("Ratio is outside supported range (>=1): ".concat(ratio)));
    }
  }
  if (bounds !== null) {
    if (typeof bounds === 'string') {
      bounds = parseListToFloat(bounds);
    }
    if (bounds.length !== 4) {
      return next(new _restifyErrors["default"].BadRequestError("Bounds must be west,south,east,north.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(bounds))));
    }
    var _iterator = _createForOfIteratorHelper(bounds),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var b = _step.value;
        if (!Number.isFinite(b)) {
          return next(new _restifyErrors["default"].BadRequestError("Bounds must be west,south,east,north.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(bounds))));
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    var _bounds = bounds,
      _bounds2 = (0, _slicedToArray2["default"])(_bounds, 4),
      west = _bounds2[0],
      south = _bounds2[1],
      east = _bounds2[2],
      north = _bounds2[3];
    if (west === east) {
      return next(new _restifyErrors["default"].BadRequestError("Bounds west and east coordinate are the same value"));
    }
    if (south === north) {
      return next(new _restifyErrors["default"].BadRequestError("Bounds south and north coordinate are the same value"));
    }
    if (padding) {
      // padding must not be greater than width / 2 and height / 2
      if (Math.abs(padding) >= width / 2) {
        return next(new _restifyErrors["default"].BadRequestError('Padding must be less than width / 2'));
      }
      if (Math.abs(padding) >= height / 2) {
        return next(new _restifyErrors["default"].BadRequestError('Padding must be less than height / 2'));
      }
    }
  }
  if (bearing !== null) {
    if (bearing < 0 || bearing > 360) {
      return next(new _restifyErrors["default"].BadRequestError("Bearing is outside supported range (0-360): ".concat(bearing)));
    }
  }
  if (pitch !== null) {
    if (pitch < 0 || pitch > 60) {
      return next(new _restifyErrors["default"].BadRequestError("Pitch is outside supported range (0-60): ".concat(pitch)));
    }
  }
  if (!(center && zoom !== null || bounds)) {
    return next(new _restifyErrors["default"].BadRequestError('Either center and zoom OR bounds must be provided'));
  }
  if (images !== null) {
    if (typeof images === 'string') {
      images = JSON.parse(images);
    } else if ((0, _typeof2["default"])(images) !== 'object') {
      return next(new _restifyErrors["default"].BadRequestError('images must be an object or a string'));
    }

    // validate URLs
    for (var _i = 0, _Object$values = Object.values(images); _i < _Object$values.length; _i++) {
      var image = _Object$values[_i];
      if (!(image && image.url)) {
        return next(new _restifyErrors["default"].BadRequestError('Invalid image object; a url is required for each image'));
      }
      try {
        // use new URL to validate URL
        /* eslint-disable-next-line no-unused-vars */
        var url = new URL(image.url);
      } catch (e) {
        return next(new _restifyErrors["default"].BadRequestError("Invalid image URL: ".concat(image.url)));
      }
    }
  }
  try {
    (0, _render.render)(style, parseInt(width, 10), parseInt(height, 10), {
      zoom: zoom,
      center: center,
      bounds: bounds,
      padding: padding,
      tilePath: tilePath,
      ratio: ratio,
      bearing: bearing,
      pitch: pitch,
      token: token,
      images: images
    }).then(function (data, rejected) {
      if (rejected) {
        return next(new _restifyErrors["default"].InternalServerError({
          cause: rejected
        }, "Error processing render request: ".concat(rejected)));
      }
      return response.sendRaw(200, data, {
        'content-type': 'image/png'
      });
    })["catch"](function (err) {
      if (err instanceof _restifyErrors["default"].InternalServerError) {
        return next(err);
      }
      return next(new _restifyErrors["default"].InternalServerError("Error processing render request: ".concat(err)));
    });
  } catch (err) {
    if (err instanceof _restifyErrors["default"].InternalServerError) {
      return next(err);
    }
    return next(new _restifyErrors["default"].InternalServerError("Error processing render request: ".concat(err)));
  }
  return null;
};

// Provide the CLI
_commander.program.version(version).description('Start a server to render Mapbox GL map requests to images.').option('-p, --port <n>', 'Server port', parseInt).option('-t, --tiles <mbtiles_path>', 'Directory containing local mbtiles files to render', function (tilePath) {
  if (!_fs["default"].existsSync(tilePath)) {
    throw new _commander.InvalidOptionArgumentError("Path to mbtiles files does not exist: ".concat(tilePath));
  }
  return tilePath;
}).option('-v, --verbose', 'Enable request logging').parse(process.argv);
var _program$opts = _commander.program.opts(),
  _program$opts$port = _program$opts.port,
  port = _program$opts$port === void 0 ? 8000 : _program$opts$port,
  _program$opts$tiles = _program$opts.tiles,
  tilePath = _program$opts$tiles === void 0 ? null : _program$opts$tiles,
  _program$opts$verbose = _program$opts.verbose,
  verbose = _program$opts$verbose === void 0 ? false : _program$opts$verbose;
var server = exports.server = _restify["default"].createServer({
  name: 'mbgl-renderer',
  version: '1.0.0',
  ignoreTrailingSlash: true
});
server.use(_restify["default"].plugins.queryParser());
server.use(_restify["default"].plugins.bodyParser());
server.use(_nodeRestifyValidation["default"].validationPlugin({
  errorsAsArray: false,
  forbidUndefinedVariables: false,
  errorHandler: _restifyErrors["default"].BadRequestError
}));
server.use((0, _restifyPinoLogger["default"])({
  enabled: verbose,
  autoLogging: {
    ignorePaths: ['/health']
  },
  redact: {
    paths: ['pid', 'hostname', 'res.headers.server', 'req.id', 'req.connection', 'req.remoteAddress', 'req.remotePort'],
    remove: true
  }
}));

/**
 * /render (GET): renders an image based on request query parameters.
 */
server.get({
  url: '/render',
  validation: {
    queries: PARAMS
  }
}, function (req, res, next) {
  return renderImage(req.query, res, next, tilePath, req.log);
});

/**
 * /render (POST): renders an image based on request body.
 */
server.post({
  url: '/render',
  validation: {
    content: PARAMS
  }
}, function (req, res, next) {
  return renderImage(req.body, res, next, tilePath, req.log);
});

/**
 * List all available endpoints.
 */
server.get({
  url: '/'
}, function (req, res, next) {
  var routes = {};
  Object.values(server.router.getRoutes()).forEach(function (_ref) {
    var _ref$spec = _ref.spec,
      url = _ref$spec.url,
      method = _ref$spec.method;
    if (!routes[url]) {
      routes[url] = [];
    }
    routes[url].push(method);
  });
  res.send({
    routes: routes,
    version: version
  });
  return next();
});

/**
 * /health: returns 200 to confirm that server is up
 */
server.get({
  url: '/health'
}, function (req, res, next) {
  res.send(200);
  next();
});
var tilePathMessage = '';
if (tilePath !== null) {
  tilePathMessage = "\n using local mbtiles in: ".concat(tilePath);
}
server.listen(port, function () {
  console.log('\n-----------------------------------------------------------------\n', "mbgl-renderer server started and listening at ".concat(server.url), tilePathMessage, '\n-----------------------------------------------------------------\n');
});
var _default = exports["default"] = {
  server: server
};