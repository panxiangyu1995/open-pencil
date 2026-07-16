import { describe, expect, test } from 'bun:test'

import { packageBinTargets } from '../src/tarballs'

describe('packageBinTargets', () => {
  test('normalizes string bin fields', () => {
    expect(packageBinTargets({ name: '@signal-forge/cli', bin: './bin/signalforge.js' })).toEqual({
      '@signal-forge/cli': './bin/signalforge.js'
    })
  })

  test('keeps named bin fields', () => {
    expect(
      packageBinTargets({ name: '@signal-forge/cli', bin: { signalforge: './bin/signalforge.js' } })
    ).toEqual({
      signalforge: './bin/signalforge.js'
    })
  })
})
