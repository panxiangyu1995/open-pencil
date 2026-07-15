# BioPath Refinement Plan — Closing the Implementation Gap

> Authoritative execution document · July 2026
>
> Derived from the full code audit comparing implementation against `biopath-checklist.md`, `biopath-visual-fidelity.md`, `biopath-implementation.md`, and `biopath-prd.md`.
>
> Each work item is atomic, ordered by dependency and visual impact, and specifies exact file paths, code patterns, and acceptance criteria.

---

## Guiding Principles

1. **Labels first** — a pathway diagram without text is useless. Every glyph, process, and compartment must render its name.
2. **Editor integration second** — pathway tools must be first-class editor tools (keyboard shortcut, toolbar, cursor), not orphan helper functions.
3. **Port-aware arcs third** — center-to-center arcs look broken; decorations overlap with glyph fills.
4. **Spec compliance throughout** — every shape, decoration, and attribute must match the visual fidelity spec exactly.

---

## R1: Label + Badge Rendering (Critical)

**Why**: Without text, diagrams are meaningless shapes. This is the single highest-impact gap.

### R1.1 Glyph + Process Label Rendering

**Files**:
- MODIFY `packages/core/src/pathway/render.ts`
- CREATE `packages/core/src/pathway/labels.ts`

**Task**: Render `node.name` as centered text inside every pathway glyph and process.

**Implementation**:

Create `packages/core/src/pathway/labels.ts` — pathway label painter:

```typescript
import type { Canvas, CanvasKit, Font } from 'canvaskit-wasm'
import type { SceneNode } from '@open-pencil/scene-graph'
import type { PathwayNodeData, PathwayGlyphType } from '@open-pencil/scene-graph'
import type { SkiaRenderer } from '#core/canvas/renderer'
import { SBGN_STYLE } from './constants'

const GLYPH_LABEL_CONFIG: Record<string, { paddingX: number; paddingY: number; fontSize: number }> = {
  macromolecule: { paddingX: 8, paddingY: 4, fontSize: 12 },
  simple_chemical: { paddingX: 6, paddingY: 4, fontSize: 11 },
  complex: { paddingX: 10, paddingY: 6, fontSize: 12 },
  nucleic_acid_feature: { paddingX: 8, paddingY: 4, fontSize: 11 },
  perturbation: { paddingX: 8, paddingY: 4, fontSize: 11 },
  phenotype: { paddingX: 8, paddingY: 4, fontSize: 11 },
  source_sink: { paddingX: 4, paddingY: 2, fontSize: 10 },
  unspecified_entity: { paddingX: 6, paddingY: 4, fontSize: 11 },
}

export function paintPathwayLabel(
  ck: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  data: PathwayNodeData,
  r: SkiaRenderer
): void {
  if (!node.name) return
  const font = r.sectionTitleFont
  if (!font) return

  const config = data.glyphType
    ? GLYPH_LABEL_CONFIG[data.glyphType] ?? GLYPH_LABEL_CONFIG.unspecified_entity
    : { paddingX: 6, paddingY: 4, fontSize: 11 }

  const maxW = node.width - config.paddingX * 2
  const maxH = node.height - config.paddingY * 2
  if (maxW < 10 || maxH < 10) return

  const paint = new ck.Paint()
  paint.setColor(ck.Color(0, 0, 0, 1))
  paint.setAntiAlias(true)

  const paragraphs = ck.ParagraphBuilder.Make(
    ck.ParagraphStyle({
      textStyle: ck.TextStyle({
        fontSize: config.fontSize,
        color: ck.Color(0, 0, 0, 1),
        fontFamilies: ['Helvetica Neue', 'Helvetica', 'sans-serif'],
      }),
      maxLines: 2,
      ellipsis: '…',
    }),
    ck.FontMgr.System
  )
  paragraphs.pushStyle(ck.TextStyle({
    fontSize: config.fontSize,
    color: ck.Color(0, 0, 0, 1),
    fontFamilies: ['Helvetica Neue', 'Helvetica', 'sans-serif'],
  }))
  paragraphs.addText(node.name)
  paragraphs.pop()
  const paragraph = paragraphs.build()
  paragraph.layout(maxW)

  const textX = (node.width - paragraph.maxIntrinsicWidth) / 2
  const textY = (node.height - paragraph.height) / 2

  canvas.drawParagraph(paragraph, textX, textY)
  paragraph.delete()
  paragraphs.delete()
  paint.delete()
}

export function paintCompartmentLabel(
  ck: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  r: SkiaRenderer
): void {
  if (!node.name) return
  const font = r.sectionTitleFont
  if (!font) return

  const fontSize = 14
  const padding = SBGN_STYLE.compartmentPadding

  const paragraphs = ck.ParagraphBuilder.Make(
    ck.ParagraphStyle({
      textStyle: ck.TextStyle({
        fontSize,
        color: ck.Color(0x33, 0x33, 0x33, 1),
        fontFamilies: ['Helvetica Neue', 'Helvetica', 'sans-serif'],
        fontStyle: { weight: ck.FontStyle.BoldWeight },
      }),
      maxLines: 1,
      ellipsis: '…',
    }),
    ck.FontMgr.System
  )
  paragraphs.addText(node.name)
  const paragraph = paragraphs.build()
  paragraph.layout(node.width - padding * 2)

  canvas.drawParagraph(paragraph, padding, padding * 0.5)
  paragraph.delete()
  paragraphs.delete()
}
```

Modify `render.ts` — call label painters after shape painting:

```typescript
// In renderPathwayGlyph, after paintPathwayGlyph():
paintPathwayLabel(ck, canvas, node, data, r)

// In renderPathwayProcess, after paintPathwayProcess():
if (node.name) paintPathwayLabel(ck, canvas, node, data, r)

// In renderCompartment, after the barrel shape + before canvas.restore():
paintCompartmentLabel(ck, canvas, node, r)
```

**Acceptance criteria**:
- ✓ Every PATHWAY_GLYPH renders its `node.name` centered inside the shape
- ✓ Compartments render their label at top-left with padding
- ✓ Long names are ellipsized to fit within the glyph bounds
- ✓ Labels don't scale with zoom (rendered in node-local coordinates, canvas transform handles scaling)

---

### R1.2 State Variable Badge Rendering

**Files**:
- MODIFY `packages/core/src/pathway/labels.ts`
- MODIFY `packages/core/src/pathway/render.ts`

**Task**: Render state variable badges above glyph nodes (SBGN spec: stadium pill above node, offset 2px).

**Implementation** — add to `labels.ts`:

```typescript
export function paintStateVariables(
  ck: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  data: PathwayNodeData,
  r: SkiaRenderer
): void {
  if (!data.stateVariables || data.stateVariables.length === 0) return

  const badgeH = 18
  const badgeGap = 2
  const badgeOffsetY = 2
  const minBadgeW = 30

  let totalW = 0
  const widths: number[] = []

  for (const sv of data.stateVariables) {
    const label = sv.value ? `${sv.variable}@${sv.value}` : sv.variable
    const textW = measureTextWidth(ck, label, SBGN_STYLE.infoboxFontSize)
    const w = Math.max(minBadgeW, textW + 10)
    widths.push(w)
    totalW += w
  }

  totalW += (data.stateVariables.length - 1) * badgeGap

  let x = (node.width - totalW) / 2
  const y = -badgeH - badgeOffsetY

  for (let i = 0; i < data.stateVariables.length; i++) {
    const sv = data.stateVariables[i]
    const label = sv.value ? `${sv.variable}@${sv.value}` : sv.variable
    const w = widths[i]
    const cr = Math.min(w / 2, badgeH / 2)

    const path = ck.Path.makeFromSVGString(
      `M${cr},0 L${w - cr},0 Q${w},0 ${w},${cr} L${w},${badgeH - cr} Q${w},${badgeH} ${w - cr},${badgeH} L${cr},${badgeH} Q0,${badgeH} 0,${badgeH - cr} L0,${cr} Q0,0 ${cr},0 Z`
    )
    if (!path) { x += w + badgeGap; continue }

    r.fillPaint.setColor(ck.Color(1, 1, 1, 1))
    r.fillPaint.setStyle(ck.PaintStyle.Fill)
    canvas.drawPath(path, r.fillPaint)

    r.strokePaint.setColor(ck.Color(0x55 / 255, 0x55 / 255, 0x55 / 255, 1))
    r.strokePaint.setStyle(ck.PaintStyle.Stroke)
    r.strokePaint.setStrokeWidth(SBGN_STYLE.infoboxBorderWidth)
    canvas.drawPath(path, r.strokePaint)
    path.delete()

    const textP = ck.ParagraphBuilder.Make(
      ck.ParagraphStyle({
        textStyle: ck.TextStyle({
          fontSize: SBGN_STYLE.infoboxFontSize,
          color: ck.Color(0, 0, 0, 1),
          fontFamilies: [SBGN_STYLE.infoboxFontFamily.split(',')[0].trim()],
        }),
        maxLines: 1,
      }),
      ck.FontMgr.System
    )
    textP.addText(label)
    const para = textP.build()
    para.layout(w)
    canvas.drawParagraph(para, x + (w - para.maxIntrinsicWidth) / 2, y + (badgeH - para.height) / 2)
    para.delete()
    textP.delete()

    x += w + badgeGap
  }
}

function measureTextWidth(ck: CanvasKit, text: string, fontSize: number): number {
  const p = ck.ParagraphBuilder.Make(
    ck.ParagraphStyle({
      textStyle: ck.TextStyle({ fontSize, fontFamilies: ['Helvetica Neue'] }),
    }),
    ck.FontMgr.System
  )
  p.addText(text)
  const para = p.build()
  para.layout(9999)
  const w = para.maxIntrinsicWidth
  para.delete()
  p.delete()
  return w
}
```

In `render.ts` — add after `paintPathwayGlyph()` in `renderPathwayGlyph`:

```typescript
paintStateVariables(r.ck, canvas, node, data, r)
```

**Acceptance criteria**:
- ✓ Entity with `stateVariables: [{ variable: 'P', value: 'Y705' }]` renders "P@Y705" badge above the node
- ✓ Badge is a stadium (pill) shape with white fill, gray border
- ✓ Multiple state variables are laid out horizontally centered above the node

---

### R1.3 Clone Marker Rendering

**Files**:
- MODIFY `packages/core/src/pathway/labels.ts`
- MODIFY `packages/core/src/pathway/render.ts`

**Task**: Render clone marker (gray band at bottom of entity) when `data.cloneMarker === true`.

**Implementation** — add to `labels.ts`:

```typescript
export function paintCloneMarker(
  ck: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  data: PathwayNodeData,
  r: SkiaRenderer
): void {
  if (!data.cloneMarker) return

  const w = node.width
  const h = node.height
  const bandH = h * 0.25

  canvas.save()
  const clipPath = buildGlyphClipPath(ck, node, data)
  if (clipPath) {
    canvas.clipPath(clipPath, ck.ClipOp.Intersect, true)
    clipPath.delete()
  }

  const bandY = h - bandH
  r.fillPaint.setStyle(ck.PaintStyle.Fill)
  r.fillPaint.setColor(ck.Color(
    0x83 / 255, 0x83 / 255, 0x83 / 255, 1
  ))
  canvas.drawRect(ck.LTRBRect(0, bandY, w, h), r.fillPaint)

  canvas.restore()
}
```

In `render.ts` — add after `paintPathwayGlyph()` but before `paintStateVariables()`:

```typescript
if (data.cloneMarker) paintCloneMarker(r.ck, canvas, node, data, r)
```

**Note**: `buildGlyphClipPath` is a helper that recreates the glyph's shape path for clipping, ensuring the clone marker band follows the glyph's outline (rounded corners, octagon, etc.).

**Acceptance criteria**:
- ✓ Entity with `cloneMarker: true` shows a gray band at the bottom quarter
- ✓ Band follows the glyph's shape (clipped to rounded corners, octagon, etc.)

---

### R1.4 Omitted/Uncertain Process Labels

**Files**:
- MODIFY `packages/core/src/pathway/processes.ts`

**Task**: Render `\\` text inside omitted process and `?` text inside uncertain process.

**Implementation** — add text rendering at the end of each paint function:

```typescript
// At end of paintOmittedProcess, after canvas.drawRect and dashEffect.delete():
paintProcessLabel(ck, canvas, node, '\\\\', r)

// At end of paintUncertainProcess, after canvas.drawRect and dashEffect.delete():
paintProcessLabel(ck, canvas, node, '?', r)
```

Add helper in `processes.ts`:

```typescript
function paintProcessLabel(
  ck: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  text: string,
  r: SkiaRenderer
): void {
  const p = ck.ParagraphBuilder.Make(
    ck.ParagraphStyle({
      textStyle: ck.TextStyle({
        fontSize: 14,
        color: ck.Color(0x55 / 255, 0x55 / 255, 0x55 / 255, 1),
        fontFamilies: ['Helvetica Neue'],
      }),
      textAlign: ck.TextAlign.Center,
    }),
    ck.FontMgr.System
  )
  p.addText(text)
  const para = p.build()
  para.layout(node.width)
  canvas.drawParagraph(para, 0, (node.height - para.height) / 2)
  para.delete()
  p.delete()
}
```

**Acceptance criteria**:
- ✓ Omitted process shows `\\` label inside the dotted square
- ✓ Uncertain process shows `?` label inside the dashed square

---

## R2: Editor Tool Wiring (Critical)

**Why**: The pathway glyph/arc tools exist as dead code. Without wiring them into the editor, the user cannot interact with pathway elements on the canvas.

### R2.1 Add Pathway Tools to Editor Registries

**Files**:
- MODIFY `packages/core/src/editor/types.ts` — add `'PATHWAY_PROCESS'` and `'COMPARTMENT'` to `Tool` union
- MODIFY `packages/core/src/editor/tool-registry.ts` — add pathway tool definitions + shortcuts
- MODIFY `packages/vue/src/shared/input/types.ts` — add `TOOL_TO_NODE` mappings + `DragPathwayArc` type
- MODIFY `packages/vue/src/editor/tool-cursor/index.ts` — add cursor mappings

**Implementation**:

`packages/core/src/editor/types.ts` — extend Tool union:
```typescript
export type Tool =
  | 'SELECT' | 'FRAME' | 'SECTION' | 'RECTANGLE' | 'ELLIPSE'
  | 'LINE' | 'POLYGON' | 'STAR' | 'TEXT' | 'PEN' | 'HAND'
  | 'PATHWAY_GLYPH' | 'PATHWAY_PROCESS' | 'PATHWAY_ARC' | 'COMPARTMENT'
```

`packages/core/src/editor/tool-registry.ts` — add pathway tools:
```typescript
export const EDITOR_TOOLS: EditorToolDef[] = [
  // ... existing tools ...
  { key: 'PATHWAY_GLYPH', label: 'Pathway Entity', shortcut: 'W',
    flyout: ['PATHWAY_GLYPH', 'PATHWAY_PROCESS', 'COMPARTMENT'] },
  { key: 'PATHWAY_ARC', label: 'Pathway Arc', shortcut: 'Q' },
]

export const TOOL_SHORTCUTS: Partial<Record<string, Tool>> = {
  // ... existing shortcuts ...
  KeyW: 'PATHWAY_GLYPH',
  KeyQ: 'PATHWAY_ARC',
}
```

`packages/vue/src/shared/input/types.ts` — add mappings:
```typescript
export const TOOL_TO_NODE: Partial<Record<Tool, NodeType>> = {
  // ... existing entries ...
  PATHWAY_GLYPH: 'PATHWAY_GLYPH',
  PATHWAY_PROCESS: 'PATHWAY_PROCESS',
  COMPARTMENT: 'COMPARTMENT',
}

export interface DragPathwayArc {
  type: 'pathway-arc'
  sourceId: string
  sourceX: number
  sourceY: number
  currentX: number
  currentY: number
}

export type DragState =
  | DragDraw
  | DragMove
  | DragPan
  | DragResize
  | DragMarquee
  | DragRotate
  | DragPen
  | DragTextSelect
  | DragEditNode
  | DragEditHandle
  | DragBendHandle
  | DragPathwayArc
```

`packages/vue/src/editor/tool-cursor/index.ts` — add cursors:
```typescript
const TOOL_CURSORS: Record<Tool, string> = {
  // ... existing entries ...
  PATHWAY_GLYPH: 'crosshair',
  PATHWAY_PROCESS: 'crosshair',
  PATHWAY_ARC: 'crosshair',
  COMPARTMENT: 'crosshair',
}
```

**Acceptance criteria**:
- ✓ Pressing `W` activates pathway glyph tool
- ✓ Pressing `Q` activates pathway arc tool
- ✓ Toolbar shows pathway tool flyout
- ✓ All 4 pathway tools have crosshair cursor

---

### R2.2 Wire Pathway Glyph Tool into Canvas Input

**Files**:
- MODIFY `packages/core/src/editor/shapes.ts` — add default fills + pathway glyph creation
- MODIFY `packages/vue/src/canvas/tool-input/use.ts` — add PATHWAY_GLYPH/PROCESS/COMPARTMENT dispatch
- MODIFY `packages/vue/src/shared/input/draw.ts` — handle pathway glyph default sizing

**Implementation**:

`packages/core/src/editor/shapes.ts` — add pathway default fills:
```typescript
const PATHWAY_GLYPH_FILL: Fill = {
  type: 'SOLID',
  color: { r: 0xf6 / 255, g: 0xf6 / 255, b: 0xf6 / 255, a: 1 },
  opacity: 1,
  visible: true
}

const DEFAULT_FILLS: Record<string, Fill> = {
  // ... existing entries ...
  PATHWAY_GLYPH: PATHWAY_GLYPH_FILL,
  PATHWAY_PROCESS: PATHWAY_GLYPH_FILL,
  COMPARTMENT: { type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 0 }, opacity: 0, visible: true },
}
```

In `createShape`, add pathway-specific overrides after the existing `if (type === 'STAR')` block:
```typescript
if (type === 'PATHWAY_GLYPH') {
  overrides.width = w < 2 ? 96 : w
  overrides.height = h < 2 ? 48 : h
}
if (type === 'PATHWAY_PROCESS') {
  overrides.width = w < 2 ? 24 : w
  overrides.height = h < 2 ? 24 : h
}
if (type === 'COMPARTMENT') {
  overrides.width = w < 2 ? 800 : w
  overrides.height = h < 2 ? 600 : h
}
```

`packages/vue/src/canvas/tool-input/use.ts` — pathway tools fall through to `startShapeDraw` naturally since they're in `TOOL_TO_NODE`. PATHWAY_ARC needs a custom branch:
```typescript
if (tool === 'PATHWAY_ARC') {
  // Arc drawing starts on mousedown on a glyph/process node
  // Will be implemented in R2.3
  return
}
```

`packages/vue/src/shared/input/draw.ts` — handle pathway default sizes in `handleDrawUp`:
```typescript
if (node?.type === 'PATHWAY_GLYPH' && node.width < 2 && node.height < 2) {
  editor.updateNode(d.nodeId, { width: 96, height: 48 })
}
if (node?.type === 'PATHWAY_PROCESS' && node.width < 2 && node.height < 2) {
  editor.updateNode(d.nodeId, { width: 24, height: 24 })
}
if (node?.type === 'COMPARTMENT' && node.width < 2 && node.height < 2) {
  editor.updateNode(d.nodeId, { width: 800, height: 600 })
}
```

**Acceptance criteria**:
- ✓ Click canvas with PATHWAY_GLYPH tool → macromolecule glyph appears at click position (96×48 default)
- ✓ Click canvas with COMPARTMENT tool → compartment appears (800×600 default)
- ✓ Drag to resize works for all pathway node types
- ✓ PATHWAY_PROCESS tool creates a 24×24 process node

---

### R2.3 Wire Pathway Arc Tool into Canvas Input

**Files**:
- MODIFY `packages/vue/src/canvas/tool-input/use.ts`
- MODIFY `packages/vue/src/canvas/useCanvasInput.ts`
- MODIFY `packages/core/src/pathway/render.ts` — add preview line rendering

**Task**: Implement click-drag arc creation: click on source glyph/process → drag → release on target glyph/process → create arc.

**Implementation**:

`packages/vue/src/canvas/tool-input/use.ts` — add arc start handler:
```typescript
import { startPathwayArc } from '#vue/shared/input/pathway-arc'

if (tool === 'PATHWAY_ARC') {
  startPathwayArc(cx, cy, editor, hitFns, setDrag)
  return
}
```

CREATE `packages/vue/src/shared/input/pathway-arc.ts`:
```typescript
import type { Editor } from '@open-pencil/core/editor'
import { getPathwayData } from '@open-pencil/scene-graph'

import type { HitTestFns } from '#vue/shared/input/select'
import type { DragPathwayArc, DragState } from '#vue/shared/input/types'

export function startPathwayArc(
  cx: number,
  cy: number,
  editor: Editor,
  hitFns: HitTestFns,
  setDrag: (d: DragState) => void
): void {
  const hit = hitFns.hitTest(cx, cy)
  if (!hit) return

  const node = editor.graph.getNode(hit.nodeId)
  if (!node) return
  if (node.type !== 'PATHWAY_GLYPH' && node.type !== 'PATHWAY_PROCESS') return

  const abs = editor.graph.getAbsolutePosition(hit.nodeId)
  setDrag({
    type: 'pathway-arc',
    sourceId: hit.nodeId,
    sourceX: abs.x + node.width / 2,
    sourceY: abs.y + node.height / 2,
    currentX: cx,
    currentY: cy,
  })
}

export function handlePathwayArcMove(
  d: DragPathwayArc,
  cx: number,
  cy: number
): DragPathwayArc {
  return { ...d, currentX: cx, currentY: cy }
}

export function handlePathwayArcUp(
  d: DragPathwayArc,
  cx: number,
  cy: number,
  editor: Editor,
  hitFns: HitTestFns
): void {
  const hit = hitFns.hitTest(cx, cy)
  if (!hit || hit.nodeId === d.sourceId) return

  const target = editor.graph.getNode(hit.nodeId)
  if (!target) return
  if (target.type !== 'PATHWAY_GLYPH' && target.type !== 'PATHWAY_PROCESS') return

  const source = editor.graph.getNode(d.sourceId)
  if (!source) return

  const sourceData = getPathwayData(source)
  const targetData = getPathwayData(target)

  const arcType = inferArcType(sourceData, targetData, source.type, target.type)

  editor.undo.beginBatch('Create pathway arc')
  const node = editor.graph.createNode('PATHWAY_ARC', editor.state.currentPageId, {
    name: `${source.name} → ${target.name}`,
  })
  updatePathwayData(node, { arcType, sourceId: d.sourceId, targetId: hit.nodeId })
  editor.select([node.id])
  editor.undo.commitBatch()
  editor.setTool('SELECT')
  editor.requestRender()
}

function inferArcType(
  sourceData: PathwayNodeData | null,
  targetData: PathwayNodeData | null,
  sourceType: string,
  targetType: string
): PathwayArcType {
  if (targetType === 'PATHWAY_PROCESS') return 'consumption'
  if (sourceType === 'PATHWAY_PROCESS') return 'production'
  return 'modulation'
}
```

In `packages/vue/src/canvas/useCanvasInput.ts` — add drag dispatch:
```typescript
// In onMouseMove:
if (drag.value.type === 'pathway-arc') {
  drag.value = handlePathwayArcMove(drag.value, cx, cy)
  editor.requestRepaint()
  return
}

// In onMouseUp:
if (drag.value.type === 'pathway-arc') {
  handlePathwayArcUp(drag.value, cx, cy, editor, hitFns)
  drag.value = null
  return
}
```

**Acceptance criteria**:
- ✓ Click on a pathway glyph → drag → release on another glyph/process → arc created
- ✓ Arc type auto-inferred (consumption to process, production from process)
- ✓ Preview line shown during drag
- ✓ Cancelled when released on empty space or same node

---

### R2.4 GlyphPalette Integration into App

**Files**:
- MODIFY `src/views/EditorView.vue` — add pathway panel
- MODIFY `src/components/pathway/GlyphPalette.vue` — connect to editor

**Task**: Wire GlyphPalette into the editor sidebar, visible when a pathway tool is active.

**Implementation** — in `EditorView.vue`, add a conditional panel alongside the left panel:

```vue
<SplitterPanel id="pathway" :size="0" :min-size="0" :max-size="220"
  v-if="isPathwayToolActive">
  <SplitterResizeHandle />
  <GlyphPalette
    :active-glyph-type="activeGlyphType"
    :active-arc-type="activeArcType"
    @select-glyph="onSelectGlyph"
    @select-process="onSelectProcess"
    @select-arc="onSelectArc"
  />
</SplitterPanel>
```

In `GlyphPalette.vue`, connect events to editor:
```typescript
const editor = useEditor()

function onSelectGlyph(type: PathwayGlyphType) {
  editor.setTool('PATHWAY_GLYPH')
  // Store active glyph type in a shared composable or editor state
  setActiveGlyphType(type)
}
```

**Acceptance criteria**:
- ✓ GlyphPalette appears when PATHWAY_GLYPH or PATHWAY_ARC tool is selected
- ✓ Clicking a glyph type in the palette sets the active glyph type + activates the tool
- ✓ Clicking an arc type sets the active arc type + activates the arc tool

---

## R3: Port-Aware Arc Rendering (Critical)

**Why**: Center-to-center arcs cause decorations to overlap with glyph fills, making diagrams look broken.

### R3.1 Use findNearestPort in Arc Rendering

**Files**:
- MODIFY `packages/core/src/pathway/arcs.ts` — resolve port positions instead of center-to-center
- MODIFY `packages/core/src/figma-api/index.ts` — compute ports on arc creation

**Implementation** — in `arcs.ts` `paintPathwayArc`:

Replace center-to-center calculation:
```typescript
// BEFORE:
const sx = sourceAbs.x + sourceNode.width / 2
const sy = sourceAbs.y + sourceNode.height / 2
const tx = targetAbs.x + targetNode.width / 2
const ty = targetAbs.y + targetNode.height / 2

// AFTER:
import { findNearestPort, computePortPositions } from './ports'

const sourceData = getPathwayData(sourceNode)
const targetData = getPathwayData(targetNode)

const targetCenter = { x: targetAbs.x + targetNode.width / 2, y: targetAbs.y + targetNode.height / 2 }
const sourceCenter = { x: sourceAbs.x + sourceNode.width / 2, y: sourceAbs.y + sourceNode.height / 2 }

const sourcePort = data.sourcePort
  ?? findNearestPort(sourceNode, sourceData ?? {}, { x: targetCenter.x - sourceAbs.x, y: targetCenter.y - sourceAbs.y })
const targetPort = data.targetPort
  ?? findNearestPort(targetNode, targetData ?? {}, { x: sourceCenter.x - targetAbs.x, y: sourceCenter.y - targetAbs.y })

const sx = sourceAbs.x + sourcePort.x
const sy = sourceAbs.y + sourcePort.y
const tx = targetAbs.x + targetPort.x
const ty = targetAbs.y + targetPort.y
```

In `figma-api/index.ts` `createPathwayArc` — compute and store ports:
```typescript
createPathwayArc(arcType: PathwayArcType, sourceId: string, targetId: string, overrides?: Partial<CoreSceneNode>): FigmaNodeProxy {
  const node = this.graph.createNode('PATHWAY_ARC', this._currentPageId, overrides)
  const sourceNode = this.graph.getNode(sourceId)
  const targetNode = this.graph.getNode(targetId)

  let sourcePort: { side: string; x: number; y: number } | undefined
  let targetPort: { side: string; x: number; y: number } | undefined

  if (sourceNode && targetNode) {
    const sourceData = getPathwayData(sourceNode)
    const targetData = getPathwayData(targetNode)
    const targetAbs = this.graph.getAbsolutePosition(targetId)
    const sourceAbs = this.graph.getAbsolutePosition(sourceId)
    sourcePort = findNearestPort(sourceNode, sourceData ?? {}, { x: targetAbs.x + targetNode.width / 2 - sourceAbs.x, y: targetAbs.y + targetNode.height / 2 - sourceAbs.y })
    targetPort = findNearestPort(targetNode, targetData ?? {}, { x: sourceAbs.x + sourceNode.width / 2 - targetAbs.x, y: sourceAbs.y + sourceNode.height / 2 - targetAbs.y })
  }

  updatePathwayData(node, { arcType, sourceId, targetId, sourcePort, targetPort })
  return this.wrapNode(node.id)
}
```

**Acceptance criteria**:
- ✓ Arcs connect from glyph boundary ports (top/right/bottom/left), not centers
- ✓ Inhibition T-bar appears at the process boundary, not overlapping the process fill
- ✓ Catalysis circle appears near the process boundary, not inside the entity
- ✓ Port positions are stored in arc's pathway data for stability

---

## R4: Node.js SBGN-ML Import Fallback (Critical)

**Why**: CLI and MCP environments are Node.js — DOMParser doesn't exist there.

### R4.1 Add fast-xml-parser Fallback

**Files**:
- MODIFY `packages/core/src/io/formats/sbgn-ml/read.ts`
- MODIFY `packages/core/package.json` — add `fast-xml-parser` dependency

**Implementation** — in `read.ts`, add Node.js fallback:

```typescript
async function parseXml(xml: string): Promise<Document> {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(xml, 'application/xml')
  }

  const { XMLParser } = await import('fast-xml-parser')
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    preserveOrder: true,
  })
  return parser.parse(xml) as unknown as Document
}
```

Refactor `parseSbgnMlXml` to be async or use a sync fallback pattern.

**Acceptance criteria**:
- ✓ SBGN-ML import works in both browser and Node.js
- ✓ CLI `pathway import` produces a non-empty SceneGraph
- ✓ No silent empty-graph returns

---

## R5: Fix paintPerturbation Shape (High Priority)

### R5.1 Correct Concave Hexagon Path

**File**: MODIFY `packages/core/src/pathway/glyphs.ts`

**Current (broken)**: self-intersecting bowtie that visits center point twice
**Spec**: proper 6-point concave hexagon with both left and right sides indented

**Fix**:
```typescript
export function paintPerturbation(
  ck: CanvasKit, canvas: Canvas, node: SceneNode, data: PathwayNodeData, style: PathwayStyle, r: SkiaRenderer
): void {
  const w = node.width
  const h = node.height

  const path = new ck.Path()
  path.moveTo(0, 0)
  path.lineTo(w * 0.25, h * 0.5)
  path.lineTo(0, h)
  path.lineTo(w, h)
  path.lineTo(w * 0.75, h * 0.5)
  path.lineTo(w, 0)
  path.close()

  r.fillPaint.setStyle(ck.PaintStyle.Fill)
  r.fillPaint.setColor(glyphFill(ck, data.glyphType, style))
  canvas.drawPath(path, r.fillPaint)

  r.strokePaint.setStyle(ck.PaintStyle.Stroke)
  r.strokePaint.setColor(glyphBorder(ck, data.glyphType, style))
  r.strokePaint.setStrokeWidth(SBGN_STYLE.entityBorderWidth)
  canvas.drawPath(path, r.strokePaint)

  path.delete()
}
```

**Acceptance criteria**:
- ✓ Perturbation glyph renders as a proper concave hexagon (6 distinct vertices)
- ✓ Both left and right sides indent inward at 50% height
- ✓ Matches SBGN spec and Newt reference

---

## R6: Fix Arc Decorations (High Priority)

### R6.1 Logic AND/OR Operator Ellipses

**File**: MODIFY `packages/core/src/pathway/arcs.ts`

**Fix**: Replace empty `break` statements with operator label rendering:

```typescript
case 'logic_and': {
  paintLogicOperator(ck, canvas, targetX, targetY, dirX, dirY, 'AND', r)
  break
}
case 'logic_or': {
  paintLogicOperator(ck, canvas, targetX, targetY, dirX, dirY, 'OR', r)
  break
}
```

Add helper:
```typescript
function paintLogicOperator(
  ck: CanvasKit, canvas: Canvas, x: number, y: number,
  dirX: number, dirY: number, label: string, r: SkiaRenderer
): void {
  const rx = 10
  const ry = 8
  const cx = x - dirX * (rx + 2)
  const cy = y - dirY * (ry + 2)

  r.strokePaint.setStyle(ck.PaintStyle.Stroke)
  r.strokePaint.setColor(hexToCKColor(ck, SBGN_STYLE.edgeLineColor))
  r.strokePaint.setStrokeWidth(SBGN_STYLE.edgeLineWidth)
  canvas.drawOval(ck.LTRBRect(cx - rx, cy - ry, cx + rx, cy + ry), r.strokePaint)

  // Label text inside ellipse
  const p = ck.ParagraphBuilder.Make(
    ck.ParagraphStyle({
      textStyle: ck.TextStyle({ fontSize: 8, color: ck.Color(0, 0, 0, 1), fontFamilies: ['Helvetica Neue'] }),
    }),
    ck.FontMgr.System
  )
  p.addText(label)
  const para = p.build()
  para.layout(rx * 2)
  canvas.drawParagraph(para, cx - para.maxIntrinsicWidth / 2, cy - para.height / 2)
  para.delete()
  p.delete()
}
```

### R6.2 Equivalence Double Arrowhead

**Fix**: Add source-end arrowhead for equivalence arcs in `paintPathwayArc`:

```typescript
if (data.arcType === 'equivalence') {
  const reverseDir = directionVector({ x: tx, y: ty }, { x: sx, y: sy })
  paintArrowhead(ck, canvas, sx, sy, reverseDir.dx, reverseDir.dy, ARROW_SIZE, r)
}
```

### R6.3 Necessary Stimulation Cross

**Fix**: Add perpendicular bar inside the filled triangle (matching trigger pattern):

```typescript
export function paintFilledTriangle(
  ck: CanvasKit, canvas: Canvas,
  tipX: number, tipY: number, dirX: number, dirY: number, size: number, r: SkiaRenderer
): void {
  paintArrowhead(ck, canvas, tipX, tipY, dirX, dirY, size, r)

  // Cross bar inside the triangle (for necessary_stimulation)
  const perpX = -dirY
  const perpY = dirX
  const barX = tipX - dirX * size * 0.6
  const barY = tipY - dirY * size * 0.6
  const halfW = size * 0.25

  r.strokePaint.setStrokeWidth(1.5)
  r.strokePaint.setStyle(ck.PaintStyle.Stroke)
  r.strokePaint.setColor(r.fillPaint.getColor())
  canvas.drawLine(
    barX + perpX * halfW, barY + perpY * halfW,
    barX - perpX * halfW, barY - perpY * halfW,
    r.strokePaint
  )
}
```

**Note**: This changes `paintFilledTriangle` to include a cross. The trigger decoration already has a bar at the base, so the necessary stimulation cross is a different visual. Rename to clarify: necessary stimulation gets a cross inside the triangle; trigger gets a bar at the base.

**Acceptance criteria**:
- ✓ Logic AND arc shows "AND" label inside an ellipse at the endpoint
- ✓ Logic OR arc shows "OR" label inside an ellipse at the endpoint
- ✓ Equivalence arc has arrowheads on BOTH ends
- ✓ Necessary stimulation shows a filled triangle with a cross/plus mark inside

---

## R7: Fix Transport Double-Border (High Priority)

### R7.1 Use saveLayer + BlendMode.DstOut

**File**: MODIFY `packages/core/src/pathway/processes.ts`

**Fix**:
```typescript
export function paintTransport(
  ck: CanvasKit, canvas: Canvas, node: SceneNode, _data: PathwayNodeData, _style: PathwayStyle, r: SkiaRenderer
): void {
  const w = node.width
  const h = node.height
  const inset = w / 3

  r.fillPaint.setStyle(ck.PaintStyle.Fill)
  r.fillPaint.setColor(hexToCKColor(ck, SBGN_STYLE.nodeBackgroundColor))
  canvas.drawRect(ck.LTRBRect(0, 0, w, h), r.fillPaint)

  r.strokePaint.setStyle(ck.PaintStyle.Stroke)
  r.strokePaint.setColor(hexToCKColor(ck, SBGN_STYLE.nodeBorderColor))
  r.strokePaint.setStrokeWidth(SBGN_STYLE.defaultBorderWidth)
  canvas.drawRect(ck.LTRBRect(0, 0, w, h), r.strokePaint)

  // Proper double border: punch out inner stroke with DstOut
  const innerRect = ck.LTRBRect(inset, inset, w - inset, h - inset)
  const innerStrokePaint = new ck.Paint()
  innerStrokePaint.setAntiAlias(true)
  innerStrokePaint.setStyle(ck.PaintStyle.Stroke)
  innerStrokePaint.setStrokeWidth(SBGN_STYLE.defaultBorderWidth)
  innerStrokePaint.setColor(ck.Color(0, 0, 0, 1))
  innerStrokePaint.setBlendMode(ck.BlendMode.DstOut)

  canvas.saveLayer(ck.LTRBRect(0, 0, w, h), null)
  canvas.drawRect(innerRect, innerStrokePaint)
  canvas.restore()
  innerStrokePaint.delete()

  // Redraw the inner border line on top (just the inner outline)
  r.strokePaint.setColor(hexToCKColor(ck, SBGN_STYLE.nodeBorderColor))
  canvas.drawRect(innerRect, r.strokePaint)
}
```

**Acceptance criteria**:
- ✓ Transport process shows a proper double-border square
- ✓ Inner border is transparent (punched out), not background-colored
- ✓ Works correctly when placed over other nodes or gradients

---

## R8: Publication Style Toggle (High Priority)

### R8.1 Read Style Preference from PluginData

**Files**:
- MODIFY `packages/core/src/pathway/render.ts` — read style from page pluginData
- MODIFY `packages/core/src/pathway/constants.ts` — add style key constant

**Implementation**:

Add to `constants.ts`:
```typescript
export const PATHWAY_STYLE_PLUGIN_KEY = 'pathway-style'
```

In `render.ts`, replace `DEFAULT_STYLE` with dynamic lookup:
```typescript
function getPathwayStyle(graph: SceneGraph, pageId: string): PathwayStyle {
  const page = graph.getNode(pageId)
  if (!page) return 'sbgn'
  const entry = page.pluginData.find(
    e => e.pluginId === PATHWAY_PLUGIN_ID && e.key === PATHWAY_STYLE_PLUGIN_KEY
  )
  if (!entry) return 'sbgn'
  try {
    const val = JSON.parse(entry.value)
    return val === 'publication' ? 'publication' : 'sbgn'
  } catch {
    return 'sbgn'
  }
}
```

In each render function, replace `DEFAULT_STYLE` with:
```typescript
const style = getPathwayStyle(graph, ctx.state.currentPageId)
```

Add a new AI tool `set_pathway_style` in `packages/core/src/tools/pathway/modify.ts`:
```typescript
export const setPathwayStyle = defineTool({
  name: 'set_pathway_style',
  mutates: true,
  description: 'Set the pathway rendering style. "sbgn" uses strict gray SBGN styling; "publication" uses semantic color coding with tinted fills and borders.',
  params: {
    style: { type: 'string', description: 'Rendering style', required: true, enum: ['sbgn', 'publication'] }
  },
  execute: (figma, args) => {
    const page = figma.graph.getNode(figma.currentPage.id)
    if (!page) return { error: 'No current page' }
    const idx = page.pluginData.findIndex(
      e => e.pluginId === PATHWAY_PLUGIN_ID && e.key === PATHWAY_STYLE_PLUGIN_KEY
    )
    const entry = { pluginId: PATHWAY_PLUGIN_ID, key: PATHWAY_STYLE_PLUGIN_KEY, value: JSON.stringify(args.style) }
    if (idx >= 0) page.pluginData[idx] = entry
    else page.pluginData.push(entry)
    figma.requestRender()
    return { style: args.style }
  }
})
```

**Acceptance criteria**:
- ✓ AI chat can say "switch to publication style" → `set_pathway_style(style='publication')`
- ✓ Entities render with semantic fill colors in publication mode
- ✓ Arcs render with colored edges (blue=activation, red=inhibition, green=catalysis)
- ✓ Default style is 'sbgn' (strict gray)

---

## R9: Medium-Priority Spec Compliance

### R9.1 Add `set_unit_of_information` Tool

**File**: MODIFY `packages/core/src/tools/pathway/modify.ts` + `index.ts`

Add tool:
```typescript
export const setUnitOfInformation = defineTool({
  name: 'set_unit_of_information',
  mutates: true,
  description: 'Add a unit of information badge to a pathway entity (e.g., "MT:mtDNA", "charge:2+").',
  params: {
    node_id: { type: 'string', description: 'Entity node ID', required: true },
    text: { type: 'string', description: 'Unit of information text (e.g., "MT:mtDNA")', required: true }
  },
  execute: (figma, args) => {
    const rawNode = figma.graph.getNode(args.node_id)
    if (!rawNode) return nodeNotFound(args.node_id)
    updatePathwayData(rawNode, {
      unitOfInformation: [...(getPathwayData(rawNode)?.unitOfInformation ?? []), { text: args.text }]
    })
    return { id: rawNode.id, name: rawNode.name, unit_of_information: args.text }
  }
})
```

### R9.2 Add `direction` + `spacing` Params to `auto_layout_pathway`

**File**: MODIFY `packages/core/src/tools/pathway/layout.ts`

Add params:
```typescript
params: {
  page_id: { type: 'string', description: 'Page ID to layout' },
  direction: { type: 'string', description: 'Signal flow direction', enum: ['top-bottom', 'left-right'], default: 'top-bottom' },
  spacing: { type: 'number', description: 'Minimum spacing between nodes in pixels', min: 20, default: 60 }
}
```

Pass `direction` and `spacing` to `hierarchicalLayout()`.

### R9.3 Add `protein_interactions` Query Type + `pathway_commons` Source

**Files**:
- MODIFY `packages/core/src/tools/pathway/query.ts`
- CREATE `packages/core/src/pathway/knowledge/pathway-commons.ts`

Add Pathway Commons API client and `protein_interactions` query type.

### R9.4 Fix SBGN-ML `compartmentRef` Attribute

**Files**:
- MODIFY `packages/core/src/io/formats/sbgn-ml/read.ts` — read `compartmentRef` instead of `compartment`
- MODIFY `packages/core/src/io/formats/sbgn-ml/write.ts` — emit `compartmentRef` attribute on glyphs

### R9.5 Fix Deep Copy for Pathway pluginData

**File**: MODIFY `packages/scene-graph/src/copy.ts`

Since `pluginData.value` is a JSON string (immutable), the current `copySpread` is actually safe. No change needed. The audit initially flagged this but on deeper analysis, strings are primitives and won't cause shared-reference issues. **Close as no-change-needed.**

### R9.6 Fix Merge Arc Reconnection for `name_and_type` Mode

**File**: MODIFY `packages/core/src/pathway/merge.ts`

Change `nameToId` key to include type when `matchBy === 'name_and_type'`:
```typescript
const key = matchBy === 'name_and_type'
  ? `${getPathwayData(node)?.glyphType ?? getPathwayData(node)?.processType ?? 'unknown'}:${node.name}`
  : node.name
nameToId.set(key, clone.id)
```

For arc reconnection, look up by both name-only key (for arc source/target names) and by name_and_type key.

### R9.7 Add System Prompt Visual Rendering Rules

**File**: MODIFY `src/app/ai/chat/system-prompt.md`

Add a `## Visual Rendering Rules` subsection within `# Pathway Diagram Mode` covering:
1. Entity sizing defaults (macromolecule ~96×48, simple_chemical ~48×48, etc.)
2. Process sizing (24×24 for all)
3. Spacing rules (60px between entities and processes, 80px between cascading processes, 40px compartment padding)
4. Compartment sizing and creation order
5. Arc routing (top-to-bottom signal flow, consumption downward, production downward, modulation from side)
6. State variable formatting ("VALUE@VARIABLE", e.g., "P@Y705")
7. Publication style description and toggle command

---

## Execution Order

```
R1 (Labels + Badges)     ← highest visual impact, unblocks all testing
  R1.1 → R1.2 → R1.3 → R1.4

R2 (Editor Tool Wiring)  ← unblocks manual pathway creation
  R2.1 → R2.2 → R2.3 → R2.4

R3 (Port-Aware Arcs)     ← visual correctness for arcs
  R3.1

R4 (Node.js Fallback)    ← CLI/MCP functionality
  R4.1

R5–R8 (Visual Fixes)     ← parallel after R1
  R5, R6, R7, R8 can run in parallel

R9 (Spec Compliance)     ← lower priority
  R9.1–R9.7 can run in parallel
```

---

## Review Gates

After each R-section:
1. `bun run check` — zero errors
2. `bun run test:unit` — all pathway tests pass
3. Visual verification: place pathway nodes on canvas and confirm labels, badges, and decorations render correctly
4. AI chat test: "Draw the JAK-STAT signaling pathway" → verify correct structure + labels + style toggle

After all R-sections:
5. SBGN-ML round-trip test: import → render → export → re-import → verify equivalence
6. Full visual regression: compare canvas output with Newt reference screenshots for each glyph type
