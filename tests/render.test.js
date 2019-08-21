import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import pixelmatch from 'pixelmatch'
import render from '../src/render'
import style from './fixtures/example-style.json'
import mbtilesSourceStyle from './fixtures/example-style-mbtiles-source.json'
import mbtilesSourceVectorStyle from './fixtures/example-style-mbtiles-source-vector.json'
import mbtilesTilesStyle from './fixtures/example-style-mbtiles-tiles.json'
import mbtilesTilesVectorStyle from './fixtures/example-style-mbtiles-tiles-vector.json'
import mapboxSourceStyle from './fixtures/example-style-mapbox-source.json'
/**
 * Uses `pixelmatch` to calculate the number of pixels that are different between
 * the PNG data produced by `render` and the data in the expected PNG file.
 *
 * @param {Buffer} pngData - buffer of PNG data produced by render function
 * @param {String} expectedPath - path to PNG file of expected data from test suite
 *
 * Returns {Number} - count of pixels that are different between the 2 images.
 */
async function imageDiff(pngData, expectedPath) {
    const pngImage = await sharp(pngData)
    const { width, height } = await pngImage.metadata()

    // Convert the pixels to raw byte buffer
    const rawData = await pngImage.raw().toBuffer()

    // read the expected data and convert to raw byte buffer
    const expected = await sharp(expectedPath)
        .raw()
        .toBuffer()

    return pixelmatch(rawData, expected, null, width, height)
}

test('creates correct image width and height', async () => {
    const data = await render(style, 512, 256, {
        zoom: 10,
        center: [-79.86, 32.68]
    })

    // feed it back through sharp to verify that we got an image
    const { format, width, height } = await sharp(data).metadata()
    expect(format).toBe('png')
    expect(width).toBe(512)
    expect(height).toBe(256)
})

test('outputs correct image', async () => {
    const data = await render(style, 512, 256, {
        zoom: 10,
        center: [-79.86, 32.68]
    })

    const expectedPath = path.join(__dirname, './fixtures/expected.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBe(0)
})

test('creates image using bounds', async () => {
    const data = await render(style, 512, 256, {
        zoom: null,
        center: null,
        bounds: [-80.23, 32.678, -79.73, 32.891]
    })

    const expectedPath = path.join(__dirname, './fixtures/expected-bounds.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBe(0)
})

test('resolves local mbtiles from raster source', async () => {
    const data = await render(mbtilesSourceStyle, 512, 512, {
        zoom: 1,
        center: [0, 0],
        tilePath: path.join(__dirname, './fixtures/')
    })

    const expectedPath = path.join(__dirname, './fixtures/expected-mbtiles-source.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBe(0)
})

test('resolves local mbtiles from vector source', async () => {
    const data = await render(mbtilesSourceVectorStyle, 512, 512, {
        zoom: 0,
        center: [0, 0],
        tilePath: path.join(__dirname, './fixtures/')
    })

    const expectedPath = path.join(__dirname, './fixtures/expected-mbtiles-source-vector.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBe(0)
})

test('resolves local mbtiles from tiles', async () => {
    const data = await render(mbtilesTilesStyle, 512, 512, {
        zoom: 1,
        center: [0, 0],
        tilePath: path.join(__dirname, './fixtures/')
    })
    const expectedPath = path.join(__dirname, './fixtures/expected-mbtiles-tiles.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBe(0)
})

test('resolves local mbtiles from vector tiles', async () => {
    const data = await render(mbtilesTilesVectorStyle, 512, 512, {
        zoom: 0,
        center: [0, 0],
        tilePath: path.join(__dirname, './fixtures/')
    })

    const expectedPath = path.join(__dirname, './fixtures/expected-mbtiles-tiles-vector.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBe(0)
})

test('resolves from mapbox source', async () => {
    const data = await render(mapboxSourceStyle, 512, 512, {
        zoom: 0,
        center: [0, 0],
        token: 'pk.eyJ1IjoiYmN3YXJkIiwiYSI6InJ5NzUxQzAifQ.CVyzbyOpnStfYUQ_6r8AgQ' // mapbox docs token
    })

    const expectedPath = path.join(__dirname, './fixtures/expected-mapbox-source.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBe(0)
})

test('resolves from mapbox source with ratio', async () => {
    const data = await render(mapboxSourceStyle, 512, 512, {
        zoom: 0,
        ratio: 2,
        center: [0, 0],
        token: 'pk.eyJ1IjoiYmN3YXJkIiwiYSI6InJ5NzUxQzAifQ.CVyzbyOpnStfYUQ_6r8AgQ' // mapbox docs token
    })

    const expectedPath = path.join(__dirname, './fixtures/expected-mapbox-source@2x.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    const diffPixels = await imageDiff(data, expectedPath)
    expect(diffPixels).toBe(0)
})
