#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.server = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _restify = _interopRequireDefault(require("restify"));

var _nodeRestifyValidation = _interopRequireDefault(require("node-restify-validation"));

var _restifyErrors = _interopRequireDefault(require("restify-errors"));

var _commander = _interopRequireDefault(require("commander"));

var _bbox = _interopRequireDefault(require("@turf/bbox"));

var _togeojson = _interopRequireDefault(require("@mapbox/togeojson"));

var _xmldom = require("xmldom");

var _package = require("../package.json");

var _render = require("./render");

var parseListToFloat = function parseListToFloat(text) {
  return text.split(',').map(Number);
};

var raiseError = function raiseError(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
};

var filenameToGeoJsonSource = {};
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
  overlayFiles: {
    isRequired: false,
    isString: true
  },
  fit: {
    isRequired: false,
    isBoolean: true
  }
};

var renderImage = function renderImage(params, response, next, tilePath, overlayPath) {
  var width = params.width,
      height = params.height,
      _params$token = params.token,
      token = _params$token === void 0 ? null : _params$token,
      _params$bearing = params.bearing,
      bearing = _params$bearing === void 0 ? null : _params$bearing,
      _params$pitch = params.pitch,
      pitch = _params$pitch === void 0 ? null : _params$pitch,
      _params$overlayFiles = params.overlayFiles,
      overlayFiles = _params$overlayFiles === void 0 ? null : _params$overlayFiles,
      _params$fit = params.fit,
      fit = _params$fit === void 0 ? false : _params$fit;
  var style = params.style,
      _params$zoom = params.zoom,
      zoom = _params$zoom === void 0 ? null : _params$zoom,
      _params$center = params.center,
      center = _params$center === void 0 ? null : _params$center,
      _params$bounds = params.bounds,
      bounds = _params$bounds === void 0 ? null : _params$bounds,
      _params$ratio = params.ratio,
      ratio = _params$ratio === void 0 ? 1 : _params$ratio;

  if (typeof style === 'string') {
    try {
      style = JSON.parse(style);
    } catch (jsonErr) {
      console.error('Error parsing JSON style in request: %j', jsonErr);
      return next(new _restifyErrors["default"].BadRequestError({
        cause: jsonErr
      }, 'Error parsing JSON style'));
    }
  }

  if (typeof overlayFiles === 'string') {
    var geojsonList = [];

    if (overlayFiles == "*") {
      for (var _i = 0, _Object$values = Object.values(filenameToGeoJsonSource); _i < _Object$values.length; _i++) {
        var value = _Object$values[_i];
        geojsonList = geojsonList.concat(value);
      }
    } else {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = overlayFiles.split(",")[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var overlayFile = _step.value;

          if (overlayFile in filenameToGeoJsonSource) {
            geojsonList = geojsonList.concat(filenameToGeoJsonSource[overlayFile]);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }

    var featureList = {
      "type": "FeatureCollection",
      "features": geojsonList
    };
    style.sources["geojson-line"] = {
      "type": "geojson",
      "data": featureList
    };
    var bboxed = (0, _bbox["default"])(featureList);

    if (fit) {
      bounds = bboxed;
    }
  }

  if (center !== null) {
    if (typeof center === 'string') {
      center = parseListToFloat(center);
    }

    if (center.length !== 2) {
      return next(new _restifyErrors["default"].BadRequestError("Center must be longitude,latitude.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(center))));
    }

    if (Number.isNaN(center[0]) || Math.abs(center[0]) > 180) {
      return next(new _restifyErrors["default"].BadRequestError("Center longitude is outside world bounds (-180 to 180 deg): ".concat(center[0])));
    }

    if (Number.isNaN(center[1]) || Math.abs(center[1]) > 90) {
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

    bounds.forEach(function (b) {
      if (Number.isNaN(b)) {
        return next(new _restifyErrors["default"].BadRequestError("Bounds must be west,south,east,north.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(bounds))));
      }

      return null;
    });

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

  try {
    (0, _render.render)(style, parseInt(width, 10), parseInt(height, 10), {
      zoom: zoom,
      center: center,
      bounds: bounds,
      tilePath: tilePath,
      ratio: ratio,
      bearing: bearing,
      pitch: pitch,
      token: token,
      fit: fit
    }).then(function (data, rejected) {
      if (rejected) {
        console.error('render request rejected', rejected);
        return next(new _restifyErrors["default"].InternalServerError({
          cause: rejected
        }, 'Error processing render request'));
      }

      return response.sendRaw(200, data, {
        'content-type': 'image/png'
      });
    })["catch"](function (err) {
      console.error('Error processing render request', err);
      return next(new _restifyErrors["default"].InternalServerError({
        cause: err
      }, 'Error processing render request'));
    });
  } catch (err) {
    console.error('Error processing render request', err);
    return next(new _restifyErrors["default"].InternalServerError({
      cause: err
    }, 'Error processing render request'));
  }

  return null;
}; // Provide the CLI


_commander["default"].version(_package.version).description('Start a server to render Mapbox GL map requests to images.').option('-p, --port <n>', 'Server port', parseInt).option('-t, --tiles <mbtiles_path>', 'Directory containing local mbtiles files to render').option('-o, --overlay <overlay_files_path>', 'Directory containing GPX/geojson files to render in overlay').parse(process.argv);

var _cli$port = _commander["default"].port,
    port = _cli$port === void 0 ? 8000 : _cli$port,
    _cli$tiles = _commander["default"].tiles,
    tilePath = _cli$tiles === void 0 ? null : _cli$tiles,
    _cli$overlay = _commander["default"].overlay,
    overlayPath = _cli$overlay === void 0 ? null : _cli$overlay;

var server = _restify["default"].createServer({
  ignoreTrailingSlash: true
});

exports.server = server;
server.use(_restify["default"].plugins.queryParser());
server.use(_restify["default"].plugins.bodyParser());
server.use(_nodeRestifyValidation["default"].validationPlugin({
  errorsAsArray: false,
  forbidUndefinedVariables: false,
  errorHandler: _restifyErrors["default"].BadRequestError
}));
server.get({
  url: '/render',
  validation: {
    queries: PARAMS
  }
}, function (req, res, next) {
  return renderImage(req.query, res, next, tilePath, overlayPath);
});
server.post({
  url: '/render',
  validation: {
    content: PARAMS
  }
}, function (req, res, next) {
  return renderImage(req.body, res, next, tilePath, overlayPath);
});
server.get({
  url: '/'
}, function (req, res) {
  var methods = ['GET', 'POST'];
  var routes = {};
  methods.forEach(function (method) {
    server.router.routes[method].forEach(function (_ref) {
      var url = _ref.spec.url;

      if (!routes[url]) {
        routes[url] = [];
      }

      routes[url].push(method);
    });
  });
  res.send({
    routes: routes
  });
});

if (tilePath !== null) {
  if (!_fs["default"].existsSync(tilePath)) {
    raiseError("Path to mbtiles files does not exist: ".concat(tilePath));
  }

  console.log('Using local mbtiles in: %j', tilePath);
}

function openGeojson(filepath) {
  var geojson = null;

  try {
    // read styleJSON
    var data = _fs["default"].readFileSync(filepath, "utf8");

    geojson = JSON.parse(data);
  } catch (jsonErr) {
    console.error('Error parsing Geojson in request: %j', jsonErr);
  }

  return geojson;
}

function openGPX(filepath) {
  var geojson = null;

  try {
    // read styleJSON
    var data = _fs["default"].readFileSync(filepath, "utf8");

    var gpx = new _xmldom.DOMParser().parseFromString(data);
    geojson = _togeojson["default"].gpx(gpx);
  } catch (jsonErr) {
    console.log(jsonErr);
    console.error('Error parsing GPX in request: %j', jsonErr);
  }

  return geojson;
}

if (overlayPath !== null) {
  if (!_fs["default"].existsSync(overlayPath)) {
    raiseError("Path to overlay files (GPX/geojson) does not exist: ".concat(overlayPath));
  } else {
    _fs["default"].readdir(overlayPath, function (err, files) {
      files.filter(function (file) {
        return file.endsWith(".gpx") | file.endsWith(".geojson");
      }).forEach(function (file) {
        var currentFilepath = _path["default"].join(overlayPath, file);

        console.debug("Loaded file:", file);
        var geojson = null;

        if (file.endsWith(".geojson")) {
          geojson = openGeojson(currentFilepath);
        } else {
          geojson = openGPX(currentFilepath);
        }

        if (geojson != null) {
          filenameToGeoJsonSource[file] = geojson.features;
        }
      });
    });
  }

  console.log('Using local overlays (GPX/geojson) in: %j', overlayPath);
}

server.listen(port, function () {
  console.log('Mapbox GL static rendering server started and listening at %s', server.url);
});
var _default = {
  server: server
};
exports["default"] = _default;