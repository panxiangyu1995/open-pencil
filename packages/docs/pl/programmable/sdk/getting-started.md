---
title: Pierwsze kroki z SDK
description: Skonfiguruj @signal-forge/vue z createEditor, provideEditor i kanwasem.
---

# Pierwsze kroki z SDK

## Instalacja

```bash
bun add @signal-forge/core @signal-forge/vue canvaskit-wasm
```

SDK mieszka dziś w monorepo i jest również publikowany jako `@signal-forge/vue`.

```ts
import { createEditor } from '@signal-forge/core/editor'
import { provideEditor, useCanvas } from '@signal-forge/vue'
```

## Model mentalny

Są trzy warstwy:

1. `@signal-forge/core` — silnik edytora niezależny od frameworka
2. `@signal-forge/vue` — kompozyty Vue i bezstanowe prymitywy
3. twoja aplikacja — stylowanie, routing, przepływy plików, UI specyficzne dla produktu

## Minimalna konfiguracja

### 1. Utwórz edytor

```ts
import { createEditor } from '@signal-forge/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Dostarcz go do Vue

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

Możesz traktować to jako warstwę dostawcy dla drzewa edytora. Dokumentacja preferuje bezpośrednie użycie `provideEditor()`, ponieważ to jest rzeczywista powierzchnia API.

### 3. Podłącz kanvas

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas, useEditor } from '@signal-forge/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
</script>

<template>
  <canvas ref="canvasRef" class="size-full" />
</template>
```

## Używanie kompozytów

Gdy edytor jest dostarczony, komponenty potomne mogą odczytywać selekcję i wydawać polecenia:

```ts
import { useEditorCommands, useSelectionState } from '@signal-forge/vue'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Podstawowy przykład

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas, useEditor, useSelectionState } from '@signal-forge/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()
const { selectedCount } = useSelectionState()

useCanvas(canvasRef, editor, {
  onReady: () => {
    console.log('Canvas ready')
  },
})
</script>

<template>
  <div class="grid h-full grid-rows-[1fr_auto]">
    <canvas ref="canvasRef" class="size-full" />
    <div class="border-t px-3 py-2 text-xs text-muted">
      Zaznaczono: {{ selectedCount }}
    </div>
  </div>
</template>
```

## Następne kroki

- [Architektura](./architecture)
- [Dokumentacja API](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)
