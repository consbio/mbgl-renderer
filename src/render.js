/* eslint-disable no-new */
import fs from 'fs'
import path from 'path'
// sharp must be before zlib and other imports or sharp gets wrong version of zlib and breaks on some servers
import sharp from 'sharp'
import zlib from 'zlib'
import geoViewport from '@mapbox/geo-viewport'
import mbgl from '@mapbox/mapbox-gl-native'
import MBTiles from '@mapbox/mbtiles'
import webRequest from 'request'

import URL from 'url'

const TILE_REGEXP = RegExp('mbtiles://([^/]+)/(\\d+)/(\\d+)/(\\d+)')
const MBTILES_REGEXP = /mbtiles:\/\/(\S+?)(?=[/"]+)/gi

export const isMapboxURL = url => url.startsWith('mapbox://')
export const isMapboxStyleURL = url => url.startsWith('mapbox://styles/')
const isMBTilesURL = url => url.startsWith('mbtiles://')

// normalize functions derived from: https://github.com/mapbox/mapbox-gl-js/blob/master/src/util/mapbox.js

/**
 * Normalize a Mapbox source URL to a full URL
 * @param {string} url - url to mapbox source in style json, e.g. "url": "mapbox://mapbox.mapbox-streets-v7"
 * @param {string} token - mapbox public token
 */
const normalizeMapboxSourceURL = (url, token) => {
    const urlObject = URL.parse(url)
    urlObject.query = urlObject.query || {}
    urlObject.pathname = `/v4/${url.split('mapbox://')[1]}.json`
    urlObject.protocol = 'https'
    urlObject.host = 'api.mapbox.com'
    urlObject.query.secure = true
    urlObject.query.access_token = token
    return URL.format(urlObject)
}

/**
 * Normalize a Mapbox tile URL to a full URL
 * @param {string} url - url to mapbox tile in style json or resolved from source
 * e.g. mapbox://tiles/mapbox.mapbox-streets-v7/1/0/1.vector.pbf
 * @param {string} token - mapbox public token
 */
const normalizeMapboxTileURL = (url, token) => {
    const urlObject = URL.parse(url)
    urlObject.query = urlObject.query || {}
    urlObject.pathname = `/v4${urlObject.path}`
    urlObject.protocol = 'https'
    urlObject.host = 'a.tiles.mapbox.com'
    urlObject.query.access_token = token
    return URL.format(urlObject)
}

/**
 * Normalize a Mapbox style URL to a full URL
 * @param {string} url - url to mapbox source in style json, e.g. "url": "mapbox://styles/mapbox/streets-v9"
 * @param {string} token - mapbox public token
 */
export const normalizeMapboxStyleURL = (url, token) => {
    const urlObject = URL.parse(url)
    urlObject.query = {
        access_token: token,
        secure: true
    }
    urlObject.pathname = `styles/v1${urlObject.path}`
    urlObject.protocol = 'https'
    urlObject.host = 'api.mapbox.com'
    return URL.format(urlObject)
}

/**
 * Normalize a Mapbox sprite URL to a full URL
 * @param {string} url - url to mapbox sprite, e.g. "url": "mapbox://sprites/mapbox/streets-v9.png"
 * @param {string} token - mapbox public token
 *
 * Returns {string} - url, e.g., "https://api.mapbox.com/styles/v1/mapbox/streets-v9/sprite.png?access_token=<token>"
 */
export const normalizeMapboxSpriteURL = (url, token) => {
    const extMatch = /(.png|.json)$/g.exec(url)
    const urlObject = URL.parse(url.substring(0, extMatch.index))
    urlObject.query = urlObject.query || {}
    urlObject.query.access_token = token
    urlObject.pathname = `/styles/v1${urlObject.path}/sprite${extMatch[1]}`
    urlObject.protocol = 'https'
    urlObject.host = 'api.mapbox.com'
    return URL.format(urlObject)
}

/**
 * Normalize a Mapbox glyph URL to a full URL
 * @param {string} url - url to mapbox sprite, e.g. "url": "mapbox://sprites/mapbox/streets-v9.png"
 * @param {string} token - mapbox public token
 *
 * Returns {string} - url, e.g., "https://api.mapbox.com/styles/v1/mapbox/streets-v9/sprite.png?access_token=<token>"
 */
export const normalizeMapboxGlyphURL = (url, token) => {
    const urlObject = URL.parse(url)
    urlObject.query = urlObject.query || {}
    urlObject.query.access_token = token
    urlObject.pathname = `/fonts/v1${urlObject.path}`
    urlObject.protocol = 'https'
    urlObject.host = 'api.mapbox.com'
    return URL.format(urlObject)
}

/**
 * Very simplistic function that splits out mbtiles service name from the URL
 *
 * @param {String} url - URL to resolve
 */
const resolveNamefromURL = url => url.split('://')[1].split('/')[0]

/**
 * Resolve a URL of a local mbtiles file to a file path
 * Expected to follow this format "mbtiles://<service_name>/*"
 *
 * @param {String} tilePath - path containing mbtiles files
 * @param {String} url - url of a data source in style.json file.
 */
const resolveMBTilesURL = (tilePath, url) => path.format({ dir: tilePath, name: resolveNamefromURL(url), ext: '.mbtiles' })

/**
 * Given a URL to a local mbtiles file, get the TileJSON for that to load correct tiles.
 *
 * @param {String} tilePath - path containing mbtiles files.
 * @param {String} url - url of a data source in style.json file.
 * @param {function} callback - function to call with (err, {data}).
 */
const getLocalTileJSON = (tilePath, url, callback) => {
    const mbtilesFilename = resolveMBTilesURL(tilePath, url)
    const service = resolveNamefromURL(url)

    new MBTiles(mbtilesFilename, (err, mbtiles) => {
        if (err) {
            callback(err)
            return null
        }

        mbtiles.getInfo((infoErr, info) => {
            if (infoErr) {
                callback(infoErr)
                return null
            }

            const {
                minzoom, maxzoom, center, bounds, format
            } = info

            const ext = format === 'pbf' ? '.pbf' : ''

            const tileJSON = {
                tilejson: '1.0.0',
                tiles: [`mbtiles://${service}/{z}/{x}/{y}${ext}`],
                minzoom,
                maxzoom,
                center,
                bounds
            }

            callback(null, { data: Buffer.from(JSON.stringify(tileJSON)) })
            return null
        })

        return null
    })
}

/**
 * Fetch a tile from a local mbtiles file.
 *
 * @param {String} tilePath - path containing mbtiles files.
 * @param {String} url - url of a data source in style.json file.
 * @param {function} callback - function to call with (err, {data}).
 */
const getLocalTile = (tilePath, url, callback) => {
    const matches = url.match(TILE_REGEXP)
    const [z, x, y] = matches.slice(matches.length - 3, matches.length)
    const isVector = path.extname(url) === '.pbf'
    const mbtilesFile = resolveMBTilesURL(tilePath, url)

    new MBTiles(mbtilesFile, (err, mbtiles) => {
        if (err) {
            callback(err)
            return null
        }

        mbtiles.getTile(z, x, y, (tileErr, data) => {
            if (tileErr) {
                // console.log(`error fetching tile: z:${z} x:${x} y:${y} from ${mbtilesFile}\n${tileErr}`)
                callback(null, {})
                return null
            }

            if (isVector) {
                // if the tile is compressed, unzip it (for vector tiles only!)
                zlib.unzip(data, (unzipErr, unzippedData) => {
                    callback(unzipErr, { data: unzippedData })
                })
            } else {
                callback(null, { data })
            }

            return null
        })

        return null
    })
}

/**
 * Fetch a remotely hosted asset: tile, sprite, etc
 *
 * @param {String} url - URL of the asset
 * @param {function} callback - callback to call with (err, {data})
 */
const getRemoteAsset = (url, callback) => {
    webRequest(
        {
            url,
            encoding: null,
            gzip: true
        },
        (err, res, data) => {
            if (err) {
                return callback(err)
            }

            switch (res.statusCode) {
                case 200: {
                    return callback(null, { data })
                }
                case 204: {
                    // No data for this url
                    return callback(null, {})
                }
                default: {
                    // assume error
                    console.log(`Error with request for: ${url}\nstatus: ${res.statusCode}`)
                    return callback(new Error(`Error with request for: ${url}\nstatus: ${res.statusCode}`))
                }
            }
        }
    )
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
 * @param {String} tilePath - path to directory containing local mbtiles files that are
 * referenced from the style.json as "mbtiles://<tileset>"
 */
export const render = (style, width = 1024, height = 1024, options) => new Promise((resolve, reject) => {
    const { bounds = null, token = null } = options
    let { center = null, zoom = null, tilePath = null } = options

    if (!style) {
        throw new Error('style is a required parameter')
    }
    if (!(width && height)) {
        throw new Error('width and height are required parameters and must be non-zero')
    }

    if (center !== null) {
        if (center.length !== 2) {
            throw new Error(`Center must be longitude,latitude.  Invalid value found: ${[...center]}`)
        }

        if (Math.abs(center[0]) > 180) {
            throw new Error(`Center longitude is outside world bounds (-180 to 180 deg): ${center[0]}`)
        }

        if (Math.abs(center[1]) > 90) {
            throw new Error(`Center latitude is outside world bounds (-90 to 90 deg): ${center[1]}`)
        }
    }

    if (zoom !== null && (zoom < 0 || zoom > 22)) {
        throw new Error(`Zoom level is outside supported range (0-22): ${zoom}`)
    }

    if (bounds !== null) {
        if (bounds.length !== 4) {
            throw new Error(`Bounds must be west,south,east,north.  Invalid value found: ${[...bounds]}`)
        }
    }

    // calculate zoom and center from bounds and image dimensions
    if (bounds !== null && (zoom === null || center === null)) {
        const viewport = geoViewport.viewport(bounds, [width, height])
        zoom = Math.max(viewport.zoom - 1, 0)
        /* eslint-disable prefer-destructuring */
        center = viewport.center
    }

    // validate that all local mbtiles referenced in style are
    // present in tilePath and that tilePath is not null
    if (tilePath) {
        tilePath = path.normalize(tilePath)
    }

    const localMbtilesMatches = JSON.stringify(style).match(MBTILES_REGEXP)
    if (localMbtilesMatches && !tilePath) {
        throw new Error('Style has local mbtiles file sources, but no tilePath is set')
    }

    if (localMbtilesMatches) {
        localMbtilesMatches.forEach((name) => {
            const mbtileFilename = path.normalize(
                path.format({ dir: tilePath, name: name.split('://')[1], ext: '.mbtiles' })
            )
            if (!fs.existsSync(mbtileFilename)) {
                throw new Error(
                    `Mbtiles file ${path.format({
                        name,
                        ext: '.mbtiles'
                    })} in style file is not found in: ${tilePath}`
                )
            }
        })
    }

    // Options object for configuring loading of map data sources.
    // Note: could not find a way to make this work with mapbox vector sources and styles!
    const mapOptions = {
        request: (req, callback) => {
            const { url, kind } = req

            const isMapbox = isMapboxURL(url)
            if (isMapbox && !token) {
                throw new Error('ERROR: mapbox access token is required')
            }

            try {
                switch (kind) {
                    case 2: {
                        // source
                        if (isMBTilesURL(url)) {
                            getLocalTileJSON(tilePath, url, callback)
                        } else if (isMapbox) {
                            getRemoteAsset(normalizeMapboxSourceURL(url, token), callback)
                        }
                        // else is not currently handled
                        break
                    }
                    case 3: {
                        // tile
                        if (isMBTilesURL(url)) {
                            getLocalTile(tilePath, url, callback)
                        } else if (isMapbox) {
                            // This seems to be due to a bug in how the mapbox tile JSON is handled within mapbox-gl-native
                            // since it returns fully resolved tiles!
                            getRemoteAsset(normalizeMapboxTileURL(url, token), callback)
                        } else {
                            getRemoteAsset(url, callback)
                        }
                        break
                    }
                    case 4: {
                        // glyph
                        getRemoteAsset(normalizeMapboxGlyphURL(url, token), callback)
                        break
                    }
                    case 5: {
                        // sprite image
                        getRemoteAsset(normalizeMapboxSpriteURL(url, token), callback)
                        break
                    }
                    case 6: {
                        // sprite json
                        getRemoteAsset(normalizeMapboxSpriteURL(url, token), callback)
                        break
                    }
                    default: {
                        // NOT HANDLED!
                        throw new Error(`ERROR: Request kind not handled: ${kind}`)
                    }
                }
            } catch (err) {
                console.error('Error while making tile request: %j', err)
                callback(err)
            }
        }
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
            // if (err) throw err
            if (err) {
                console.error('Error rendering map: %j', err)
                return reject(err)
            }

            // Convert raw image buffer to PNG
            try {
                return sharp(buffer, { raw: { width, height, channels: 4 } })
                    .png()
                    .toBuffer()
                    .then(resolve)
                    .catch(reject)
            } catch (pngErr) {
                console.error('Error encoding PNG: %j', pngErr)
                return reject(err)
            }
        }
    )
})

export default render
