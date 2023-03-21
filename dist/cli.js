#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _fs = _interopRequireDefault(require("fs"));
var _commander = require("commander");
var _request = _interopRequireDefault(require("request"));
var _package = require("../package.json");
var _render = require("./render");
var raiseError = function raiseError(msg) {
  console.error('error', msg);
  process.exit(1);
};
var parseListToFloat = function parseListToFloat(text) {
  return text.split(',').map(Number);
};
var validateDimension = function validateDimension(value) {
  if (value <= 0) {
    throw new _commander.InvalidArgumentError('Must be greater than 0');
  }
};
_commander.program.version(_package.version).name('mbgl-render').usage('<style> <image> <width> <height> [options]').description('Export a Mapbox GL map to image.  You must provide either center and zoom, or bounds.').argument('<style>', 'style JSON', function (styleFilename) {
  var isMapboxStyle = (0, _render.isMapboxStyleURL)(styleFilename);
  if (!(isMapboxStyle || _fs["default"].existsSync(styleFilename))) {
    throw new _commander.InvalidArgumentError('File does not exist');
  }
}).argument('<image>', 'output image filename').argument('<width>', 'image width', validateDimension).argument('<height>', 'image height', validateDimension).option('-c, --center <longitude,latitude>', 'center of map (NO SPACES)', parseListToFloat).option('-z, --zoom <n>', 'Zoom level', parseFloat).option('-r, --ratio <n>', 'Pixel ratio', parseInt).option('-b, --bounds <west,south,east,north>', 'Bounds (NO SPACES)', parseListToFloat).option('--padding <padding>', 'Number of pixels to add to the inside of each edge of the image.\nCan only be used with bounds option.', parseInt).option('--bearing <degrees>', 'Bearing (0-360)', parseFloat).option('--pitch <degrees>', 'Pitch (0-60)', parseFloat).option('-t, --tiles <mbtiles_path>', 'Directory containing local mbtiles files to render').option('--token <mapbox access token>', 'Mapbox access token (required for using Mapbox styles and sources)').option('--images <images.json', 'JSON file containing image config').parse();
var _program$args = (0, _slicedToArray2["default"])(_commander.program.args, 4),
  styleFilename = _program$args[0],
  imgFilename = _program$args[1],
  width = _program$args[2],
  height = _program$args[3];
var _program$opts = _commander.program.opts(),
  _program$opts$center = _program$opts.center,
  center = _program$opts$center === void 0 ? null : _program$opts$center,
  _program$opts$zoom = _program$opts.zoom,
  zoom = _program$opts$zoom === void 0 ? null : _program$opts$zoom,
  _program$opts$ratio = _program$opts.ratio,
  ratio = _program$opts$ratio === void 0 ? 1 : _program$opts$ratio,
  _program$opts$bounds = _program$opts.bounds,
  bounds = _program$opts$bounds === void 0 ? null : _program$opts$bounds,
  _program$opts$padding = _program$opts.padding,
  padding = _program$opts$padding === void 0 ? 0 : _program$opts$padding,
  _program$opts$bearing = _program$opts.bearing,
  bearing = _program$opts$bearing === void 0 ? null : _program$opts$bearing,
  _program$opts$pitch = _program$opts.pitch,
  pitch = _program$opts$pitch === void 0 ? null : _program$opts$pitch,
  _program$opts$tiles = _program$opts.tiles,
  tilePath = _program$opts$tiles === void 0 ? null : _program$opts$tiles,
  _program$opts$token = _program$opts.token,
  token = _program$opts$token === void 0 ? null : _program$opts$token,
  _program$opts$images = _program$opts.images,
  imagesFilename = _program$opts$images === void 0 ? null : _program$opts$images;
var imgWidth = parseInt(width, 10);
var imgHeight = parseInt(height, 10);
var isMapboxStyle = (0, _render.isMapboxStyleURL)(styleFilename);
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
    if (!Number.isFinite(b)) {
      raiseError("Bounds must be valid floating point values.  Invalid value found: ".concat((0, _toConsumableArray2["default"])(bounds)));
    }
    return null;
  });
  var _bounds = (0, _slicedToArray2["default"])(bounds, 4),
    west = _bounds[0],
    south = _bounds[1],
    east = _bounds[2],
    north = _bounds[3];
  if (west === east) {
    raiseError('Bounds west and east coordinate are the same value');
  }
  if (south === north) {
    raiseError('Bounds south and north coordinate are the same value');
  }
  if (padding) {
    // padding must not be greater than width / 2 and height / 2
    if (Math.abs(padding) >= width / 2) {
      raiseError('Padding must be less than width / 2');
    }
    if (Math.abs(padding) >= height / 2) {
      raiseError('Padding must be less than height / 2');
    }
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
var images = null;
if (imagesFilename !== null) {
  if (!_fs["default"].existsSync(imagesFilename)) {
    raiseError("Path to images config file does not exist: ".concat(imagesFilename));
  }
  images = JSON.parse(_fs["default"].readFileSync(imagesFilename));
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
    padding: padding,
    bearing: bearing,
    pitch: pitch,
    tilePath: tilePath,
    token: token,
    images: images
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
  }

  // load the style then call the render function
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