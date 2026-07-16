---
title: provideEditor
description: Передача экземпляра редактора SignalForge в Vue-поддерево через инъекцию.
---

# provideEditor

`provideEditor(editor)` делает редактор SignalForge доступным для дочерних компосаблов и headless-примитивов через Vue-инъекцию.

Это основа для `useEditor()`.

## Использование

```ts
import { provideEditor } from '@signal-forge/vue'

provideEditor(editor)
```

## Базовый пример

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

## Примечания

Текущий SDK использует `provideEditor()` и `useEditor()` напрямую. Некоторые старые примеры и сообщения об ошибках ещё ссылаются на компонент `SignalForgeProvider`, но модель инъекции — это реальная поверхность API, которую следует предпочитать в документации и коде приложения.

## Связанные API

- [useEditor](./use-editor)
