---
title: useViewportKind
description: Read coarse mobile and desktop viewport flags for responsive editor shells.
---

# useViewportKind

`useViewportKind()` returns simple responsive flags used by SignalForge editor UI.

Use it when your shell needs a light abstraction over breakpoints instead of wiring `useBreakpoints()` directly.

## Usage

```ts
import { useViewportKind } from '@signal-forge/vue'

const { isMobile, isDesktop } = useViewportKind()
```

## Returns

- `isMobile`
- `isDesktop`

## Related APIs

- [useCanvas](../composables/use-canvas)
