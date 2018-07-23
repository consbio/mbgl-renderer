import restify from 'restify'
import restifyValidation from 'node-restify-validation'
import restifyErrors from 'restify-errors'

import render from './render'

const parseListToFloat = text => text.split(',').map(Number)

const port = 8000
const tilePath = null

const PARAMS = {
    style: { isRequired: true, isString: true }, // stringified JSON.  TODO: add further validation of structure
    width: { isRequired: true, isInt: true },
    height: { isRequired: true, isInt: true },
    zoom: { isRequired: false, isInt: true }
    // center: {
    //     // longitude, latitude
    //     isRequired: false,
    //     isArray: {
    //         minLength: 2,
    //         maxLength: 2,
    //         element: { isDecimal: true }
    //     }
    // },

    // bounds: {
    //     // west, south, east, north
    //     isRequired: false,
    //     isArray: {
    //         minLength: 4,
    //         maxLength: 4,
    //         element: { isDecimal: true }
    //     }
    // }
}

const server = restify.createServer()
server.use(restify.plugins.queryParser())
server.use(restify.plugins.bodyParser())
server.use(
    restifyValidation.validationPlugin({
        errorsAsArray: false,
        forbidUndefinedVariables: false,
        errorHandler: restifyErrors.InvalidArgumentError
    })
)

server.get(
    {
        url: '/render',
        validation: {
            queries: PARAMS
        }
    },
    (req, res, next) => {
        const { width, height } = req.query
        let {
            style, zoom = null, center = null, bounds = null
        } = req.query

        console.log('query params', req.query)

        try {
            style = JSON.parse(style)
        } catch (jsonErr) {
            console.error('Error parsing JSON style in request: %j', jsonErr)
            return next(new restifyErrors.BadRequestError({ cause: jsonErr }, 'Error parsing JSON style'))
        }

        // TODO: parse center, zoom, bounds from strings to appropriate types
        if (center !== null) {
            center = parseListToFloat(center)
            if (center.length !== 2) {
                return next(
                    new restifyErrors.BadRequestError(
                        `Center must be longitude,latitude.  Invalid value found: ${[...center]}`
                    )
                )
            }

            if (Number.isNaN(center[0]) || Math.abs(center[0]) > 180) {
                return next(
                    new restifyErrors.BadRequestError(
                        `Center longitude is outside world bounds (-180 to 180 deg): ${center[0]}`
                    )
                )
            }

            if (Number.isNaN(center[1]) || Math.abs(center[1]) > 90) {
                return next(
                    new restifyErrors.BadRequestError(
                        `Center latitude is outside world bounds (-90 to 90 deg): ${center[1]}`
                    )
                )
            }
        }
        if (zoom !== null) {
            zoom = parseInt(zoom, 10)
            if (zoom < 0 || zoom > 22) {
                return next(new restifyErrors.BadRequestError(`Zoom level is outside supported range (0-22): ${zoom}`))
            }
        }
        if (bounds !== null) {
            bounds = parseListToFloat(bounds)
            if (bounds.length !== 4) {
                return next(
                    new restifyErrors.BadRequestError(
                        `Bounds must be west,south,east,north.  Invalid value found: ${[...bounds]}`
                    )
                )
            }
            bounds.forEach((b) => {
                if (Number.isNaN(b)) {
                    return next(
                        new restifyErrors.BadRequestError(
                            `Bounds must be west,south,east,north.  Invalid value found: ${[...bounds]}`
                        )
                    )
                }
                return null
            })
        }

        if (!(center && zoom !== null) || bounds) {
            return next(new restifyErrors.BadRequestError('Either center and zoom OR bounds must be provided'))
        }

        try {
            render(style, parseInt(width, 10), parseInt(height, 10), {
                zoom,
                center,
                bounds,
                tilePath
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
                    return res.sendRaw(200, data, { 'content-type': 'image/png' })
                })
                .catch((err) => {
                    console.error('Error processing render request', err)
                    return next(
                        new restifyErrors.InternalServerError({ cause: err }, 'Error processing render request')
                    )
                })
        } catch (err) {
            console.error('Error processing render request', err)
            return next(new restifyErrors.InternalServerError({ cause: err }, 'Error processing render request'))
        }

        return null
    }
)

server.post(
    {
        url: '/render',
        validation: {
            content: PARAMS
        }
    },
    (req, res, next) => {
        const {
            style: styleJSON, width, height, zoom = null, center = null, bounds = null
        } = req.body

        let style = null
        try {
            style = JSON.parse(styleJSON)
        } catch (jsonErr) {
            console.error('Error parsing JSON style in request: %j', jsonErr)
            return next(new restifyErrors.BadRequestError({ cause: jsonErr }, 'Error parsing JSON style'))
        }

        try {
            render(style, width, height, {
                zoom,
                center,
                bounds,
                tilePath
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
                    return res.sendRaw(200, data, { 'content-type': 'image/png' })
                })
                .catch((err) => {
                    console.error('Error processing render request', err)
                    return next(
                        new restifyErrors.InternalServerError({ cause: err }, 'Error processing render request')
                    )
                })
        } catch (err) {
            console.error('Error processing render request', err)
            return next(new restifyErrors.InternalServerError({ cause: err }, 'Error processing render request'))
        }

        return null
    }
)

// server.post('/render', (req, res, next) => {
//     const required = ['style', 'zoom', 'width', 'height', 'center']
//     const missing = required.filter(item => !req.body.hasOwnProperty(item))
//     if (missing.length) {
//         return next(new errs.BadRequestError('Missing parameters: ' + missing.join(', ')))
//     }

//     const { style, zoom, width, height, center, bounds } = req.body

//     render(style, imgWidth, imgHeight, {
//         zoom,
//         center,
//         bounds,
//         tilePath
//     })
//         .then((data) => {
//             fs.writeFileSync(imgFilename, data)
//             console.log('Done!')
//             console.log('\n')
//         })
//         .catch((err) => {
//             console.error(err)
//         })

// if (bounds !== null && (zoom === null || center === null)) {
//     let viewport = geoViewport.viewport(bounds, [width, height])
//     zoom = Math.max(viewport.zoom - 1, 0)
//     center = viewport.center
// }

// let map = new mbgl.Map(options)
// map.load(style)
// map.render({zoom, width, height, center}, (err, buffer) => {
//     if (err) {
//         return next(new errs.InternalServerError())
//     }

//     // Convert raw pixel values to png
//     sharp(buffer, {raw: {width, height, channels: 4}}).png().toBuffer().then(data => {
//         res.sendRaw(200, data, {'content-type': 'image/png'})
//     })
// })
// })

server.listen(port, () => {
    console.log('Mapbox GL static rendering server started and listening at %s', server.url)
})
