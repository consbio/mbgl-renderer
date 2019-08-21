#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _restify = _interopRequireDefault(require("restify"));

var _nodeRestifyValidation = _interopRequireDefault(require("node-restify-validation"));

var _restifyErrors = _interopRequireDefault(require("restify-errors"));

var _commander = _interopRequireDefault(require("commander"));

var _package = require("../package.json");

var _render = _interopRequireDefault(require("./render"));

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
  zoom: {
    isRequired: false,
    isDecimal: true
  },
  ratio: {
    isRequired: false,
    isDecimal: true
  },
  token: {
    isRequired: false,
    isString: true
  }
};

var renderImage = function renderImage(params, response, next, tilePath) {
  var width = params.width,
      height = params.height,
      _params$token = params.token,
      token = _params$token === void 0 ? null : _params$token;
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
    ratio = parseInt(ratio);

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
  }

  if (!(center && zoom !== null || bounds)) {
    return next(new _restifyErrors["default"].BadRequestError('Either center and zoom OR bounds must be provided'));
  }

  try {
    (0, _render["default"])(style, parseInt(width, 10), parseInt(height, 10), {
      zoom: zoom,
      center: center,
      bounds: bounds,
      tilePath: tilePath,
      ratio: ratio,
      token: token
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


_commander["default"].version(_package.version).description('Start a server to render Mapbox GL map requests to images.').option('-p, --port <n>', 'Server port', parseInt).option('-t, --tiles <mbtiles_path>', 'Directory containing local mbtiles files to render').parse(process.argv);

var _cli$port = _commander["default"].port,
    port = _cli$port === void 0 ? 8000 : _cli$port,
    _cli$tiles = _commander["default"].tiles,
    tilePath = _cli$tiles === void 0 ? null : _cli$tiles;

var server = _restify["default"].createServer();

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
  return renderImage(req.query, res, next, tilePath);
});
server.post({
  url: '/render',
  validation: {
    content: PARAMS
  }
}, function (req, res, next) {
  return renderImage(req.body, res, next, tilePath);
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
  console.log('Using local mbtiles in: %j', tilePath);
}

server.listen(port, function () {
  console.log('Mapbox GL static rendering server started and listening at %s', server.url);
});