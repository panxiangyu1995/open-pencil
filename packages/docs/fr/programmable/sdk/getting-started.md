---
title: Démarrage rapide SDK
description: Configurez @signal-forge/vue avec createEditor, provideEditor et un canvas.
---

# Démarrage rapide SDK

## Installation

```bash
bun add @signal-forge/core @signal-forge/vue canvaskit-wasm
```

Le SDK est hébergé dans le monorepo et également publié sous le nom `@signal-forge/vue`.

```ts
import { createEditor } from '@signal-forge/core/editor'
import { provideEditor, useCanvas } from '@signal-forge/vue'
```

## Modèle mental

Il y a trois couches :

1. `@signal-forge/core` — moteur d'édition indépendant du framework
2. `@signal-forge/vue` — composables Vue et primitives headless
3. votre application — styles, routage, flux de fichiers, UI spécifique au produit

## Configuration minimale

### 1. Créer un éditeur

```ts
import { createEditor } from '@signal-forge/core/editor'

const editor = createEditor({
  width: 1200,
  height: 800,
})
```

### 2. Le fournir à Vue

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

Vous pouvez voir ceci comme la couche provider de l'arbre éditeur. La documentation préfère `provideEditor()` directement car c'est la vraie surface d'API actuelle.

### 3. Attacher un canvas

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

## Utiliser les composables

Une fois l'éditeur fourni, les composants enfants peuvent lire la sélection et émettre des commandes :

```ts
import { useEditorCommands, useSelectionState } from '@signal-forge/vue'

const selection = useSelectionState()
const commands = useEditorCommands()
```

## Exemple de base

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas, useEditor, useSelectionState } from '@signal-forge/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()
const { selectedCount } = useSelectionState()

useCanvas(canvasRef, editor, {
  onReady: () => {
    console.log('Canvas prêt')
  },
})
</script>

<template>
  <div class="grid h-full grid-rows-[1fr_auto]">
    <canvas ref="canvasRef" class="size-full" />
    <div class="border-t px-3 py-2 text-xs text-muted">
      Sélectionné : {{ selectedCount }}
    </div>
  </div>
</template>
```

## Étapes suivantes

- [Architecture](./architecture)
- [Référence API](./api/)
- [useEditor](./api/composables/use-editor)
- [useCanvas](./api/composables/use-canvas)
- [useI18n](./api/composables/use-i18n)
