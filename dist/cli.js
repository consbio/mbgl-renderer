#!/usr/bin/env node
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _package = require('../package.json');

var _render = require('./render');

var _render2 = _interopRequireDefault(_render);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var raiseError = function raiseError(msg) {
    console.error('ERROR:', msg);
    process.exit(1);
};

var parseListToFloat = function parseListToFloat(text) {
    return text.split(',').map(Number);
};

_commander2.default.version(_package.version).description('Export a Mapbox GL map to image.  You must provide either center and zoom, or bounds.').arguments('<style.json> <img_filename> <width> <height>').option('-c, --center <longitude,latitude>', 'center of map (NO SPACES)', parseListToFloat).option('-z, --zoom <n>', 'Zoom level', parseInt).option('-b, --bounds <west,south,east,north>', 'Bounds (NO SPACES)', parseListToFloat).option('-t, --tiles <mbtiles_path>', 'Directory containing local mbtiles files to render').parse(process.argv);

var _cli$args = _slicedToArray(_commander2.default.args, 4),
    styleFilename = _cli$args[0],
    imgFilename = _cli$args[1],
    width = _cli$args[2],
    height = _cli$args[3],
    _cli$center = _commander2.default.center,
    center = _cli$center === undefined ? null : _cli$center,
    _cli$zoom = _commander2.default.zoom,
    zoom = _cli$zoom === undefined ? null : _cli$zoom,
    _cli$bounds = _commander2.default.bounds,
    bounds = _cli$bounds === undefined ? null : _cli$bounds,
    _cli$tiles = _commander2.default.tiles,
    tilePath = _cli$tiles === undefined ? null : _cli$tiles;

var imgWidth = parseInt(width, 10);
var imgHeight = parseInt(height, 10);

if (!_fs2.default.existsSync(styleFilename)) {
    raiseError('Style JSON file does not exist: ' + styleFilename);
}

if (imgWidth <= 0 || imgHeight <= 0) {
    raiseError('Width and height must be greater than 0, they are width:' + imgWidth + ' height:' + imgHeight);
}

if (center !== null) {
    if (center.length !== 2) {
        raiseError('Center must be longitude,latitude.  Invalid value found: ' + [].concat(_toConsumableArray(center)));
    }

    if (Math.abs(center[0]) > 180) {
        raiseError('Center longitude is outside world bounds (-180 to 180 deg): ' + center[0]);
    }

    if (Math.abs(center[1]) > 90) {
        raiseError('Center latitude is outside world bounds (-90 to 90 deg): ' + center[1]);
    }
}

if (zoom !== null && (zoom < 0 || zoom > 22)) {
    raiseError('Zoom level is outside supported range (0-22): ' + zoom);
}

if (bounds !== null) {
    if (bounds.length !== 4) {
        raiseError('Bounds must be west,south,east,north.  Invalid value found: ' + [].concat(_toConsumableArray(bounds)));
    }
}

if (tilePath !== null) {
    if (!_fs2.default.existsSync(tilePath)) {
        raiseError('Path to mbtiles files does not exist: ' + tilePath);
    }
}

console.log('\n\n-------- Export Mapbox GL Map --------');
console.log('style: %j', styleFilename);
console.log('output image: ' + imgFilename + ' (' + width + 'w x ' + height + 'h)');
console.log('using local mbtiles in: ' + tilePath);
// console.log('center: %j', center)
// console.log('zoom: %j', zoom)
// console.log('bounds: %j', bounds)

var style = JSON.parse(_fs2.default.readFileSync(styleFilename));

(0, _render2.default)(style, imgWidth, imgHeight, {
    zoom: zoom,
    center: center,
    bounds: bounds,
    tilePath: tilePath
}).then(function (data) {
    _fs2.default.writeFileSync(imgFilename, data);
    console.log('Done!');
    console.log('\n');
}).catch(function (err) {
    console.error(err);
});