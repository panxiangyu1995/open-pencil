import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

import { openPencilArchitecturePlugin } from './tools/architecture/src/steiger-rules/index.ts'

// SignalForge is not laid out as canonical Feature-Sliced Design layers.
// Keep Steiger focused on project-specific architecture boundaries instead of
// enabling fsd.configs.recommended, which treats src/ and packages/ as FSD layer typos.
export default defineConfig([
  fsd.plugin,
  openPencilArchitecturePlugin,
  {
    ignores: [
      '.claude/**',
      'node_modules/**',
      'dist/**',
      'desktop/**',
      'public/**',
      'scratch/**',
      'demo-recordings/**'
    ]
  },
  {
    rules: {
      'signal-forge/prefer-domain-folders-over-filename-prefixes': 'error',
      'signal-forge/strict-test-file-placement': 'error',
      'signal-forge/no-engine-only-assertions-in-e2e': 'error',
      'signal-forge/no-e2e-imports-in-engine-tests': 'error',
      'signal-forge/no-root-markdown-clutter': 'error',
      'signal-forge/no-prototype-or-generated-imports': 'error',
      'signal-forge/no-property-panel-imports-in-canvas': 'error',
      'signal-forge/no-app-imports-in-workspace-packages': 'error',
      'signal-forge/no-package-internals-in-app': 'error',
      'signal-forge/no-foreign-package-local-aliases': 'error',
      'signal-forge/no-app-imports-components-or-views': 'error',
      'signal-forge/no-components-import-views': 'error',
      'signal-forge/no-views-imported-outside-entry': 'error',
      'signal-forge/no-non-ui-imports-in-shared-ui': 'error',
      'signal-forge/no-app-imports-in-shared-ui': 'error',
      'signal-forge/no-property-panel-internals-outside-panel': 'error',
      'signal-forge/no-native-title-attributes-in-vue': 'error',
      'signal-forge/no-ui-imports-in-core': 'error',
      'signal-forge/scripts-are-entrypoint-shims': 'error',
      'signal-forge/strict-tools-layout': 'error'
    }
  }
])
