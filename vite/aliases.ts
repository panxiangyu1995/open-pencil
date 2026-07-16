import { resolve } from 'node:path'

export function createSignalForgeAliases(rootDir: string) {
  const emptyNodeModule = resolve(rootDir, 'vite/empty-node-module.ts')

  return [
    { find: /^fs$/, replacement: emptyNodeModule },
    { find: /^path$/, replacement: emptyNodeModule },
    { find: '@', replacement: resolve(rootDir, 'src') },
    { find: '#vue', replacement: resolve(rootDir, 'packages/vue/src') },
    { find: '#core', replacement: resolve(rootDir, 'packages/core/src') },
    { find: '#dom-css', replacement: resolve(rootDir, 'packages/dom-css/src') },
    {
      find: /^@signal-forge\/dom-css\/browser$/,
      replacement: resolve(rootDir, 'packages/dom-css/src/browser.ts')
    },
    {
      find: /^@signal-forge\/dom-css\/jsx-runtime$/,
      replacement: resolve(rootDir, 'packages/dom-css/src/jsx/runtime.ts')
    },
    {
      find: /^@signal-forge\/dom-css\/jsx-dev-runtime$/,
      replacement: resolve(rootDir, 'packages/dom-css/src/jsx/dev-runtime.ts')
    },
    {
      find: /^@signal-forge\/dom-css$/,
      replacement: resolve(rootDir, 'packages/dom-css/src/index.ts')
    },
    {
      find: /^@signal-forge\/scene-graph$/,
      replacement: resolve(rootDir, 'packages/scene-graph/src/index.ts')
    },
    { find: '@signal-forge/scene-graph', replacement: resolve(rootDir, 'packages/scene-graph/src') },
    { find: /^@signal-forge\/pen$/, replacement: resolve(rootDir, 'packages/pen/src/index.ts') },
    { find: '@signal-forge/pen', replacement: resolve(rootDir, 'packages/pen/src') },
    { find: /^@signal-forge\/kiwi$/, replacement: resolve(rootDir, 'packages/kiwi/src/index.ts') },
    { find: '@signal-forge/kiwi', replacement: resolve(rootDir, 'packages/kiwi/src') },
    { find: /^@signal-forge\/fig$/, replacement: resolve(rootDir, 'packages/fig/src/index.ts') },
    { find: '@signal-forge/fig', replacement: resolve(rootDir, 'packages/fig/src') },
    { find: /^@signal-forge\/vue$/, replacement: resolve(rootDir, 'packages/vue/src/index.ts') },
    { find: '@signal-forge/vue', replacement: resolve(rootDir, 'packages/vue/src') },
    { find: /^@signal-forge\/core$/, replacement: resolve(rootDir, 'packages/core/src/index.ts') },
    { find: '@signal-forge/core', replacement: resolve(rootDir, 'packages/core/src') },
    {
      find: 'opentype.js',
      replacement: resolve(rootDir, 'node_modules/opentype.js/dist/opentype.module.js')
    },
    { find: 'mermaid', replacement: resolve(rootDir, 'src/app/shell/markdown/index.ts') },
    { find: 'beautiful-mermaid', replacement: resolve(rootDir, 'src/app/shell/markdown/index.ts') }
  ]
}
