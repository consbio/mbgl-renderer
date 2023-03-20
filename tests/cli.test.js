import fs from 'fs'
import path from 'path'

import dotenv from 'dotenv-flow'
import sharp from 'sharp'
import { createTempDir } from 'jest-fixtures'

import { imageDiff, cliEndpoint, skipIf } from './util'

import { version } from '../package.json'

// Load MAPBOX_API_TOKEN from .env.test
dotenv.config()
const { MAPBOX_API_TOKEN } = process.env

if (!MAPBOX_API_TOKEN) {
    console.warn(
        'MAPBOX_API_TOKEN environment variable is missing; tests that require this token will be skipped'
    )
}

const cli = cliEndpoint('./dist/cli')

test('returns correct version', async () => {
    const { stdout } = await cli(['-V'], '.')
    expect(stdout).toContain(version)
})

test('fails without required parameters', async () => {
    let result = await cli([], '.')
    expect(result.stderr).toContain('ERROR: style is a required parameter')

    result = await cli(['tests/fixtures/example-style.json'], '.')
    expect(result.stderr).toContain(
        'ERROR: output image filename is a required parameter'
    )

    result = await cli(['tests/fixtures/example-style.json', 'test.png'], '.')
    expect(result.stderr).toContain('ERROR: width is a required parameter')

    result = await cli(
        ['tests/fixtures/example-style.json', 'test.png', '512'],
        '.'
    )
    expect(result.stderr).toContain('ERROR: height is a required parameter')
})

test('creates image with default parameters', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const result = await cli(
        ['tests/fixtures/example-style.json', filePath, '512', '256'],
        '.'
    )

    expect(result.stdout).toContain('-------- Export Mapbox GL Map --------')
    expect(result.stdout).toContain(filePath)
    expect(fs.existsSync(filePath)).toBeTruthy()

    // feed it back through sharp to verify that we got an image
    const { format, width, height } = await sharp(filePath).metadata()
    expect(format).toBe('png')
    expect(width).toBe(512)
    expect(height).toBe(256)
})

test('creates correct image', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
            filePath,
            '512',
            '256',
            '-z',
            1,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './fixtures/'),
        ],
        '.'
    )

    const expectedPath = path.join(__dirname, './fixtures/expected.png')

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails with invalid tile path', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const { stderr } = await cli(
        [
            path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
            filePath,
            '512',
            '256',
            '-z',
            1,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './bad-tile-path/'),
        ],
        '.'
    )

    expect(stderr).toContain('ERROR: Path to mbtiles files does not exist')
})

test('fails with invalid dimensions', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const params = [
        path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
        filePath,
    ]
    const options = [
        '-z',
        1,
        '-c',
        '0,0',
        '-t',
        path.join(__dirname, './bad-tile-path/'),
    ]

    let result = await cli([...params, '0', '256', ...options], '.')

    expect(result.stderr).toContain(
        'ERROR: Width and height must be greater than 0, they are width:0 height:256'
    )

    result = await cli([...params, '256', '0', ...options], '.')

    expect(result.stderr).toContain(
        'ERROR: Width and height must be greater than 0, they are width:256 height:0'
    )
})

test('fails with invalid zoom', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const { stderr } = await cli(
        [
            path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
            filePath,
            '512',
            '256',
            '-z',
            -1,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './bad-tile-path/'),
        ],
        '.'
    )

    expect(stderr).toContain(
        'ERROR: Zoom level is outside supported range (0-22): -1'
    )
})

test('fails with invalid center', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const params = [
        path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
        filePath,
        '512',
        '256',
        '-z',
        1,
        '-t',
        path.join(__dirname, './bad-tile-path/'),
    ]

    let result = await cli([...params, '-c', '-181,0'], '.')

    expect(result.stderr).toContain(
        'ERROR: Center longitude is outside world bounds (-180 to 180 deg): -181'
    )

    result = await cli([...params, '-c', '0,-91'], '.')

    expect(result.stderr).toContain(
        'ERROR: Center latitude is outside world bounds (-90 to 90 deg): -91'
    )
})

test('creates image using bounds', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(
                __dirname,
                './fixtures/example-style-mbtiles-tiles-vector.json'
            ),
            filePath,
            '512',
            '512',
            '-b',
            '-163.370476,4.852207,-15.714226,64.255036',
            '-t',
            path.join(__dirname, './fixtures/'),
        ],
        '.'
    )

    const expectedPath = path.join(__dirname, './fixtures/expected-bounds.png')

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails with invalid bounds', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const params = [
        path.join(
            __dirname,
            './fixtures/example-style-mbtiles-tiles-vector.json'
        ),
        filePath,
        '512',
        '512',
        '-t',
        path.join(__dirname, './fixtures/'),
    ]

    let result = await cli([...params, '-b', '0,-10,0,10'], '.')
    expect(result.stderr).toContain(
        'ERROR: Bounds west and east coordinate are the same value'
    )

    result = await cli([...params, '-b', '-10,0,10,0'], '.')
    expect(result.stderr).toContain(
        'ERROR: Bounds south and north coordinate are the same value'
    )

    result = await cli([...params, '-b', '-Infinity,0,10,0'], '.')
    expect(result.stderr).toContain(
        'ERROR: Bounds must be valid floating point values.'
    )
})

test('creates image using padding', async () => {
    const tmpDir = await createTempDir()

    // 0 px padding
    let filePath = path.join(tmpDir, 'test0px.png')
    await cli(
        [
            path.join(__dirname, './fixtures/example-style-geojson.json'),
            filePath,
            '100',
            '100',
            '-b',
            '-125,37.5,-115,42.5',
            '--padding',
            '0',
        ],
        '.'
    )

    let expectedPath = path.join(
        __dirname,
        './fixtures/expected-no-padding.png'
    )

    let diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)

    // 25 px padding
    filePath = path.join(tmpDir, 'test25px.png')
    await cli(
        [
            path.join(__dirname, './fixtures/example-style-geojson.json'),
            filePath,
            '100',
            '100',
            '-b',
            '-125,37.5,-115,42.5',
            '--padding',
            '25',
        ],
        '.'
    )

    expectedPath = path.join(__dirname, './fixtures/expected-padding25px.png')

    diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)

    // -25 px padding
    filePath = path.join(tmpDir, 'test-25px.png')
    await cli(
        [
            path.join(__dirname, './fixtures/example-style-geojson.json'),
            filePath,
            '100',
            '100',
            '-b',
            '-125,37.5,-115,42.5',
            '--padding',
            '-25',
        ],
        '.'
    )

    expectedPath = path.join(__dirname, './fixtures/expected-padding-25px.png')

    diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails with invalid padding', async () => {
    // padding will fail if values are too big for image dimensions
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const params = [
        path.join(__dirname, './fixtures/example-style-geojson.json'),
        filePath,
    ]

    const boundsOption = ['-b', '-125,37.5,-115,42.5']

    let result = await cli(
        [...params, '100', '200', ...boundsOption, '--padding', '50'],
        '.'
    )
    expect(result.stderr).toContain('Padding must be less than width / 2')

    result = await cli(
        [...params, '200', '100', ...boundsOption, '--padding', '50'],
        '.'
    )
    expect(result.stderr).toContain('Padding must be less than height / 2')

    // negative padding values should fail if too big
    result = await cli(
        [...params, '100', '200', ...boundsOption, '--padding', '-50'],
        '.'
    )
    expect(result.stderr).toContain('Padding must be less than width / 2')

    result = await cli(
        [...params, '200', '100', ...boundsOption, '--padding', '-50'],
        '.'
    )
    expect(result.stderr).toContain('Padding must be less than height / 2')
})

test('resolves local mbtiles from raster source', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(
                __dirname,
                './fixtures/example-style-mbtiles-source.json'
            ),
            filePath,
            '512',
            '512',
            '-z',
            1,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './fixtures/'),
        ],
        '.'
    )

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mbtiles-source.png'
    )

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(150)
})

test('resolves local mbtiles from vector source', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(
                __dirname,
                './fixtures/example-style-mbtiles-source-vector.json'
            ),
            filePath,
            '512',
            '512',
            '-z',
            0,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './fixtures/'),
        ],
        '.'
    )

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mbtiles-source-vector.png'
    )

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(150)
})

test('resolves local mbtiles from tiles', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
            filePath,
            '512',
            '512',
            '-z',
            1,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './fixtures/'),
        ],
        '.'
    )

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mbtiles-tiles.png'
    )

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('resolves local mbtiles from vector tiles', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(
                __dirname,
                './fixtures/example-style-mbtiles-tiles-vector.json'
            ),
            filePath,
            '512',
            '512',
            '-z',
            0,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './fixtures/'),
        ],
        '.'
    )

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mbtiles-tiles-vector.png'
    )

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails on missing mapbox token', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const { stderr } = await cli(
        [
            path.join(__dirname, './fixtures/example-style-mapbox-source.json'),
            filePath,
            '512',
            '512',
            '-z',
            0,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './fixtures/'),
        ],
        '.'
    )

    expect(stderr).toContain('ERROR: mapbox access token is required')
})

test('fails on invalid mapbox token', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const { stderr } = await cli(
        [
            path.join(__dirname, './fixtures/example-style-mapbox-source.json'),
            filePath,
            '512',
            '512',
            '-z',
            0,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './fixtures/'),
            '--token',
            'badtoken',
        ],
        '.'
    )

    expect(stderr).toContain('Error: Error with request')
})

test('renders with nonzero pitch', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
            filePath,
            '512',
            '512',
            '-z',
            1,
            '-c',
            '0,0',
            '--pitch',
            60,
            '-t',
            path.join(__dirname, './fixtures/'),
        ],
        '.'
    )

    const expectedPath = path.join(__dirname, './fixtures/expected-pitch60.png')

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails with invalid pitch', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const params = [
        path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
        filePath,
        '512',
        '512',
        '-z',
        1,
        '-c',
        '0,0',
        '-t',
        path.join(__dirname, './fixtures/'),
    ]

    let result = await cli([...params, '--pitch', -1], '.')
    expect(result.stderr).toContain(
        'ERROR: Pitch is outside supported range (0-60): -1'
    )

    result = await cli([...params, '--pitch', 61], '.')
    expect(result.stderr).toContain(
        'ERROR: Pitch is outside supported range (0-60): 61'
    )
})

test('renders with nonzero bearing', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
            filePath,
            '512',
            '512',
            '-z',
            1,
            '-c',
            '0,0',
            '--bearing',
            90,
            '-t',
            path.join(__dirname, './fixtures/'),
        ],
        '.'
    )

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-bearing90.png'
    )

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

test('fails with invalid bearing', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    const params = [
        path.join(__dirname, './fixtures/example-style-mbtiles-tiles.json'),
        filePath,
        '512',
        '512',
        '-z',
        1,
        '-c',
        '0,0',
        '-t',
        path.join(__dirname, './fixtures/'),
    ]

    let result = await cli([...params, '--bearing', -1], '.')
    expect(result.stderr).toContain(
        'ERROR: Bearing is outside supported range (0-360): -1'
    )

    result = await cli([...params, '--bearing', 361], '.')
    expect(result.stderr).toContain(
        'ERROR: Bearing is outside supported range (0-360): 361'
    )
})

/** Tests that require a valid Mapbox token
 *
 * These will be skipped if MAPBOX_API_TOKEN is missing
 * and will fail if the token is not valid for a request
 * from the test machine.
 */

const testMapbox = skipIf(!MAPBOX_API_TOKEN)

testMapbox('resolves from mapbox source', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(__dirname, './fixtures/example-style-mapbox-source.json'),
            filePath,
            '512',
            '512',
            '-z',
            0,
            '-c',
            '0,0',
            '-t',
            path.join(__dirname, './fixtures/'),
            '--token',
            MAPBOX_API_TOKEN,
        ],
        '.'
    )

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mapbox-source.png'
    )

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})

testMapbox('resolves from mapbox source with ratio', async () => {
    const tmpDir = await createTempDir()
    const filePath = path.join(tmpDir, 'test.png')

    await cli(
        [
            path.join(__dirname, './fixtures/example-style-mapbox-source.json'),
            filePath,
            '512',
            '512',
            '-z',
            0,
            '-c',
            '0,0',
            '--ratio',
            2,
            '--token',
            MAPBOX_API_TOKEN,
        ],
        '.'
    )

    const expectedPath = path.join(
        __dirname,
        './fixtures/expected-mapbox-source@2x.png'
    )

    const diffPixels = await imageDiff(filePath, expectedPath)
    expect(diffPixels).toBeLessThan(100)
})
