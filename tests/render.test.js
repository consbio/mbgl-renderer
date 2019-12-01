import fs from 'fs'
import dotenv from 'dotenv-flow'
import path from 'path'
import sharp from 'sharp'
import { render } from '../src/render'
import mbtilesSourceStyle from './fixtures/example-style-mbtiles-source.json'
import mbtilesSourceVectorStyle from './fixtures/example-style-mbtiles-source-vector.json'
import mbtilesTilesStyle from './fixtures/example-style-mbtiles-tiles.json'
import mbtilesTilesVectorStyle from './fixtures/example-style-mbtiles-tiles-vector.json'
import mapboxSourceStyle from './fixtures/example-style-mapbox-source.json'
import badSourceStyle from './fixtures/example-style-bad-source.json'
import mbtilesMissingSourceStyle from './fixtures/example-style-mbtiles-missing-source.json'
import geojsonSourceStyle from './fixtures/example-style-geojson.json'
import { imageDiff, skipIf } from './util'

// Load MAPBOX_API_TOKEN from .env.test
dotenv.config()
const { MAPBOX_API_TOKEN } = process.env

if (!MAPBOX_API_TOKEN) {
    console.warn(
        'MAPBOX_API_TOKEN environment variable is missing; tests that require this token will be skipped'
    )
}

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
    fs.writeFileSync(expectedPath, data)

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
    fs.writeFileSync(expectedPath, data)

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
    expect(diffPixels).toBeLessThan(100)
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
    ).rejects.toThrowError(/Error with request/)
})

/** Tests that require a valid Mapbox token
 *
 * These will be skipped if MAPBOX_API_TOKEN is missing
 * and will fail if the token is not valid for a request
 * from the test machine.
 */

const testMapbox = skipIf(!MAPBOX_API_TOKEN)

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
