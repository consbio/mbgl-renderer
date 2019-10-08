import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import sharp from 'sharp'
import { createTempDir } from 'jest-fixtures'

import { imageDiff } from './util'

import { version } from '../package.json'

// from: https://medium.com/@ole.ersoy/unit-testing-commander-scripts-with-jest-bc32465709d6
function cli(args, cwd) {
    return new Promise(resolve => {
        exec(
            `node ${path.resolve('./dist/cli')} ${args.join(' ')}`,
            { cwd },
            (error, stdout, stderr) => {
                resolve({
                    code: error && error.code ? error.code : 0,
                    error,
                    stdout,
                    stderr,
                })
            }
        )
    })
}

test('returns correct version', async () => {
    const { stdout } = await cli(['-V'], '.')
    expect(stdout).toContain(version)
})

test('fails without required parameters', async () => {
    // console.log(result.stderr, '|', result.stdout)

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
    expect(diffPixels).toBeLessThan(25)
})
