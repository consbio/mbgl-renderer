import geoViewport from '@mapbox/geo-viewport'
import mbgl from '@mapbox/mapbox-gl-native'
import webRequest from 'request'
import sharp from 'sharp'

/**
 * Options object for configuring loading of map data sources.
 * Note: could not find a way to make this work with mapbox vector sources and styles!
 */
const mapOptions = {
    request: (req, callback) => {
        const { url } = req
        // console.log('tile:', url)
        webRequest(
            {
                url,
                encoding: null,
                gzip: true
            },
            (err, res, body) => {
                if (err) {
                    callback(err)
                } else if (res.statusCode === 200) {
                    const response = {}

                    if (res.headers.modified) {
                        response.modified = new Date(res.headers.modified)
                    }
                    if (res.headers.expires) {
                        response.expires = new Date(res.headers.expires)
                    }
                    if (res.headers.etag) {
                        response.etag = res.headers.etag
                    }

                    response.data = body

                    callback(null, response)
                } else {
                    callback(new Error(JSON.parse(body).message))
                }
            }
        )
    }
}

/**
 * Render a map using Mapbox GL, based on layers specified in style.
 * Returns a Promise with the PNG image data as its first parameter for the map image.
 * If zoom and center are not provided, bounds must be provided
 * and will be used to calculate center and zoom based on image dimensions.
 *
 * @param {Object} style - Mapbox GL style object
 * @param {number} width - width of output map (default: 1024)
 * @param {number} height - height of output map (default: 1024)
 * @param {Object} - configuration object containing style, zoom, center: [lng, lat],
 * width, height, bounds: [west, south, east, north]
 */
const render = (style, width = 1024, height = 1024, options) => new Promise((resolve) => {
    const { bounds = null } = options
    let { center, zoom } = options

    if (!style) {
        throw new Error('style is a required parameter')
    }
    if (!(width && height)) {
        throw new Error('width and height are required parameters')
    }

    // TODO: validate center, zoom, bounds

    // calculate zoom and center from bounds and image dimensions
    if (bounds !== null && (zoom === null || center === null)) {
        const viewport = geoViewport.viewport(bounds, [width, height])
        zoom = Math.max(viewport.zoom - 1, 0)
        /* eslint-disable prefer-destructuring */
        center = viewport.center
    }

    const map = new mbgl.Map(mapOptions)
    map.load(style)

    map.render(
        {
            zoom,
            center,
            height,
            width
        },
        (err, buffer) => {
            if (err) throw err

            // Convert raw image buffer to PNG
            return sharp(buffer, { raw: { width, height, channels: 4 } })
                .png()
                .toBuffer()
                .then(resolve)
        }
    )
})

export default render
