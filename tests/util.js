import path from 'path'
import { exec } from 'child_process'
import sharp from 'sharp'

import pixelmatch from 'pixelmatch'

/**
 * Uses `pixelmatch` to calculate the number of pixels that are different between
 * the PNG data produced by `render` and the data in the expected PNG file.
 *
 * @param {Buffer} pngData - buffer of PNG data produced by render function
 * @param {String} expectedPath - path to PNG file of expected data from test suite
 *
 * Returns {Number} - count of pixels that are different between the 2 images.
 */
export async function imageDiff(pngData, expectedPath) {
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

/**
 * Create a test endpoint for the CLI at the passed in path.
 *
 * @param {String} cliPath - path to CLI to test (BUILT version)
 */
export function cliEndpoint(cliPath) {
    /**
     * Test the CLI (built version) with the passed in arguments.
     * Derived from from: https://medium.com/@ole.ersoy/unit-testing-commander-scripts-with-jest-bc32465709d6
     *
     *
     * @param {String} args - arguments to pass to CLI command
     * @param {String} cwd  - current working directory
     */
    return function cli(args, cwd) {
        return new Promise(resolve => {
            exec(
                `node ${path.resolve(cliPath)} ${args.join(' ')}`,
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
}

export default { imageDiff, cliEndpoint }
