#!/usr/bin/env node
import fs from 'fs'
import { program, InvalidArgumentError } from 'commander'
import webRequest from 'request'

import metadata from '../package.json' with { type: 'json' }
import { render, isMapboxStyleURL, normalizeMapboxStyleURL } from './render.js'

const { version } = metadata

const raiseError = (msg) => {
    console.error('error', msg)
    process.exit(1)
}

const parseListToFloat = (text) => text.split(',').map(Number)

const validateDimension = (value) => {
    if (value <= 0) {
        throw new InvalidArgumentError('Must be greater than 0')
    }
}

program
    .version(version)
    .name('mbgl-render')
    .usage('<style> <image> <width> <height> [options]')
    .description(
        'Export a MapLibre GL map to image.  You must provide either center and zoom, or bounds.'
    )
    .argument('<style>', 'style JSON', (styleFilename) => {
        const isMapboxStyle = isMapboxStyleURL(styleFilename)
        if (!(isMapboxStyle || fs.existsSync(styleFilename))) {
            throw new InvalidArgumentError('File does not exist')
        }
    })
    .argument('<image>', 'output image filename')
    .argument('<width>', 'image width', validateDimension)
    .argument('<height>', 'image height', validateDimension)
    .option(
        '-c, --center <longitude,latitude>',
        'center of map (NO SPACES)',
        parseListToFloat
    )
    .option('-z, --zoom <n>', 'Zoom level', parseFloat)
    .option('-r, --ratio <n>', 'Pixel ratio', parseInt)
    .option(
        '-b, --bounds <west,south,east,north>',
        'Bounds (NO SPACES)',
        parseListToFloat
    )
    .option(
        '--padding <padding>',
        'Number of pixels to add to the inside of each edge of the image.\nCan only be used with bounds option.',
        parseInt
    )
    .option('--bearing <degrees>', 'Bearing (0-360)', parseFloat)
    .option('--pitch <degrees>', 'Pitch (0-60)', parseFloat)
    .option(
        '-t, --tiles <mbtiles_path>',
        'Directory containing local mbtiles files to render'
    )
    .option(
        '--token <mapbox access token>',
        'Mapbox access token (required for using Mapbox styles and sources)'
    )
    .option('--images <images.json', 'JSON file containing image config')
    .parse()

const [styleFilename, imgFilename, width, height] = program.args

const {
    center = null,
    zoom = null,
    ratio = 1,
    bounds = null,
    padding = 0,
    bearing = null,
    pitch = null,
    tiles: tilePath = null,
    token = null,
    images: imagesFilename = null,
} = program.opts()

const imgWidth = parseInt(width, 10)
const imgHeight = parseInt(height, 10)

const isMapboxStyle = isMapboxStyleURL(styleFilename)

if (center !== null) {
    if (center.length !== 2) {
        raiseError(
            `Center must be longitude,latitude.  Invalid value found: ${[
                ...center,
            ]}`
        )
    }

    if (Math.abs(center[0]) > 180) {
        raiseError(
            `Center longitude is outside world bounds (-180 to 180 deg): ${center[0]}`
        )
    }

    if (Math.abs(center[1]) > 90) {
        raiseError(
            `Center latitude is outside world bounds (-90 to 90 deg): ${center[1]}`
        )
    }
}

if (zoom !== null && (zoom < 0 || zoom > 22)) {
    raiseError(`Zoom level is outside supported range (0-22): ${zoom}`)
}

if (bounds !== null) {
    if (bounds.length !== 4) {
        raiseError(
            `Bounds must be west,south,east,north.  Invalid value found: ${[
                ...bounds,
            ]}`
        )
    }

    bounds.forEach((b) => {
        if (!Number.isFinite(b)) {
            raiseError(
                `Bounds must be valid floating point values.  Invalid value found: ${[
                    ...bounds,
                ]}`
            )
        }
        return null
    })

    const [west, south, east, north] = bounds
    if (west === east) {
        raiseError('Bounds west and east coordinate are the same value')
    }
    if (south === north) {
        raiseError('Bounds south and north coordinate are the same value')
    }

    if (padding) {
        // padding must not be greater than width / 2 and height / 2
        if (Math.abs(padding) >= width / 2) {
            raiseError('Padding must be less than width / 2')
        }
        if (Math.abs(padding) >= height / 2) {
            raiseError('Padding must be less than height / 2')
        }
    }
}

if (bearing !== null) {
    if (bearing < 0 || bearing > 360) {
        raiseError(`Bearing is outside supported range (0-360): ${bearing}`)
    }
}

if (pitch !== null) {
    if (pitch < 0 || pitch > 60) {
        raiseError(`Pitch is outside supported range (0-60): ${pitch}`)
    }
}

if (tilePath !== null) {
    if (!fs.existsSync(tilePath)) {
        raiseError(`Path to mbtiles files does not exist: ${tilePath}`)
    }
}

let images = null
if (imagesFilename !== null) {
    if (!fs.existsSync(imagesFilename)) {
        raiseError(
            `Path to images config file does not exist: ${imagesFilename}`
        )
    }
    images = JSON.parse(fs.readFileSync(imagesFilename))
}

console.log('\n\n-------- Export MapLibre GL Map --------')
console.log('style: %j', styleFilename)
console.log(`output image: ${imgFilename} (${width}w x ${height}h)`)
if (tilePath !== null) {
    console.log(`using local mbtiles in: ${tilePath}`)
}

const renderRequest = (style) => {
    render(style, imgWidth, imgHeight, {
        zoom,
        ratio,
        center,
        bounds,
        padding,
        bearing,
        pitch,
        tilePath,
        token,
        images,
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
                return raiseError(
                    'Mapbox token is not authorized for this style'
                )
            }
            default: {
                return raiseError(
                    `Unexpected response for mapbox style request: ${styleURL}\n${res.statusCode}`
                )
            }
        }
    })
} else {
    // read styleJSON
    fs.readFile(styleFilename, (err, data) => {
        renderRequest(JSON.parse(data))
    })
}
