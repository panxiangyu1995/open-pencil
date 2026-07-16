import { describe, expect, test } from 'bun:test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DEFAULT_PACKAGES,
  preparePublishDirectories,
  publishPackageJSON
} from '../src/publish-dirs'

async function fixtureRoot() {
  const root = join(tmpdir(), `signal-forge-release-packages-${crypto.randomUUID()}`)
  await mkdir(join(root, 'packages/example/dist'), { recursive: true })
  await writeFile(join(root, 'packages/example/dist/index.js'), 'export {}\n')
  await writeFile(
    join(root, 'packages/example/package.json'),
    JSON.stringify(
      {
        name: '@signal-forge/example',
        version: '1.0.0',
        scripts: { build: 'tsdown' },
        dependencies: { '@signal-forge/core': 'workspace:*', zod: '^4.0.0' },
        devDependencies: { typescript: '^5.0.0' },
        publishConfig: { access: 'public', main: './dist/index.js', types: './dist/index.d.ts' }
      },
      null,
      2
    )
  )
  return root
}

describe('publishPackageJSON', () => {
  test('rewrites workspace dependencies and strips private build fields', () => {
    const json = publishPackageJSON(
      {
        name: '@signal-forge/example',
        scripts: { build: 'tsdown' },
        dependencies: { '@signal-forge/core': 'workspace:*', zod: '^4.0.0' },
        devDependencies: { typescript: '^5.0.0' },
        publishConfig: { access: 'public', main: './dist/index.js' }
      },
      '0.13.2'
    )

    expect(json).toEqual({
      name: '@signal-forge/example',
      dependencies: { '@signal-forge/core': '^0.13.2', zod: '^4.0.0' },
      main: './dist/index.js'
    })
  })
})

describe('DEFAULT_PACKAGES', () => {
  test('includes every public workspace package that release publish must pack', () => {
    expect(DEFAULT_PACKAGES.map((pkg) => pkg.dir)).toEqual([
      'packages/scene-graph',
      'packages/pen',
      'packages/kiwi',
      'packages/fig',
      'packages/core',
      'packages/dom-css',
      'packages/cli',
      'packages/mcp',
      'packages/vue'
    ])
  })
})

describe('preparePublishDirectories', () => {
  test('copies requested files and writes publish package metadata', async () => {
    const root = await fixtureRoot()
    const outRoot = join(root, '.publish')

    await preparePublishDirectories({
      coreVersion: '0.13.2',
      outRoot,
      packages: [{ dir: 'packages/example', include: ['dist'], extraFiles: [] }],
      root
    })

    expect(await readFile(join(outRoot, 'example/dist/index.js'), 'utf8')).toBe('export {}\n')
    expect(JSON.parse(await readFile(join(outRoot, 'example/package.json'), 'utf8'))).toEqual({
      name: '@signal-forge/example',
      version: '1.0.0',
      dependencies: { '@signal-forge/core': '^0.13.2', zod: '^4.0.0' },
      main: './dist/index.js',
      types: './dist/index.d.ts'
    })
  })
})
