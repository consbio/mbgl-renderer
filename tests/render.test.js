import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import pixelmatch from 'pixelmatch'
import render from '../src/render'
import style from './fixtures/example-style.json'
import mbtilesSourceStyle from './fixtures/example-style-mbtiles-source.json'
import mbtilesTilesStyle from './fixtures/example-style-mbtiles-tiles.json'

test('creates correct image width and height', () => render(style, 512, 256, {
    zoom: 10,
    center: [-79.86, 32.68]
}).then((data) => {
    // feed it back through sharp to verify that we got an image
    sharp(data).metadata((_, info) => {
        expect(info.format).toBe('png')
        expect(info.width).toBe(512)
        expect(info.height).toBe(256)
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
    sharp(data).metadata((err, info) => {
        expect(info.format).toBe('png')
        expect(info.width).toBe(512)
        expect(info.height).toBe(256)
    })
}))

test('resolves local mbtiles from source', () => render(mbtilesSourceStyle, 512, 512, {
    zoom: 1,
    center: [0, 0],
    tilePath: path.join(__dirname, './fixtures/')
}).then((data) => {
    // feed it back through sharp to verify that we got an image
    sharp(data).metadata((_, info) => {
        expect(info.format).toBe('png')
        expect(info.width).toBe(512)
        expect(info.height).toBe(512)
        // TODO: must be non-blank
    })

    // to write out known good image:
    fs.writeFileSync(path.join(__dirname, './fixtures/expected-mbtiles-source.png'), data)
}))

test('resolves local mbtiles from tiles', () => render(mbtilesTilesStyle, 512, 512, {
    zoom: 1,
    center: [0, 0],
    tilePath: path.join(__dirname, './fixtures/')
}).then((data) => {
    // feed it back through sharp to verify that we got an image
    sharp(data).metadata((_, info) => {
        expect(info.format).toBe('png')
        expect(info.width).toBe(512)
        expect(info.height).toBe(512)
    })

    // to write out known good image:
    fs.writeFileSync(path.join(__dirname, './fixtures/expected-mbtiles-tiles.png'), data)
}))
