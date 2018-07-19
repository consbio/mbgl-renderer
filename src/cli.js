#!/usr/bin/env node
import fs from 'fs'
import cli from 'commander'

import { version } from '../package.json'
import render from './render'

const raiseError = (msg) => {
    console.error('ERROR:', msg)
    process.exit(1)
}

const parseListToFloat = text => text.split(',').map(Number)

cli.version(version)
    .description('Export a Mapbox GL map to image')
    .arguments('<style.json> <img_filename> <width> <height>')
    .option('-c, --center <longitude,latitude>', 'center of map (NO SPACES)', parseListToFloat)
    .option('-z, --zoom <n>', 'Zoom level', parseInt)
    .parse(process.argv)

// console.log(program)
const {
    args: [styleFilename, imgFilename, width, height],
    center,
    zoom
} = cli

const imgWidth = parseInt(width, 10)
const imgHeight = parseInt(height, 10)

// console.log('args: %j %j %j %j', style, imgFilename, width, height)

if (!fs.existsSync(styleFilename)) {
    raiseError(`Style JSON file does not exist: ${styleFilename}`)
}

if (imgWidth <= 0 || imgHeight <= 0) {
    raiseError(`Width and height must be greater than 0, they are width:${imgWidth} height:${Height}`)
}

if (center.length !== 2) {
    raiseError(`Center must be longitude,latitude.  Invalid value found: ${[...center]}`)
}

if (Math.abs(center[0]) > 180) {
    raiseError(`Center longitude is outside world bounds (-180 to 180 deg): ${center[0]}`)
}

if (Math.abs(center[1]) > 90) {
    raiseError(`Center latitude is outside world bounds (-90 to 90 deg): ${center[1]}`)
}

if (zoom < 0 || zoom > 22) {
    raiseError(`Zoom level is outside supported range (0-22): ${zoom}`)
}

console.log('\n\n-------- Export Mapbox GL Map --------')
console.log('style: %j', styleFilename)
console.log(`output image (${width}w x ${height}h) to: ${imgFilename}\n\n`)

const style = JSON.parse(fs.readFileSync(styleFilename))

render(style, imgWidth, imgHeight, { zoom, center }).then((data) => {
    fs.writeFileSync(imgFilename, data)
})
