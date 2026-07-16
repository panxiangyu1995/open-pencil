---
title: provideEditor
description: Provide an SignalForge editor instance to a Vue subtree using injection.
---

# provideEditor

`provideEditor(editor)` makes an SignalForge editor available to descendant composables and headless primitives through Vue injection.

This is the foundation for `useEditor()`.

## Usage

```ts
import { provideEditor } from '@signal-forge/vue'

provideEditor(editor)
```

## Basic example

```vue
<script setup lang="ts">
import { provideEditor } from '@signal-forge/vue'

import type { Editor } from '@signal-forge/core/editor'

const props = defineProps<{
  editor: Editor
}>()

provideEditor(props.editor)
</script>

<template>
  <slot />
</template>
```

## Notes

The current SDK uses `provideEditor()` and `useEditor()` directly. Some older examples and error messages still refer to an `SignalForgeProvider` component, but the injection model is the real API surface to prefer in docs and app code.

## Related APIs

- [useEditor](./use-editor)
