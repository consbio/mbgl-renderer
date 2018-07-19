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

_commander2.default.version(_package.version).description('Export a Mapbox GL map to image').arguments('<style.json> <img_filename> <width> <height>').option('-c, --center <longitude,latitude>', 'center of map (NO SPACES)', parseListToFloat).option('-z, --zoom <n>', 'Zoom level', parseInt).parse(process.argv);

// console.log(program)

var _cli$args = _slicedToArray(_commander2.default.args, 4),
    styleFilename = _cli$args[0],
    imgFilename = _cli$args[1],
    width = _cli$args[2],
    height = _cli$args[3],
    center = _commander2.default.center,
    zoom = _commander2.default.zoom;

var imgWidth = parseInt(width, 10);
var imgHeight = parseInt(height, 10);

// console.log('args: %j %j %j %j', style, imgFilename, width, height)

if (!_fs2.default.existsSync(styleFilename)) {
    raiseError('Style JSON file does not exist: ' + styleFilename);
}

if (imgWidth <= 0 || imgHeight <= 0) {
    raiseError('Width and height must be greater than 0, they are width:' + imgWidth + ' height:' + Height);
}

if (center.length !== 2) {
    raiseError('Center must be longitude,latitude.  Invalid value found: ' + [].concat(_toConsumableArray(center)));
}

if (Math.abs(center[0]) > 180) {
    raiseError('Center longitude is outside world bounds (-180 to 180 deg): ' + center[0]);
}

if (Math.abs(center[1]) > 90) {
    raiseError('Center latitude is outside world bounds (-90 to 90 deg): ' + center[1]);
}

if (zoom < 0 || zoom > 22) {
    raiseError('Zoom level is outside supported range (0-22): ' + zoom);
}

console.log('\n\n-------- Export Mapbox GL Map --------');
console.log('style: %j', styleFilename);
console.log('output image (' + width + 'w x ' + height + 'h) to: ' + imgFilename + '\n\n');

var style = JSON.parse(_fs2.default.readFileSync(styleFilename));

(0, _render2.default)(style, imgWidth, imgHeight, { zoom: zoom, center: center }).then(function (data) {
    _fs2.default.writeFileSync(imgFilename, data);
});