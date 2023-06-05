#!/usr/bin/env node
import fs from 'fs'
import restify from 'restify'
import restifyValidation from 'node-restify-validation'
import restifyErrors from 'restify-errors'
import { program, InvalidOptionArgumentError } from 'commander'
import pino from 'restify-pino-logger'

import { version } from '../package.json'
import { render } from './render'

const parseListToFloat = (text) => text.split(',').map(Number)

const PARAMS = {
    style: { isRequired: true, isString: true },
    width: { isRequired: true, isInt: true },
    height: { isRequired: true, isInt: true },
    padding: { isRequired: false, isInt: true },
    zoom: { isRequired: false, isDecimal: true },
    ratio: { isRequired: false, isDecimal: true },
    bearing: { isRequired: false, isDecimal: true },
    pitch: { isRequired: false, isDecimal: true },
    token: { isRequired: false, isString: true },
    images: { isRequired: false, isObject: true },
}

const renderImage = (params, response, next, tilePath, logger) => {
    const {
        width,
        height,
        token = null,
        padding = 0,
        bearing = null,
        pitch = null,
    } = params
    let {
        style,
        zoom = null,
        center = null,
        bounds = null,
        ratio = 1,
        images = null,
    } = params

    if (typeof style === 'string') {
        try {
            style = JSON.parse(style)
        } catch (jsonErr) {
            return next(
                new restifyErrors.BadRequestError(
                    { cause: jsonErr },
                    'Error parsing JSON style'
                )
            )
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

        if (!Number.isFinite(center[0]) || Math.abs(center[0]) > 180) {
            return next(
                new restifyErrors.BadRequestError(
                    `Center longitude is outside world bounds (-180 to 180 deg): ${center[0]}`
                )
            )
        }

        if (!Number.isFinite(center[1]) || Math.abs(center[1]) > 90) {
            return next(
                new restifyErrors.BadRequestError(
                    `Center latitude is outside world bounds (-90 to 90 deg): ${center[1]}`
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
        for (const b of bounds) {
            if (!Number.isFinite(b)) {
                return next(
                    new restifyErrors.BadRequestError(
                        `Bounds must be west,south,east,north.  Invalid value found: ${[
                            ...bounds,
                        ]}`
                    )
                )
            }
        }

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

        if (padding) {
            // padding must not be greater than width / 2 and height / 2
            if (Math.abs(padding) >= width / 2) {
                return next(
                    new restifyErrors.BadRequestError(
                        'Padding must be less than width / 2'
                    )
                )
            }
            if (Math.abs(padding) >= height / 2) {
                return next(
                    new restifyErrors.BadRequestError(
                        'Padding must be less than height / 2'
                    )
                )
            }
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

    if (images !== null) {
        if (typeof images === 'string') {
            images = JSON.parse(images)
        } else if (typeof images !== 'object') {
            return next(
                new restifyErrors.BadRequestError(
                    'images must be an object or a string'
                )
            )
        }

        // validate URLs
        for (const image of Object.values(images)) {
            if (!(image && image.url)) {
                return next(
                    new restifyErrors.BadRequestError(
                        'Invalid image object; a url is required for each image'
                    )
                )
            }
            try {
                // use new URL to validate URL
                /* eslint-disable-next-line no-unused-vars */
                const url = new URL(image.url)
            } catch (e) {
                return next(
                    new restifyErrors.BadRequestError(
                        `Invalid image URL: ${image.url}`
                    )
                )
            }
        }
    }

    try {
        render(style, parseInt(width, 10), parseInt(height, 10), {
            zoom,
            center,
            bounds,
            padding,
            tilePath,
            ratio,
            bearing,
            pitch,
            token,
            images,
        })
            .then((data, rejected) => {
                if (rejected) {
                    return next(
                        new restifyErrors.InternalServerError(
                            { cause: rejected },
                            `Error processing render request: ${rejected}`
                        )
                    )
                }
                return response.sendRaw(200, data, {
                    'content-type': 'image/png',
                })
            })
            .catch((err) => {
                if (err instanceof restifyErrors.InternalServerError) {
                    return next(err)
                }

                return next(
                    new restifyErrors.InternalServerError(
                        `Error processing render request: ${err}`
                    )
                )
            })
    } catch (err) {
        if (err instanceof restifyErrors.InternalServerError) {
            return next(err)
        }

        return next(
            new restifyErrors.InternalServerError(
                `Error processing render request: ${err}`
            )
        )
    }

    return null
}

// Provide the CLI
program
    .version(version)
    .description('Start a server to render Mapbox GL map requests to images.')
    .option('-p, --port <n>', 'Server port', parseInt)
    .option(
        '-t, --tiles <mbtiles_path>',
        'Directory containing local mbtiles files to render',
        (tilePath) => {
            if (!fs.existsSync(tilePath)) {
                throw new InvalidOptionArgumentError(
                    `Path to mbtiles files does not exist: ${tilePath}`
                )
            }
            return tilePath
        }
    )
    .option('-v, --verbose', 'Enable request logging')
    .parse(process.argv)

const { port = 8000, tiles: tilePath = null, verbose = false } = program.opts()

export const server = restify.createServer({
    name: 'mbgl-renderer',
    version: '1.0.0',
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

server.use(
    pino({
        enabled: verbose,
        autoLogging: {
            ignorePaths: ['/health'],
        },
        redact: {
            paths: [
                'pid',
                'hostname',
                'res.headers.server',
                'req.id',
                'req.connection',
                'req.remoteAddress',
                'req.remotePort',
            ],
            remove: true,
        },
    })
)

/**
 * /render (GET): renders an image based on request query parameters.
 */
server.get(
    {
        url: '/render',
        validation: {
            queries: PARAMS,
        },
    },
    (req, res, next) => renderImage(req.query, res, next, tilePath, req.log)
)

/**
 * /render (POST): renders an image based on request body.
 */
server.post(
    {
        url: '/render',
        validation: {
            content: PARAMS,
        },
    },
    (req, res, next) => renderImage(req.body, res, next, tilePath, req.log)
)

/**
 * List all available endpoints.
 */
server.get({ url: '/' }, (req, res, next) => {
    const routes = {}
    Object.values(server.router.getRoutes()).forEach(
        ({ spec: { url, method } }) => {
            if (!routes[url]) {
                routes[url] = []
            }
            routes[url].push(method)
        }
    )

    res.send({
        routes,
        version,
    })

    return next()
})

/**
 * /health: returns 200 to confirm that server is up
 */
server.get({ url: '/health' }, (req, res, next) => {
    res.send(200)
    next()
})

let tilePathMessage = ''
if (tilePath !== null) {
    tilePathMessage = `\n using local mbtiles in: ${tilePath}`
}

server.listen(port, () => {
    console.log(
        '\n-----------------------------------------------------------------\n',
        `mbgl-renderer server started and listening at ${server.url}`,
        tilePathMessage,
        '\n-----------------------------------------------------------------\n'
    )
})

export default { server }
