import restify from 'restify'
import restifyValidation from 'node-restify-validation'
import restifyErrors from 'restify-errors'

import render from './render'

const parseListToFloat = text => text.split(',').map(Number)

const port = 8000
const tilePath = 'tests/fixtures'

const PARAMS = {
    style: { isRequired: true, isString: true }, // stringified JSON.  TODO: add further validation of structure
    width: { isRequired: true, isInt: true },
    height: { isRequired: true, isInt: true },
    zoom: { isRequired: false, isInt: true }
}

const renderImage = (params, response, next) => {
    const { width, height } = params
    let {
        style, zoom = null, center = null, bounds = null
    } = params

    if (style instanceof String) {
        try {
            style = JSON.parse(style)
        } catch (jsonErr) {
            console.error('Error parsing JSON style in request: %j', jsonErr)
            return next(new restifyErrors.BadRequestError({ cause: jsonErr }, 'Error parsing JSON style'))
        }
    }

    if (center !== null) {
        if (center instanceof String) {
            center = parseListToFloat(center)
        }

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
        if (bounds instanceof String) {
            bounds = parseListToFloat(bounds)
        }

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
                        new restifyErrors.InternalServerError({ cause: rejected }, 'Error processing render request')
                    )
                }
                return response.sendRaw(200, data, { 'content-type': 'image/png' })
            })
            .catch((err) => {
                console.error('Error processing render request', err)
                return next(new restifyErrors.InternalServerError({ cause: err }, 'Error processing render request'))
            })
    } catch (err) {
        console.error('Error processing render request', err)
        return next(new restifyErrors.InternalServerError({ cause: err }, 'Error processing render request'))
    }

    return null
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
    (req, res, next) => renderImage(req.query, res, next)
)

server.post(
    {
        url: '/render',
        validation: {
            content: PARAMS
        }
    },
    (req, res, next) => renderImage(req.body, res, next)
)

server.listen(port, () => {
    console.log('Mapbox GL static rendering server started and listening at %s', server.url)
})
