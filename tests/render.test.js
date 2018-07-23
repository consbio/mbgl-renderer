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

console.log(JSON.stringify(style))

test('creates correct image width and height', () => render(style, 512, 256, {
    zoom: 10,
    center: [-79.86, 32.68]
}).then((data) => {
    // feed it back through sharp to verify that we got an image
    sharp(data).metadata((_, { format, width, height }) => {
        expect(format).toBe('png')
        expect(width).toBe(512)
        expect(height).toBe(256)
    })
}))

test('outputs correct image', () => render(style, 512, 256, {
    zoom: 10,
    center: [-79.86, 32.68]
}).then((data) => {
    const expectedPath = path.join(__dirname, './fixtures/expected.png')
    // to write out known good image:
    // fs.writeFileSync(expectedPath, data)

    sharp(expectedPath).toBuffer((_, expected) => {
        const diffPixels = pixelmatch(data, expected, null, 512, 256)
        expect(diffPixels).toBe(0)
    })
}))

test('creates image using bounds', () => render(style, 512, 256, {
    zoom: null,
    center: null,
    bounds: [-80.23, 32.678, -79.73, 32.891]
}).then((data) => {
    // feed it back through sharp to verify that we got an image
    sharp(data).metadata((err, { format, width, height }) => {
        expect(format).toBe('png')
        expect(width).toBe(512)
        expect(height).toBe(256)
    })
}))

test('resolves local mbtiles from raster source', () => render(mbtilesSourceStyle, 512, 512, {
    zoom: 1,
    center: [0, 0],
    tilePath: path.join(__dirname, './fixtures/')
}).then((data) => {
    // feed it back through sharp to verify that we got an image
    sharp(data)
        .metadata((_, { format, width, height }) => {
            expect(format).toBe('png')
            expect(width).toBe(512)
            expect(height).toBe(512)
        })
        .stats((_, { channels }) => {
            expect(channels[0].squaresSum).toBeGreaterThan(0)
        })

        // to write out known good image:
        // fs.writeFileSync(path.join(__dirname, './fixtures/expected-mbtiles-source.png'), data)
}))

test('resolves local mbtiles from vector source', () => render(mbtilesSourceVectorStyle, 512, 512, {
    zoom: 0,
    center: [0, 0],
    tilePath: path.join(__dirname, './fixtures/')
}).then((data) => {
    // feed it back through sharp to verify that we got an image
    sharp(data)
        .metadata((_, { format, width, height }) => {
            expect(format).toBe('png')
            expect(width).toBe(512)
            expect(height).toBe(512)
        })
        .stats((_, { channels }) => {
            expect(channels[0].squaresSum).toBeGreaterThan(0)
        })

        // to write out known good image:
        // fs.writeFileSync(path.join(__dirname, './fixtures/expected-mbtiles-source-vector.png'), data)
}))

test('resolves local mbtiles from tiles', () => render(mbtilesTilesStyle, 512, 512, {
    zoom: 1,
    center: [0, 0],
    tilePath: path.join(__dirname, './fixtures/')
}).then((data) => {
    // feed it back through sharp to verify that we got an image
    sharp(data)
        .metadata((_, { format, width, height }) => {
            expect(format).toBe('png')
            expect(width).toBe(512)
            expect(height).toBe(512)
        })
        .stats((_, { channels }) => {
            expect(channels[0].squaresSum).toBeGreaterThan(0)
        })

        // to write out known good image:
        // fs.writeFileSync(path.join(__dirname, './fixtures/expected-mbtiles-tiles.png'), data)
}))

test('resolves local mbtiles from vector tiles', () => render(mbtilesTilesVectorStyle, 512, 512, {
    zoom: 0,
    center: [0, 0],
    tilePath: path.join(__dirname, './fixtures/')
}).then((data) => {
    // feed it back through sharp to verify that we got an image
    sharp(data)
        .metadata((_, { format, width, height }) => {
            expect(format).toBe('png')
            expect(width).toBe(512)
            expect(height).toBe(512)
        })
        .stats((_, { channels }) => {
            expect(channels[0].squaresSum).toBeGreaterThan(0)
        })

        // to write out known good image:
        // fs.writeFileSync(path.join(__dirname, './fixtures/expected-mbtiles-tiles-vector.png'), data)
}))
