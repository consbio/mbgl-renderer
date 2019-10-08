import { cliEndpoint } from './util'

import { version } from '../package.json'

const cli = cliEndpoint('./dist/server')

test('returns correct version', async () => {
    const { stdout } = await cli(['-V'], '.')
    expect(stdout).toContain(version)
})

test('fails with invalid tile path', async () => {
    const { stderr } = await cli(['-t', './bad-tile-path'], '.')
    expect(stderr).toContain('ERROR: Path to mbtiles files does not exist')
})
