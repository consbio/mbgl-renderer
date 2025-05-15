import { cliEndpoint } from './util'
import metadata from '../package.json' with { type: 'json' }

const { version } = metadata

const cli = cliEndpoint('./dist/server')

test('returns correct version', async () => {
    const { stdout } = await cli(['-V'], '.')
    expect(stdout).toContain(version)
})

test('fails with invalid tile path', async () => {
    const { stderr } = await cli(['-t', './bad-tile-path'], '.')
    expect(stderr).toContain('Path to mbtiles files does not exist')
})
