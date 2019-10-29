#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import restify from 'restify'
import restifyValidation from 'node-restify-validation'
import restifyErrors from 'restify-errors'
import cli from 'commander'
import bbox from '@turf/bbox'
import togeojson from '@mapbox/togeojson'
import {DOMParser} from 'xmldom'

import { version } from '../package.json'
import { render } from './render'

const parseListToFloat = text => text.split(',').map(Number)

const raiseError = msg => {
    console.error('ERROR:', msg)
    process.exit(1)
}

const filenameToGeoJsonSource = {}

const PARAMS = {
    style: { isRequired: true, isString: true },
    width: { isRequired: true, isInt: true },
    height: { isRequired: true, isInt: true },
    zoom: { isRequired: false, isDecimal: true },
    ratio: { isRequired: false, isDecimal: true },
    bearing: { isRequired: false, isDecimal: true },
    pitch: { isRequired: false, isDecimal: true },
    token: { isRequired: false, isString: true },
    overlayFiles: {isRequired: false, isString: true},
    fit: {isRequired: false, isBoolean: true},
}

const renderImage = (params, response, next, tilePath, overlayPath) => {
    const { width, height, token = null, bearing = null, pitch = null, overlayFiles = null, fit = false } = params
    let { style, zoom = null, center = null, bounds = null, ratio = 1 } = params

    if (typeof style === 'string') {
        try {
            style = JSON.parse(style)
        } catch (jsonErr) {
            console.error('Error parsing JSON style in request: %j', jsonErr)
            return next(
                new restifyErrors.BadRequestError(
                    { cause: jsonErr },
                    'Error parsing JSON style'
                )
            )
        }
    }

    if (typeof overlayFiles === 'string') {

        let geojsonList = []        
        if (overlayFiles == "*") {
            for (const value of Object.values(filenameToGeoJsonSource)) {
                geojsonList = geojsonList.concat(value)
            }
        } else {
            for (const overlayFile of overlayFiles.split(",")) {
                if (overlayFile in filenameToGeoJsonSource) {
                    geojsonList = geojsonList.concat(filenameToGeoJsonSource[overlayFile])
                }
            }
        }
        const featureList = { 
            "type": "FeatureCollection",
            "features": geojsonList
        }
        style.sources["geojson-line"] = {
            "type": "geojson",
            "data": featureList
        }

        const bboxed = bbox(featureList)
        if (fit) {
            bounds = bboxed
        }
    }

    if (center !== null) {
        if (typeof center === 'string') {
            center = parseListToFloat(center)
        }

        if (center.length !== 2) {
            return next(
                new restifyErrors.BadRequestError(
                    `Center must be longitude,latitude.  Invalid value found: ${[
                        ...center,
                    ]}`
                )
            )
        }

        if (Number.isNaN(center[0]) || Math.abs(center[0]) > 180) {
            return next(
                new restifyErrors.BadRequestError(
                    `Center longitude is outside world bounds (-180 to 180 deg): ${
                        center[0]
                    }`
                )
            )
        }

        if (Number.isNaN(center[1]) || Math.abs(center[1]) > 90) {
            return next(
                new restifyErrors.BadRequestError(
                    `Center latitude is outside world bounds (-90 to 90 deg): ${
                        center[1]
                    }`
                )
            )
        }
    }
    if (zoom !== null) {
        zoom = parseFloat(zoom)
        if (zoom < 0 || zoom > 22) {
            return next(
                new restifyErrors.BadRequestError(
                    `Zoom level is outside supported range (0-22): ${zoom}`
                )
            )
        }
    }
    if (ratio !== null) {
        ratio = parseInt(ratio, 10)
        if (!ratio || ratio < 1) {
            return next(
                new restifyErrors.BadRequestError(
                    `Ratio is outside supported range (>=1): ${ratio}`
                )
            )
        }
    }
    if (bounds !== null) {
        if (typeof bounds === 'string') {
            bounds = parseListToFloat(bounds)
        }

        if (bounds.length !== 4) {
            return next(
                new restifyErrors.BadRequestError(
                    `Bounds must be west,south,east,north.  Invalid value found: ${[
                        ...bounds,
                    ]}`
                )
            )
        }
        bounds.forEach(b => {
            if (Number.isNaN(b)) {
                return next(
                    new restifyErrors.BadRequestError(
                        `Bounds must be west,south,east,north.  Invalid value found: ${[
                            ...bounds,
                        ]}`
                    )
                )
            }
            return null
        })

        const [west, south, east, north] = bounds
        if (west === east) {
            return next(
                new restifyErrors.BadRequestError(
                    `Bounds west and east coordinate are the same value`
                )
            )
        }
        if (south === north) {
            return next(
                new restifyErrors.BadRequestError(
                    `Bounds south and north coordinate are the same value`
                )
            )
        }
    }

    if (bearing !== null) {
        if (bearing < 0 || bearing > 360) {
            return next(
                new restifyErrors.BadRequestError(
                    `Bearing is outside supported range (0-360): ${bearing}`
                )
            )
        }
    }

    if (pitch !== null) {
        if (pitch < 0 || pitch > 60) {
            return next(
                new restifyErrors.BadRequestError(
                    `Pitch is outside supported range (0-60): ${pitch}`
                )
            )
        }
    }

    if (!((center && zoom !== null) || bounds)) {
        return next(
            new restifyErrors.BadRequestError(
                'Either center and zoom OR bounds must be provided'
            )
        )
    }

    try {
        render(style, parseInt(width, 10), parseInt(height, 10), {
            zoom,
            center,
            bounds,
            tilePath,
            ratio,
            bearing,
            pitch,
            token,
            fit
        })
            .then((data, rejected) => {
                if (rejected) {
                    console.error('render request rejected', rejected)
                    return next(
                        new restifyErrors.InternalServerError(
                            { cause: rejected },
                            'Error processing render request'
                        )
                    )
                }
                return response.sendRaw(200, data, {
                    'content-type': 'image/png',
                })
            })
            .catch(err => {
                console.error('Error processing render request', err)
                return next(
                    new restifyErrors.InternalServerError(
                        { cause: err },
                        'Error processing render request'
                    )
                )
            })
    } catch (err) {
        console.error('Error processing render request', err)
        return next(
            new restifyErrors.InternalServerError(
                { cause: err },
                'Error processing render request'
            )
        )
    }

    return null
}

// Provide the CLI
cli.version(version)
    .description('Start a server to render Mapbox GL map requests to images.')
    .option('-p, --port <n>', 'Server port', parseInt)
    .option(
        '-t, --tiles <mbtiles_path>',
        'Directory containing local mbtiles files to render'
    )
    .option('-o, --overlay <overlay_files_path>',
        'Directory containing GPX/geojson files to render in overlay')
    .parse(process.argv)

const { port = 8000, tiles: tilePath = null, overlay: overlayPath = null } = cli

export const server = restify.createServer({
    ignoreTrailingSlash: true,
})
server.use(restify.plugins.queryParser())
server.use(restify.plugins.bodyParser())
server.use(
    restifyValidation.validationPlugin({
        errorsAsArray: false,
        forbidUndefinedVariables: false,
        errorHandler: restifyErrors.BadRequestError,
    })
)

server.get(
    {
        url: '/render',
        validation: {
            queries: PARAMS,
        },
    },
    (req, res, next) => renderImage(req.query, res, next, tilePath, overlayPath)
)

server.post(
    {
        url: '/render',
        validation: {
            content: PARAMS,
        },
    },
    (req, res, next) => renderImage(req.body, res, next, tilePath, overlayPath)
)

server.get({ url: '/' }, (req, res) => {
    const methods = ['GET', 'POST']
    const routes = {}
    methods.forEach(method => {
        server.router.routes[method].forEach(({ spec: { url } }) => {
            if (!routes[url]) {
                routes[url] = []
            }
            routes[url].push(method)
        })
    })
    res.send({
        routes,
    })
})

if (tilePath !== null) {
    if (!fs.existsSync(tilePath)) {
        raiseError(`Path to mbtiles files does not exist: ${tilePath}`)
    }

    console.log('Using local mbtiles in: %j', tilePath)
}

function openGeojson(filepath) {
    let geojson = null
    try {
        // read styleJSON
        const data = fs.readFileSync(filepath, "utf8")
        geojson = JSON.parse(data)
    } catch (jsonErr) {
        console.error('Error parsing Geojson in request: %j', jsonErr)
    }
    return geojson
}

function openGPX(filepath) {
    let geojson = null
    try {
        // read styleJSON
        const data = fs.readFileSync(filepath, "utf8")
        const gpx = new DOMParser().parseFromString(data)
        geojson = togeojson.gpx(gpx)
    } catch (jsonErr) {
        console.log(jsonErr)
        console.error('Error parsing GPX in request: %j', jsonErr)
    }
    return geojson

}


if (overlayPath !== null) {
    if (!fs.existsSync(overlayPath)) {
        raiseError(`Path to overlay files (GPX/geojson) does not exist: ${overlayPath}`)
    } else {
        fs.readdir(overlayPath, (err, files) => {
            files
                .filter(file => file.endsWith(".gpx") | file.endsWith(".geojson"))
                .forEach(file => {
                    const currentFilepath = path.join(overlayPath, file)
                    console.debug("Loaded file:", file)
                    let geojson = null
                    if (file.endsWith(".geojson")) {
                        geojson = openGeojson(currentFilepath)
                    } else {
                        geojson = openGPX(currentFilepath)
                    }
                    if (geojson != null) {
                        filenameToGeoJsonSource[file] = geojson.features
                    }
                })

        })
    }

    console.log('Using local overlays (GPX/geojson) in: %j', overlayPath)
}

server.listen(port, () => {
    console.log(
        'Mapbox GL static rendering server started and listening at %s',
        server.url
    )
})

export default { server }
