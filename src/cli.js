#!/usr/bin/env node
import fs from 'fs'
import cli from 'commander'
import webRequest from 'request'

import { version } from '../package.json'
import { render, isMapboxStyleURL, normalizeMapboxStyleURL } from './render'

const raiseError = (msg) => {
    console.error('ERROR:', msg)
    process.exit(1)
}

const parseListToFloat = text => text.split(',').map(Number)

cli.version(version)
    .description('Export a Mapbox GL map to image.  You must provide either center and zoom, or bounds.')
    .arguments('<style.json> <img_filename> <width> <height>')
    .option('-c, --center <longitude,latitude>', 'center of map (NO SPACES)', parseListToFloat)
    .option('-z, --zoom <n>', 'Zoom level', parseFloat)
    .option('-b, --bounds <west,south,east,north>', 'Bounds (NO SPACES)', parseListToFloat)
    .option('-t, --tiles <mbtiles_path>', 'Directory containing local mbtiles files to render')
    .option('--token <mapbox access token>', 'Mapbox access token (required for using Mapbox styles and sources)')
    .parse(process.argv)

const {
    args: [styleFilename, imgFilename, width, height],
    center = null,
    zoom = null,
    bounds = null,
    tiles: tilePath = null,
    token: token = null
} = cli

// verify that all arguments are present
if (!styleFilename) {
    raiseError('style is a required parameter')
}
if (!imgFilename) {
    raiseError('output image filename is a required parameter')
}
if (!width) {
    raiseError('width is a required parameter')
}
if (!height) {
    raiseError('height is a required parameter')
}

const imgWidth = parseInt(width, 10)
const imgHeight = parseInt(height, 10)

const isMapboxStyle = isMapboxStyleURL(styleFilename)

if (!(isMapboxStyle || fs.existsSync(styleFilename))) {
    raiseError(`Style JSON file does not exist: ${styleFilename}`)
}

if (imgWidth <= 0 || imgHeight <= 0) {
    raiseError(`Width and height must be greater than 0, they are width:${imgWidth} height:${imgHeight}`)
}

if (center !== null) {
    if (center.length !== 2) {
        raiseError(`Center must be longitude,latitude.  Invalid value found: ${[...center]}`)
    }

    if (Math.abs(center[0]) > 180) {
        raiseError(`Center longitude is outside world bounds (-180 to 180 deg): ${center[0]}`)
    }

    if (Math.abs(center[1]) > 90) {
        raiseError(`Center latitude is outside world bounds (-90 to 90 deg): ${center[1]}`)
    }
}

if (zoom !== null && (zoom < 0 || zoom > 22)) {
    raiseError(`Zoom level is outside supported range (0-22): ${zoom}`)
}

if (bounds !== null) {
    if (bounds.length !== 4) {
        raiseError(`Bounds must be west,south,east,north.  Invalid value found: ${[...bounds]}`)
    }
}

if (tilePath !== null) {
    if (!fs.existsSync(tilePath)) {
        raiseError(`Path to mbtiles files does not exist: ${tilePath}`)
    }
}

console.log('\n\n-------- Export Mapbox GL Map --------')
console.log('style: %j', styleFilename)
console.log(`output image: ${imgFilename} (${width}w x ${height}h)`)
if (tilePath !== null) {
    console.log(`using local mbtiles in: ${tilePath}`)
}

const renderRequest = (style) => {
    render(style, imgWidth, imgHeight, {
        zoom,
        center,
        bounds,
        tilePath,
        token
    })
        .then((data) => {
            fs.writeFileSync(imgFilename, data)
            console.log('Done!')
            console.log('\n')
        })
        .catch((err) => {
            console.error(err)
        })
}

if (isMapboxStyle) {
    if (!token) {
        raiseError('mapbox access token is required')
    }

    // load the style then call the render function
    const styleURL = normalizeMapboxStyleURL(styleFilename, token)
    console.log(`requesting mapbox style:${styleFilename}\nfrom: ${styleURL}`)
    webRequest(styleURL, (err, res, body) => {
        if (err) {
            return raiseError(err)
        }

        switch (res.statusCode) {
            case 200: {
                return renderRequest(JSON.parse(body))
            }
            case 401: {
                return raiseError('Mapbox token is not authorized for this style')
            }
            default: {
                return raiseError(`Unexpected response for mapbox style request: ${styleURL}\n${res.statusCode}`)
            }
        }
    })
} else {
    // read styleJSON
    fs.readFile(styleFilename, (err, data) => {
        renderRequest(JSON.parse(data))
    })
}
