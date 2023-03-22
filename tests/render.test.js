import fs from 'fs'
import dotenv from 'dotenv-flow'
import path from 'path'
import sharp from 'sharp'
import { render } from '../src/render'
import emptyStyle from './fixtures/example-style-empty.json'
import mbtilesSourceStyle from './fixtures/example-style-mbtiles-source.json'
import mbtilesSourceVectorStyle from './fixtures/example-style-mbtiles-source-vector.json'
import mbtilesTilesStyle from './fixtures/example-style-mbtiles-tiles.json'
import mbtilesTilesVectorStyle from './fixtures/example-style-mbtiles-tiles-vector.json'
import mapboxSourceStyle from './fixtures/example-style-mapbox-source.json'
import badSourceStyle from './fixtures/example-style-bad-source.json'
import mbtilesMissingSourceStyle from './fixtures/example-style-mbtiles-missing-source.json'
import geojsonSourceStyle from './fixtures/example-style-geojson.json'
import geojsonLabelSourceStyle from './fixtures/example-style-geojson-labels.json'
import badGlyphSourceStyle from './fixtures/example-style-bad-glyphs.json'
import imageSourceStyle from './fixtures/example-style-image-source.json'
import base64IconImageStyle from './fixtures/example-style-image-base64-icons.json'
import remoteIconImageStyle from './fixtures/example-style-image-remote-icons.json'
import base64ImageIcons from './fixtures/example-images-base64.json'
import remoteImageIcons from './fixtures/example-images-remote.json'
import { imageDiff, skipIf } from './util'

// Load MAPBOX_API_TOKEN from .env.test
dotenv.config()
const { MAPBOX_API_TOKEN } = process.env

if (!MAPBOX_API_TOKEN) {
    console.warn(
        'MAPBOX_API_TOKEN environment variable is missing; tests that require this token will be skipped'
    )
}

const testMapbox = skipIf(!MAPBOX_API_TOKEN)

test('renders empty style', async () => {
    const data = await render(emptyStyle, 100, 100, {
        zoom: 0,
        center: [0, 0],
    })

    // feed it back through sharp to verify that we got an image
    const { format, width, height } = await sharp(data).metadata()
    expect(format).toBe('png')
    expect(width).toBe(100)
    expect(height).toBe(100)
})

test('creates image with correct format and dimensions', async () => {
    const data = await render(mbtilesTilesStyle, 512, 256, {
        zoom: 1,
        center: [0, 0],
        tilePath: path.join(__dirname, './fixtures/'),
    })

    // feed it back through sharp to verify that we got an image
    const { format, width, height } = await sharp(data).metadata()
    expect(format).toBe('png')
    expect(width).toBe(512)
    expect(height).toBe(256)

    const expectedPath = path.join(__dirname, './fixtures/expected.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('creates image using bounds', async () => {
    const data = await render(mbtilesTilesVectorStyle, 512, 512, {
        zoom: null,
        center: null,
        bounds: [-163.370476, 4.852207, -15.714226, 64.255036],
        tilePath: path.join(__dirname, './fixtures/'),
    })

    const expectedPath = path.join(__dirname, './fixtures/expected-bounds.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('creates image using padding', async () => {
    // No padding
    let data = await render(geojsonSourceStyle, 100, 100, {
        zoom: null,
        center: null,
        bounds: [-125, 37.5, -115, 42.5],
        padding: 0,
        tilePath: path.join(__dirname, './fixtures/'),
    })

    let expectedPath = path.join(
        __dirname,
        './fixtures/expected-no-padding.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    let diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)

    data = await render(geojsonSourceStyle, 100, 100, {
        zoom: null,
        center: null,
        bounds: [-125, 37.5, -115, 42.5],
        padding: 25,
        tilePath: path.join(__dirname, './fixtures/'),
    })

    expectedPath = path.join(__dirname, './fixtures/expected-padding25px.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)

    data = await render(geojsonSourceStyle, 100, 100, {
        zoom: null,
        center: null,
        bounds: [-125, 37.5, -115, 42.5],
        padding: -25,
        tilePath: path.join(__dirname, './fixtures/'),
    })

    expectedPath = path.join(__dirname, './fixtures/expected-padding-25px.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails with invalid padding', async () => {
    // Padding must be less than width / 2 and height / 2
    await expect(
        render(geojsonSourceStyle, 100, 200, {
            zoom: null,
            center: null,
            bounds: [-125, 37.5, -115, 42.5],
            padding: 50,
        })
    ).rejects.toThrowError(/Padding must be less than width \/ 2/)

    await expect(
        render(geojsonSourceStyle, 200, 100, {
            zoom: null,
            center: null,
            bounds: [-125, 37.5, -115, 42.5],
            padding: 50,
        })
    ).rejects.toThrowError(/Padding must be less than height \/ 2/)

    // should fail if padding is negative by too much amount as well
    await expect(
        render(geojsonSourceStyle, 100, 200, {
            zoom: null,
            center: null,
            bounds: [-125, 37.5, -115, 42.5],
            padding: -50,
        })
    ).rejects.toThrowError(/Padding must be less than width \/ 2/)

    await expect(
        render(geojsonSourceStyle, 200, 100, {
            zoom: null,
            center: null,
            bounds: [-125, 37.5, -115, 42.5],
            padding: -50,
        })
    ).rejects.toThrowError(/Padding must be less than height \/ 2/)
})

test('resolves local mbtiles from raster source', async () => {
    const data = await render(mbtilesSourceStyle, 512, 512, {
        zoom: 1,
        center: [0, 0],
        tilePath: path.join(__dirname, './fixtures/'),
    })

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mbtiles-source.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails when local mbtiles path is missing', async () => {
    await expect(
        render(mbtilesSourceStyle, 10, 10, {
            zoom: 0,
            center: [0, 0],
        })
    ).rejects.toThrowError(/no tilePath is set/)
})

test('fails when local mbtiles source file is missing', async () => {
    await expect(
        render(mbtilesMissingSourceStyle, 10, 10, {
            zoom: 0,
            center: [0, 0],
            tilePath: path.join(__dirname, './fixtures/'),
        })
    ).rejects.toThrowError(/mbtiles in style file is not found/)
})

test('resolves local mbtiles from vector source', async () => {
    const data = await render(mbtilesSourceVectorStyle, 512, 512, {
        zoom: 0,
        center: [0, 0],
        tilePath: path.join(__dirname, './fixtures/'),
    })

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mbtiles-source-vector.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(150)
})

test('resolves local mbtiles from tiles', async () => {
    const data = await render(mbtilesTilesStyle, 512, 512, {
        zoom: 1,
        center: [0, 0],
        tilePath: path.join(__dirname, './fixtures/'),
    })
    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mbtiles-tiles.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('resolves local mbtiles from vector tiles', async () => {
    const data = await render(mbtilesTilesVectorStyle, 512, 512, {
        zoom: 0,
        center: [0, 0],
        tilePath: path.join(__dirname, './fixtures/'),
    })

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mbtiles-tiles-vector.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('renders with nonzero pitch', async () => {
    const data = await render(mbtilesTilesStyle, 512, 512, {
        zoom: 1,
        center: [0, 0],
        pitch: 60,
        tilePath: path.join(__dirname, './fixtures/'),
    })

    const expectedPath = path.join(__dirname, './fixtures/expected-pitch60.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('renders with nonzero bearing', async () => {
    const data = await render(mbtilesTilesStyle, 512, 512, {
        zoom: 1,
        center: [0, 0],
        bearing: 90,
        tilePath: path.join(__dirname, './fixtures/'),
    })

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-bearing90.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails on invalid mapbox token', async () => {
    await expect(
        render(mapboxSourceStyle, 512, 512, {
            zoom: 0,
            center: [0, 0],
            token: 'badtoken',
        })
    ).rejects.toThrowError(/request for remote asset failed/)
})

/** Tests that require a valid Mapbox token
 *
 * These will be skipped if MAPBOX_API_TOKEN is missing
 * and will fail if the token is not valid for a request
 * from the test machine.
 */

testMapbox('resolves from mapbox source', async () => {
    const data = await render(mapboxSourceStyle, 512, 512, {
        zoom: 0,
        center: [0, 0],
        token: MAPBOX_API_TOKEN,
    })

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mapbox-source.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

testMapbox('resolves from mapbox source with ratio', async () => {
    const data = await render(mapboxSourceStyle, 512, 512, {
        zoom: 0,
        ratio: 2,
        center: [0, 0],
        token: MAPBOX_API_TOKEN,
    })

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mapbox-source@2x.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('gracefully handles missing tiles', async () => {
    const data = await render(badSourceStyle, 100, 100, {
        zoom: null,
        center: null,
        bounds: [-79.98, 32.64, -79.84, 32.79],
        tilePath: path.join(__dirname, './fixtures/'),
    })

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-bad-source.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

testMapbox('creates image using geojson labels', async () => {
    const data = await render(geojsonLabelSourceStyle, 100, 100, {
        zoom: null,
        center: null,
        bounds: [-125, 37.5, -115, 42.5],
        token: MAPBOX_API_TOKEN, // only required for mapbox hosted glyphs
    })

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-geojson-label.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails with missing glyphs', async () => {
    await expect(
        render(badGlyphSourceStyle, 100, 100, {
            zoom: null,
            center: null,
            bounds: [-125, 37.5, -115, 42.5],
        })
    ).rejects.toThrowError(/request for remote asset failed/)
})

test('creates image from image source', async () => {
    const data = await render(imageSourceStyle, 512, 512, {
        zoom: 0,
        center: [0, 0],
        ratio: 0.5, // we have to use 512 x 512 and 0.5 ratio to fetch first world tile
    })

    // feed it back through sharp to verify that we got an image
    const { format, width, height } = await sharp(data).metadata()
    expect(format).toBe('png')
    expect(width).toBe(256)
    expect(height).toBe(256)

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-image-source.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('creates image from base64 image icons', async () => {
    const data = await render(base64IconImageStyle, 256, 256, {
        zoom: 0,
        center: [0, 0],
        images: base64ImageIcons,
    })

    // feed it back through sharp to verify that we got an image
    const { format, width, height } = await sharp(data).metadata()
    expect(format).toBe('png')
    expect(width).toBe(256)
    expect(height).toBe(256)

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-image-base64-icons.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('creates image from remote image icons', async () => {
    const data = await render(remoteIconImageStyle, 256, 256, {
        zoom: 0,
        center: [0, 0],
        images: remoteImageIcons,
    })

    // feed it back through sharp to verify that we got an image
    const { format, width, height } = await sharp(data).metadata()
    expect(format).toBe('png')
    expect(width).toBe(256)
    expect(height).toBe(256)

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-image-remote-icons.png'
    )
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails to create image from bad image icon urls', async () => {
    await expect(
        render(base64IconImageStyle, 256, 256, {
            zoom: 0,
            center: [0, 0],
            images: {
                foo: 'bar',
            },
        })
    ).rejects.toThrowError(/Invalid url for image/)

    await expect(
        render(base64IconImageStyle, 256, 256, {
            zoom: 0,
            center: [0, 0],
            images: {
                foo: { url: 'bar' },
            },
        })
    ).rejects.toThrowError(/Invalid URI/)

    await expect(
        render(remoteIconImageStyle, 256, 256, {
            zoom: 0,
            center: [0, 0],
            images: {
                cat: { url: 'https://google.com' },
            },
        })
    ).rejects.toThrowError(/Error loading icon image/)
})
