#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _fs = _interopRequireDefault(require("fs"));

var _commander = _interopRequireDefault(require("commander"));

var _request = _interopRequireDefault(require("request"));

var _package = require("../package.json");

var _render = require("./render");

var raiseError = function raiseError(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
};

var parseListToFloat = function parseListToFloat(text) {
  return text.split(',').map(Number);
};

_commander["default"].version(_package.version).name('mbgl-render').usage('<style.json> <img_filename> <width> <height> [options]').description('Export a Mapbox GL map to image.  You must provide either center and zoom, or bounds.').arguments('<style.json> <img_filename> <width> <height>').option('-c, --center <longitude,latitude>', 'center of map (NO SPACES)', parseListToFloat).option('-z, --zoom <n>', 'Zoom level', parseFloat).option('-r, --ratio <n>', 'Pixel ratio', parseInt).option('-b, --bounds <west,south,east,north>', 'Bounds (NO SPACES)', parseListToFloat).option('--bearing <degrees>', 'Bearing (0-360)', parseFloat).option('--pitch <degrees>', 'Pitch (0-60)', parseFloat).option('-t, --tiles <mbtiles_path>', 'Directory containing local mbtiles files to render').option('--token <mapbox access token>', 'Mapbox access token (required for using Mapbox styles and sources)').parse(process.argv);

var _cli$args = (0, _slicedToArray2["default"])(_commander["default"].args, 4),
    styleFilename = _cli$args[0],
    imgFilename = _cli$args[1],
    width = _cli$args[2],
    height = _cli$args[3],
    _cli$center = _commander["default"].center,
    center = _cli$center === void 0 ? null : _cli$center,
    _cli$zoom = _commander["default"].zoom,
    zoom = _cli$zoom === void 0 ? null : _cli$zoom,
    _cli$ratio = _commander["default"].ratio,
    ratio = _cli$ratio === void 0 ? 1 : _cli$ratio,
    _cli$bounds = _commander["default"].bounds,
    bounds = _cli$bounds === void 0 ? null : _cli$bounds,
    _cli$bearing = _commander["default"].bearing,
    bearing = _cli$bearing === void 0 ? null : _cli$bearing,
    _cli$pitch = _commander["default"].pitch,
    pitch = _cli$pitch === void 0 ? null : _cli$pitch,
    _cli$tiles = _commander["default"].tiles,
    tilePath = _cli$tiles === void 0 ? null : _cli$tiles,
    _cli$token = _commander["default"].token,
    token = _cli$token === void 0 ? null : _cli$token; // verify that all arguments are present


if (!styleFilename) {
  raiseError('style is a required parameter');
}

if (!imgFilename) {
  raiseError('output image filename is a required parameter');
}

if (!width) {
  raiseError('width is a required parameter');
}

if (!height) {
  raiseError('height is a required parameter');
}

var imgWidth = parseInt(width, 10);
var imgHeight = parseInt(height, 10);
var isMapboxStyle = (0, _render.isMapboxStyleURL)(styleFilename);

if (!(isMapboxStyle || _fs["default"].existsSync(styleFilename))) {
  raiseError("Style JSON file does not exist: ".concat(styleFilename));
}

if (imgWidth <= 0 || imgHeight <= 0) {
  raiseError("Width and height must be greater than 0, they are width:".concat(imgWidth, " height:").concat(imgHeight));
}

if (center !== null) {
  if (center.length !== 2) {
    raiseError("Center must be longitude,latitude.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(center)));
  }

  if (Math.abs(center[0]) > 180) {
    raiseError("Center longitude is outside world bounds (-180 to 180 deg): ".concat(center[0]));
  }

  if (Math.abs(center[1]) > 90) {
    raiseError("Center latitude is outside world bounds (-90 to 90 deg): ".concat(center[1]));
  }
}

if (zoom !== null && (zoom < 0 || zoom > 22)) {
  raiseError("Zoom level is outside supported range (0-22): ".concat(zoom));
}

if (bounds !== null) {
  if (bounds.length !== 4) {
    raiseError("Bounds must be west,south,east,north.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(bounds)));
  }

  bounds.forEach(function (b) {
    if (Number.isNaN(b)) {
      raiseError("Bounds must be west,south,east,north.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(bounds)));
    }

    return null;
  });

  var _bounds = (0, _slicedToArray2["default"])(bounds, 4),
      west = _bounds[0],
      south = _bounds[1],
      east = _bounds[2],
      north = _bounds[3];

  if (west === east) {
    raiseError("Bounds west and east coordinate are the same value");
  }

  if (south === north) {
    raiseError("Bounds south and north coordinate are the same value");
  }
}

if (bearing !== null) {
  if (bearing < 0 || bearing > 360) {
    raiseError("Bearing is outside supported range (0-360): ".concat(bearing));
  }
}

if (pitch !== null) {
  if (pitch < 0 || pitch > 60) {
    raiseError("Pitch is outside supported range (0-60): ".concat(pitch));
  }
}

if (tilePath !== null) {
  if (!_fs["default"].existsSync(tilePath)) {
    raiseError("Path to mbtiles files does not exist: ".concat(tilePath));
  }
}

console.log('\n\n-------- Export Mapbox GL Map --------');
console.log('style: %j', styleFilename);
console.log("output image: ".concat(imgFilename, " (").concat(width, "w x ").concat(height, "h)"));

if (tilePath !== null) {
  console.log("using local mbtiles in: ".concat(tilePath));
}

var renderRequest = function renderRequest(style) {
  (0, _render.render)(style, imgWidth, imgHeight, {
    zoom: zoom,
    ratio: ratio,
    center: center,
    bounds: bounds,
    bearing: bearing,
    pitch: pitch,
    tilePath: tilePath,
    token: token
  }).then(function (data) {
    _fs["default"].writeFileSync(imgFilename, data);

    console.log('Done!');
    console.log('\n');
  })["catch"](function (err) {
    console.error(err);
  });
};

if (isMapboxStyle) {
  if (!token) {
    raiseError('mapbox access token is required');
  } // load the style then call the render function


  var styleURL = (0, _render.normalizeMapboxStyleURL)(styleFilename, token);
  console.log("requesting mapbox style:".concat(styleFilename, "\nfrom: ").concat(styleURL));
  (0, _request["default"])(styleURL, function (err, res, body) {
    if (err) {
      return raiseError(err);
    }

    switch (res.statusCode) {
      case 200:
        {
          return renderRequest(JSON.parse(body));
        }

      case 401:
        {
          return raiseError('Mapbox token is not authorized for this style');
        }

      default:
        {
          return raiseError("Unexpected response for mapbox style request: ".concat(styleURL, "\n").concat(res.statusCode));
        }
    }
  });
} else {
  // read styleJSON
  _fs["default"].readFile(styleFilename, function (err, data) {
    renderRequest(JSON.parse(data));
  });
}