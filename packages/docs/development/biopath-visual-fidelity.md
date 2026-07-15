# BioPath Visual Fidelity Plan — Making Pathway Diagrams Look Professional

> Companion to `biopath-prd.md` and `biopath-implementation.md` · July 2026
>
> This document addresses the core challenge: **how to make AI-generated pathway diagrams look indistinguishable from professional tools like CellDesigner, Newt, and BioRender**, not just "technically correct SBGN."

## The Problem Restated

Generic AI-generated diagrams look wrong because:
1. **Shapes are wrong** — a protein looks like a generic rounded rectangle, not an SBGN macromolecule
2. **Sizes are wrong** — process nodes same size as entity nodes, no visual hierarchy
3. **Colors are wrong** — random fills, no semantic color coding
4. **Lines are wrong** — no SBGN arc decorations (T-bar, circle-on-line, etc.)
5. **Spacing is wrong** — nodes overlap, no breathing room
6. **Compartments are wrong** — no membrane lines, no nested hierarchy
7. **Details are missing** — no state variables, no clone markers, no multimer stacking

## Strategy: Reference Implementation + Visual Polish Layer

The approach has **two layers**:

- **Layer 1 (SBGN compliance)**: Implement glyphs to match the **cytoscape-sbgn-stylesheet** specification exactly. This is the canonical style used by Newt, SBGNFlow, and Pathway Commons. Every dimension, color, stroke width, and decoration is copied from the reference implementation.
- **Layer 2 (Publication polish)**: Add visual refinements beyond strict SBGN that make diagrams look like CellDesigner/BioRender output — semantic color coding, membrane lines, compartment gradients, and a "publication style" mode.

---

## Part 1: SBGN Glyph Rendering — Exact Specification

### 1.1 Global Style Constants

Extracted from `cytoscape-sbgn-stylesheet` and `sbgnviz.js`:

```typescript
export const SBGN_STYLE = {
  // Colors
  nodeBackgroundColor: '#f6f6f6',    // light gray — default fill for all nodes
  nodeBorderColor: '#555',            // dark gray — default stroke for all nodes
  edgeLineColor: '#555',              // dark gray — default arc line color
  associationFill: '#6B6B6B',         // dark gray — filled association circle
  selectionColor: '#d67614',          // orange — selected node highlight
  cloneMarkerFill: '#838383',         // medium gray — canvas clone marker
  cloneMarkerStroke: '#6A6A6A',       // gray — clone marker outline
  separatorLineColor: '#6A6A6A',      // gray — info box separator
  infoboxBorderColor: '#555555',      // gray — state variable / unit of info border
  infoboxFill: 'white',               // white — state variable background
  sourceSinkStroke: '#6A6A6A',        // gray — empty set / degradation
  dissociationStroke: '#6A6A6A',      // gray — concentric circles

  // Stroke widths
  defaultBorderWidth: 1.5,            // most nodes
  entityBorderWidth: 2,               // EPNs with infoboxes
  complexBorderWidth: 4,              // complex
  compartmentBorderWidth: 4,          // compartment
  edgeLineWidth: 1.5,                 // arcs
  cloneMarkerStrokeWidth: 1.5,        // clone marker outline
  infoboxBorderWidth: 2,              // state variable / unit of info
  separatorLineWidth: 1,              // info box separator
  complexSeparatorWidth: 6,           // complex info box separator
  compartmentSeparatorWidth: 6,       // compartment info box separator

  // Font
  nodeFontSize: 20,                   // labels inside nodes (Cytoscape units)
  infoboxFontSize: 10,                // state variable / unit of info text
  infoboxFontFamily: 'Helvetica Neue, Helvetica, sans-serif',
  textOutlineColor: 'white',
  textOutlineWidth: 0.75,

  // Dimensions (default sizes for new nodes, in pixels at 1x scale)
  macromolecule: { width: 96, height: 48 },
  simpleChemical: { width: 48, height: 48 },
  nucleicAcidFeature: { width: 88, height: 56 },
  complex: { width: 10, height: 10 },  // auto-sizes to contain children
  compartment: { width: 50, height: 50 }, // auto-sizes to contain children
  perturbation: { width: 140, height: 60 },
  phenotype: { width: 140, height: 60 },
  sourceSink: { width: 60, height: 60 },
  unspecifiedEntity: { width: 32, height: 32 },
  process: { width: 25, height: 25 },
  association: { width: 25, height: 25 },
  dissociation: { width: 25, height: 25 },
  andOrNot: { width: 40, height: 40 },
  tag: { width: 100, height: 65 },

  // Shape parameters
  macromoleculeCornerRadius: 0.04,    // 4% of width (proportional)
  simpleChemicalCornerRadius: 'full', // Math.min(w/2, h/2) — stadium shape
  nucleicAcidBottomCornerRadius: 0.3, // 30% of height (bottom corners only)
  complexCornerCutLength: 24,         // pixels — octagonal cut corners
  compartmentPadding: 38,             // pixels — internal padding
  complexPadding: 22,                 // pixels — internal padding
  entityPadding: 8,                   // pixels — EPN label padding

  // Multimer
  multimerPadding: 5,                 // pixels — offset for stacked duplicate

  // Active state
  activePadding: 5,                   // pixels — expanded dashed border
  activeDashPattern: [3, 6],          // 3px dash, 6px gap

  // Arc decorations
  arrowScale: 1.5,                    // intermediate between 1.25 (sbgnviz) and 1.75 (stylesheet)

  // Layout
  idealEdgeLength: 50,
  nodeRepulsion: 4500,
  nodeSeparation: 75,
  layoutPadding: 30,
} as const
```

### 1.2 Exact Glyph Shape Paths (CanvasKit/Skia)

Each glyph must be rendered with **pixel-perfect** paths matching the sbgnviz.js reference implementation. Below are the CanvasKit path construction recipes.

#### Macromolecule (rounded rectangle)

```
corner radius = getRoundRectangleRadius(width, height)
  ≈ min(width, height) * 0.12 (Cytoscape formula)

Path:
  moveTo(0, -h/2)
  arcTo(+w/2, -h/2, +w/2, 0, r)     // top-right corner
  arcTo(+w/2, +h/2, 0, +h/2, r)      // bottom-right corner
  arcTo(-w/2, +h/2, -w/2, 0, r)      // bottom-left corner
  arcTo(-w/2, -h/2, 0, -h/2, r)      // top-left corner
  closePath()

Fill: #f6f6f6
Stroke: #555, 1.5px (2px if has state variables)
Label: centered, 12pt Helvetica Neue
```

**Critical detail**: The corner radius is NOT height/4 as the PRD stated. It's `min(width, height) * 0.12` per the Cytoscape formula, or `0.04 * width` per the stylesheet. This gives a subtler, more professional look than the over-rounded Figma-style corners.

#### Simple Chemical (stadium/capsule)

```
corner radius = Math.min(width/2, height/2)  → fully rounded ends

Path: Same as rounded rectangle but with maximum corner radius
  This creates a stadium/pill/capsule shape, NOT a circle.

Fill: #f6f6f6
Stroke: #555, 2px
```

**Critical detail**: Simple chemical is NOT a circle. It's a stadium shape (rectangle with fully rounded ends). The sbgnviz canvas renderer explicitly uses `Math.min(halfWidth, halfHeight)` as corner radius to create this shape. When width > height it looks like a horizontal capsule; when width = height it looks like a circle.

#### Nucleic Acid Feature (bottom-rounded rectangle)

```
Top corners: sharp (0 radius)
Bottom corners: radius = 0.3 * height

Path:
  moveTo(-w/2, -h/2)                 // top-left (sharp)
  lineTo(+w/2, -h/2)                  // top-right (sharp)
  lineTo(+w/2, 0)                     // right side, down to corner
  arcTo(+w/2, +h/2, 0, +h/2, r)      // bottom-right round
  arcTo(-w/2, +h/2, -w/2, 0, r)      // bottom-left round
  lineTo(-w/2, -h/2)                  // left side back up
  closePath()

Fill: #f6f6f6
Stroke: #555, 2px
```

This is the "DNA/RNA gene" shape — flat top like an envelope, rounded bottom.

#### Complex (octagonal cut-corner rectangle)

```
corner length = 24px (fixed, not proportional)
cpX = min(24, width/2) / width
cpY = min(24, height/2) / height

16-point polygon (in -1..+1 normalized space):
  (-1+cpX, -1), (-1, -1+cpY), (-1, 1-cpY), (-1+cpX, 1),
  (1-cpX, 1),   (1, 1-cpY),   (1, -1+cpY),  (1-cpX, -1)

Scale by (width/2, height/2) from center.

Fill: #f6f6f6
Stroke: #555, 4px (thicker border than other nodes)
```

**Critical detail**: The 24px corner cut is FIXED in pixels, not proportional. This means small complexes have proportionally larger cuts and large complexes have subtle cuts — matching the CellDesigner look.

#### Compartment (barrel shape)

```
Concave sides using quadratic bezier curves at proportional offsets:

Left side:  inward curve at 6% of width
  Quadratic bezier at:
    (0.03, 0.25), control (0.06, 0.50), (0.03, 0.75)

Top/bottom: slight curves at 3% and 5% offsets
  Top:    (0.05, 0.03) → (0.25, 0.00) → (0.75, 0.00) → (0.95, 0.03)
  Bottom: (0.05, 0.97) → (0.25, 1.00) → (0.75, 1.00) → (0.95, 0.97)

This creates a shape that bows slightly inward on the sides,
resembling a wooden barrel.

Fill: transparent or very light tint
Stroke: #555, 4px
Label: positioned at top-left inside the compartment
```

#### Perturbing Agent (concave hexagon)

```
6-point polygon with indented sides:
  (-1, -1), (-0.5, 0), (-1, 1), (1, 1), (0.5, 0), (1, -1)

Scale by (width/2, height/2) from center.
The left and right sides indent inward at 50% height.

Fill: #f6f6f6
Stroke: #555, 2px
```

#### Phenotype (hexagon)

```
Standard regular hexagon (6 points):
  (0, 0.5h), (0.25w, 0), (0.75w, 0), (w, 0.5h), (0.75w, h), (0.25w, h)

Fill: #f6f6f6
Stroke: #555, 2px
```

#### Source and Sink (empty set symbol)

```
1. Draw circle: center at (w/2, h/2), radius = min(w,h)/2
2. Draw diagonal line from (0, h) to (w, 0)

Fill: none
Stroke: #6A6A6A, 1.5px
```

#### Unspecified Entity (ellipse)

```
Simple ellipse, width × height.
Fill: #f6f6f6
Stroke: #555, 2px
```

### 1.3 Process Node Shapes

#### Process / Biochemical Reaction (small square)

```
25 × 25 filled square, centered.

Fill: #f6f6f6
Stroke: #555, 1.5px
```

#### Transport (double-bordered square)

```
25 × 25 square with outer border + inner border at 1/3 width.

Draw: outer stroke, then use destination-out composite to cut inner line.
This creates a "double border" effect.

Fill: #f6f6f6
Stroke: #555, 1.5px (double style)
```

**Implementation**: In Skia, use `saveLayer()` + `drawPath(strokePath)` + `drawPath(innerStrokePath)` with `BlendMode.DstOut` to punch the inner line.

#### Association (filled circle)

```
25 × 25 filled circle.

Fill: #6B6B6B (dark gray, fully opaque)
Stroke: none
```

#### Dissociation (two concentric circles)

```
Outer circle: radius = (min(w,h) - 2) / 2
Inner circle: radius = (min(w,h) - 2) / 3

Fill: none
Stroke: #6A6A6A, 2px
```

#### Omitted Process (square with "\\" label)

```
25 × 25 square with "\\" text inside.

Fill: #f6f6f6
Stroke: #555, 1.5px (dotted style: [1, 1])
```

#### Uncertain Process (square with "?" label)

```
25 × 25 square with "?" text inside.

Fill: #f6f6f6
Stroke: #555, 1.5px (dashed style: [4, 2])
```

### 1.4 Arc Decorations — The Most Critical Visual Element

Arc decorations are what make a pathway diagram recognizable as SBGN. Without them, it's just boxes and lines.

#### Production (filled arrowhead)

```
At target endpoint:
  Triangle, 8-10px wide, pointing in arc direction
  Fill: #555 (filled, same color as arc line)
  Stroke: none
```

#### Consumption (no decoration at target, plain line)

```
Simple line ending at the process node boundary.
No arrowhead.
```

#### Inhibition (T-bar)

```
At target endpoint:
  Perpendicular line, 10px wide, centered on arc endpoint
  Stroke: #555, 2px (filled)
  The T-bar is perpendicular to the arc direction
```

**Implementation**: Calculate the arc direction vector at the endpoint, rotate 90°, draw a short perpendicular line.

#### Catalysis (circle-on-line)

```
Near target endpoint (slightly before the process node):
  Small circle, 6px diameter
  Fill: none (hollow)
  Stroke: #555, 1.5px
  Positioned on the arc line, not at the node boundary
```

**Implementation**: Place the circle center at a point 8px from the target node along the arc line. Draw the arc line in two segments: from source to circle edge, then from circle edge to target.

#### Stimulation (open triangle)

```
Near target endpoint:
  Triangle, 8-10px wide, pointing toward target
  Fill: none (hollow)
  Stroke: #555, 1.5px
```

#### Necessary Stimulation (filled triangle with cross)

```
Near target endpoint:
  Triangle, 8-10px wide, filled
  Small cross/plus inside the triangle
  Fill: #555
  Stroke: #555, 1px
```

#### Modulation (open diamond)

```
Near target endpoint:
  Diamond shape, 8px wide × 6px tall
  Fill: none (hollow)
  Stroke: #555, 1.5px
  Positioned on the arc line
```

#### Trigger (filled arrowhead with perpendicular bar)

```
Near target endpoint:
  Filled triangle pointing toward target
  Short perpendicular bar at the base of the triangle
  Fill: #555
  Stroke: none
```

#### Logic AND/OR/NOT

```
AND: Arc ending at the AND operator ellipse with plain line
OR:  Arc ending at the OR operator ellipse with plain line
NOT: Arc ending with T-bar at the NOT operator
```

### 1.5 Auxiliary Items — State Variables and Info Boxes

These are the small badges attached to entities that show phosphorylation, ubiquitination, etc. They're essential for signaling pathway diagrams.

#### State Variable (stadium/pill badge)

```
Shape: Stadium (rounded rectangle with max corner radius)
  Min width: 30px
  Actual width: max(textWidth + 10, 30)
  Height: auto-sized to text + padding
  Corner radius: Math.min(width/2, height/2) — pill shape

Fill: white, opacity 1.0
Stroke: #555555, 2px
Font: 10px Helvetica Neue
Label format: "value@variable" (e.g., "P@Y705", "Ub")

Position: Top of entity node, centered horizontally
  Offset above the node boundary by 2px
```

**Critical detail**: State variables are drawn OUTSIDE the node boundary, not inside. They're like badges hanging off the top of the node. The `forceOpacityToOne` function in sbgnviz ensures the node background is fully opaque behind the state variable area.

#### Unit of Information (small rounded rectangle badge)

```
Shape: Rounded rectangle, corner radius = 0.04 * width
  Width: auto-sized to text + 5px padding
  Height: auto-sized to text + padding

Fill: white, opacity 1.0
Stroke: #555555, 2px
Font: 10px Helvetica Neue
Label: e.g., "MT:mtDNA", "charge:2+"

Position: Below state variable at top of entity, separated by horizontal line
```

#### Clone Marker (gray band at bottom of node)

```
For macromolecule / nucleic acid feature:
  Bottom 1/4 of node filled with gray
  Clone fill: #838383
  Clip to the node's shape (rounded rect / bottom-round-rect)

For simple chemical (circle):
  Left arc: arc from 30° to 150° (5π/6 to π/6), filled gray
  Right arc: arc from 30° to 90° (π/6 to π/3), filled gray
  Small rectangle band at bottom center

For complex (cut-corner rectangle):
  Bottom trapezoid matching the octagonal shape
  Height = height * cpY / 2
```

#### Multimer (stacked duplicate)

```
Draw the node shape TWICE:
1. First at (centerX + 5, centerY + 5) — the "ghost" behind
   Fill: #f6f6f6
   Stroke: #555, same width
2. Then at (centerX, centerY) — the main shape on top
   Fill: #f6f6f6
   Stroke: #555, same width

This creates a "stacked card" effect showing multiple copies.
Ghost offset varies by type:
  macromolecule multimer: (12, 12)
  simple chemical multimer: (5, 5)
  complex multimer: (16, 16)
  nucleic acid feature multimer: (12, 12)
```

#### Active State (dashed border expansion)

```
Draw a slightly larger version of the node shape behind the main shape:
  Width + 5, Height + 5
  Stroke: #555, 1.5px
  Dash pattern: [3, 6]
  No fill (transparent)

Then draw the normal node shape on top with solid border.
```

---

## Part 2: Publication Polish Layer — Going Beyond Strict SBGN

Strict SBGN uses flat gray fills (#f6f6f6) for everything. Publication-quality diagrams in CellDesigner, Reactome, and BioRender use **semantic color coding** and **visual refinements** that make diagrams much more readable and attractive.

### 2.1 Semantic Color Palette

Based on CellDesigner, Reactome, and BioRender conventions:

```typescript
export const PUBLICATION_STYLE = {
  // Entity type → fill color
  entityFills: {
    macromolecule: '#D4E6F1',      // light blue — proteins
    simple_chemical: '#FADBD8',    // light pink/coral — small molecules
    nucleic_acid_feature: '#D5F5E3', // light green — DNA/RNA
    complex: '#E8DAEF',            // light purple — protein complexes
    perturbation: '#D1F2EB',       // light teal — drugs
    phenotype: '#FEF9E7',          // light yellow — outcomes
    source_sink: '#F2F3F4',        // very light gray — degradation
    unspecified_entity: '#F2F3F4', // very light gray
  },

  // Compartment type → background tint
  compartmentFills: {
    extracellular: 'rgba(173, 216, 230, 0.12)',  // very light blue
    membrane: 'rgba(255, 193, 7, 0.15)',          // very light amber
    cytoplasm: 'rgba(200, 230, 201, 0.10)',       // very light green
    nucleus: 'rgba(206, 147, 216, 0.10)',         // very light purple
    mitochondria: 'rgba(255, 183, 77, 0.10)',     // very light orange
    endoplasmic_reticulum: 'rgba(129, 199, 132, 0.10)', // very light green
    golgi: 'rgba(255, 138, 101, 0.10)',           // very light coral
    default: 'rgba(0, 0, 0, 0.03)',               // near-transparent
  },

  // Border colors (slightly tinted per entity type, not pure gray)
  entityBorders: {
    macromolecule: '#5B9BD5',      // blue-tinted border
    simple_chemical: '#E74C3C',    // red-tinted border
    nucleic_acid_feature: '#27AE60', // green-tinted border
    complex: '#8E44AD',            // purple-tinted border
    perturbation: '#16A085',       // teal-tinted border
    phenotype: '#F39C12',          // amber-tinted border
    default: '#555',               // standard gray
  },

  // Edge colors (matching source entity border, not generic gray)
  edgeColors: {
    activation: '#5B9BD5',         // blue — stimulatory arcs
    inhibition: '#E74C3C',         // red — inhibitory arcs
    catalysis: '#27AE60',          // green — catalytic arcs
    default: '#555',               // gray — other arcs
  },
} as const
```

### 2.2 Membrane Line Rendering

One of the most distinctive visual features of professional pathway diagrams is the **cell membrane** — a thick horizontal line spanning the diagram with receptors straddling it.

```typescript
export function paintMembraneLine(
  ck: CanvasKit,
  canvas: Canvas,
  compartment: SceneNode,
  membraneType: 'plasma' | 'nuclear' | 'mitochondrial' | 'inner'
): void {
  // Plasma membrane: thick line (~3px) at top of cytoplasm compartment
  // Nuclear membrane: double line with periodic gaps (nuclear pores)
  // Mitochondrial: double membrane (outer smooth, inner folded)

  switch (membraneType) {
    case 'plasma':
      // Thick line at compartment top boundary
      paint.setStrokeWidth(3)
      paint.setColor(ck.Color(0x33, 0x33, 0x33, 1.0))
      canvas.drawLine(0, 0, compartment.width, 0, paint)

      // Lipid bilayer texture: short perpendicular ticks every 8px
      paint.setStrokeWidth(1)
      paint.setColor(ck.Color(0x99, 0x99, 0x99, 0.5))
      for (let x = 0; x < compartment.width; x += 8) {
        canvas.drawLine(x, -3, x, 3, paint)
      }
      break

    case 'nuclear':
      // Double line with nuclear pore gaps
      paint.setStrokeWidth(2)
      canvas.drawLine(0, -2, compartment.width, -2, paint)
      // Second line with gaps every 40px for nuclear pores
      for (let x = 0; x < compartment.width; x += 40) {
        canvas.drawLine(x, 2, Math.min(x + 25, compartment.width), 2, paint)
      }
      break
  }
}
```

### 2.3 Compartment Visual Refinements

```typescript
export function paintCompartment(
  ck: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  data: PathwayNodeData
): void {
  const style = getCurrentStyle() // 'sbgn' or 'publication'
  const compType = inferCompartmentType(node.name) // 'cytoplasm', 'nucleus', etc.

  // Barrel shape path
  const path = buildBarrelPath(ck, node.width, node.height)

  if (style === 'publication') {
    // 1. Background fill with compartment-specific tint
    const fillColor = PUBLICATION_STYLE.compartmentFills[compType]
      ?? PUBLICATION_STYLE.compartmentFills.default
    fillPaint.setColor(ck.Color(...parseRgba(fillColor)))
    canvas.drawPath(path, fillPaint)

    // 2. Subtle inner shadow for depth
    // Use saveLayer + translate + drawPath with blur filter
    const shadowPaint = ck.Paint()
    shadowPaint.setColor(ck.Color(0, 0, 0, 15))  // very subtle
    shadowPaint.setImageFilter(ck.ImageFilter.MakeBlur(3, 3, ck.TileMode.Decal))
    canvas.saveLayer(null, shadowPaint)
    canvas.translate(2, 2)
    canvas.drawPath(path, shadowPaint)
    canvas.restore()

    // 3. Border
    strokePaint.setColor(ck.Color(...parseColor('#888')))
    strokePaint.setStyle(ck.PaintStyle.Stroke)
    strokePaint.setStrokeWidth(1.5)
    canvas.drawPath(path, strokePaint)

    // 4. Label at top-left with white background halo
    paintCompartmentLabel(canvas, node)
  } else {
    // Strict SBGN: flat fill, thick border
    fillPaint.setColor(ck.Color(0xF6, 0xF6, 0xF6, 0xFF))
    canvas.drawPath(path, fillPaint)
    strokePaint.setStrokeWidth(4)
    canvas.drawPath(path, strokePaint)
  }
}
```

### 2.4 Receptor Protein at Membrane

CellDesigner-style receptor proteins are one of the most recognizable visual elements in signaling pathway diagrams. They straddle the membrane with a pentagon-like shape:

```typescript
export function paintReceptorAtMembrane(
  ck: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  membraneY: number  // Y coordinate of the membrane line
): void {
  // Pentagon shape: [-1,-1], [0,-0.5], [1,-1], [1,0.5], [0,1], [-1,0.5]
  // Top portion (above membrane): extracellular domain
  // Bottom portion (below membrane): intracellular domain
  // Membrane passes through the middle "notch"

  const hw = node.width / 2
  const hh = node.height / 2
  const cx = node.x + hw
  const cy = node.y + hh

  const path = new ck.Path()
  path.moveTo(cx - hw, cy - hh)          // top-left
  path.lineTo(cx, cy - hh/2)             // top-center notch
  path.lineTo(cx + hw, cy - hh)          // top-right
  path.lineTo(cx + hw, cy + hh/2)        // right side down
  path.lineTo(cx, cy + hh)              // bottom center
  path.lineTo(cx - hw, cy + hh/2)        // left side down
  path.close()

  // Fill with protein color
  fillPaint.setColor(ck.Color(...parseColor(PUBLICATION_STYLE.entityFills.macromolecule)))
  canvas.drawPath(path, fillPaint)

  // Stroke
  strokePaint.setStrokeWidth(2)
  canvas.drawPath(path, strokePaint)
}
```

### 2.5 Style Toggle: SBGN vs Publication

The user (and the AI) should be able to choose between two rendering styles:

| Aspect | SBGN Strict | Publication |
|--------|-------------|-------------|
| Entity fills | #f6f6f6 (uniform gray) | Semantic colors by type |
| Entity borders | #555 (uniform gray) | Tinted per entity type |
| Compartment fills | Transparent | Tinted by compartment type |
| Membrane lines | Not rendered | Thick line with lipid texture |
| Arc colors | #555 (uniform gray) | Blue (activation), red (inhibition), green (catalysis) |
| Clone markers | Gray band | Same + optional label |
| Shadows | None | Subtle inner shadow on compartments |
| Font | 20px (Cytoscape units) | 12pt Helvetica Neue |

**Implementation**: Store the style preference in `pluginData` on the page node. The renderer reads this preference and dispatches to the appropriate paint routine. The AI chat can switch modes: "Switch to publication style" → `batch_update` to set the style preference → `requestRender()`.

### 2.6 Visual Rendering Order (Z-order)

Correct z-ordering is essential for professional-looking diagrams:

```
1. Page background
2. Compartment fills (bottom layer)
3. Membrane lines
4. Arc lines and decorations
5. Entity fills
6. Entity strokes
7. Multimer ghost shapes (behind main shape)
8. Clone markers (on top of entity)
9. State variable and info box badges (on top of entity)
10. Labels (on top of everything)
11. Selection overlays (topmost)
```

**Critical**: Arcs must render BEHIND entities so that T-bars and arrowheads don't get hidden behind node fills. But arc decorations (the actual T-bar, circle, triangle) must render ON TOP of the target process node.

**Implementation**: Render in two passes:
1. First pass: arcs (lines only, no decorations)
2. Second pass: entities and processes
3. Third pass: arc decorations (T-bar, circle, triangle, etc.)
4. Fourth pass: labels, state variables, clone markers

---

## Part 3: Layout Quality — Making Diagrams Readable

### 3.1 fCoSE Layout Parameters for SBGN

The fCoSE (fast Compound Spring Embedder) layout from iVis-at-Bilkent is the gold standard for SBGN pathway layout. Key parameters:

```typescript
export const FCOSE_SBGN_PARAMS = {
  quality: 'default',
  nodeRepulsion: 4500,
  idealEdgeLength: 50,
  edgeElasticity: 0.45,
  nestingFactor: 0.1,
  gravity: 0.25,
  gravityRange: 3.8,
  gravityCompound: 1.0,
  gravityRangeCompound: 1.5,
  nodeSeparation: 75,
  tile: true,
  padding: 30,
  // SBGN-specific constraints
  fixedNodeConstraint: undefined,
  alignmentConstraint: undefined,
  relativePlacementConstraint: undefined,
}
```

**Phase 1 alternative**: Since integrating fCoSE directly requires porting from Cytoscape.js, Phase 1 uses a simpler approach:

```typescript
export function layoutPathwaySimple(
  graph: SceneGraph,
  pageId: string,
  direction: 'top-bottom' | 'left-right'
): void {
  // 1. Topological sort: assign layers by longest path from source entities
  // 2. Position process nodes at layer boundaries
  // 3. Position entities around their connected processes
  // 4. Expand compartments to contain their children + padding
  // 5. Route arcs orthogonally
  // 6. Apply force-directed refinement for 50 iterations to reduce overlaps
  // 7. Snap to grid for clean alignment
}
```

### 3.2 Orthogonal Edge Routing

Professional pathway diagrams use right-angle edges, not diagonal lines. This is the single biggest visual improvement after correct glyph shapes.

```typescript
export function routeArcOrthogonal(
  start: Vector,      // source port position
  end: Vector,        // target port position
  direction: 'top-bottom' | 'left-right',
  obstacles: Rect[]   // node bounding boxes to avoid
): Vector[] {         // returns bend points
  // Simple orthogonal routing:
  // 1. Exit source port perpendicular to the port side
  // 2. Travel in the primary direction (vertical for top-bottom)
  // 3. Make one horizontal adjustment
  // 4. Enter target port perpendicular to the port side

  const midY = (start.y + end.y) / 2
  return [
    start,
    { x: start.x, y: midY },   // vertical segment
    { x: end.x, y: midY },     // horizontal segment
    end                          // vertical to target
  ]
}
```

**Phase 2 improvement**: Implement obstacle-aware routing that finds clear paths through the diagram without crossing over other nodes.

---

## Part 4: Implementation Priority — What Matters Most for Visual Quality

Ranked by visual impact (highest first):

| Priority | Feature | Impact | Phase |
|----------|---------|--------|-------|
| **1** | Correct glyph shapes (macromolecule ≠ rectangle) | Without this, nothing else matters | 1 |
| **2** | Arc decorations (T-bar, circle-on-line, open triangle) | The defining visual of SBGN | 1 |
| **3** | Correct sizes (process 25px, entity 96px) | Visual hierarchy and readability | 1 |
| **4** | Semantic color coding | Instant recognition of protein vs metabolite vs drug | 1 |
| **5** | Orthogonal edge routing | Professional vs amateur look | 2 |
| **6** | State variable badges | Essential for signaling (phosphorylation etc.) | 1 |
| **7** | Compartment backgrounds and labels | Context for entities | 1 |
| **8** | Membrane lines | Distinctive for cell signaling diagrams | 2 |
| **9** | Clone markers and multimer stacking | Completeness for complex diagrams | 2 |
| **10** | Receptor pentagon shapes | CellDesigner-compatibility | 2 |
| **11** | Auto-layout (hierarchical) | Readable flow direction | 2 |
| **12** | fCoSE/ELK layout | Professional-grade layout | 4 |
| **13** | Data overlay (expression colors) | For experimental data visualization | 4 |
| **14** | Publication style toggle | Switch between strict SBGN and BioRender-like | 2 |

### Minimum Viable Visual Quality (Phase 1)

To look "professional" in Phase 1, we MUST nail items 1-7. Without correct shapes, sizes, decorations, and colors, the diagram will look like generic boxes and lines regardless of how good the AI is at understanding biology.

### The "Wow" Factor (Phase 2)

Items 8-11 take the diagram from "correct SBGN" to "indistinguishable from CellDesigner/BioRender output." The receptor pentagons, membrane lines, and semantic colors are what make biologists say "this looks like a real pathway diagram."

---

## Part 5: AI Prompt Refinements for Visual Quality

### 5.1 Include Visual Specs in System Prompt

The AI system prompt should include the exact rendering specification so the AI generates diagrams that look correct:

```markdown
### Visual Rendering Rules

When creating pathway diagrams, follow these rules to ensure professional output:

1. **Entity sizing**:
   - Macromolecules (proteins): width ~100px, height ~50px
   - Simple chemicals (metabolites): width ~50px, height ~50px (capsule shape)
   - Nucleic acid features: width ~90px, height ~55px
   - Phenotypes: width ~140px, height ~60px
   - Perturbations (drugs): width ~140px, height ~60px

2. **Process node sizing**:
   - All process nodes: 24×24px (small square)
   - Association: 24×24px filled circle
   - Dissociation: 24×24px double circle

3. **Spacing**:
   - At least 60px between entities and processes
   - At least 80px between process nodes in a cascade
   - Compartment padding: 40px from border to child entities
   - Entities should not overlap

4. **Compartments**:
   - Create compartments BEFORE entities
   - Size compartments to contain their entities with generous padding
   - Typical compartment sizes: 800×600px for cytoplasm, 800×200px for nucleus
   - Membrane compartments: 800×80px (thin horizontal strip)

5. **Arc routing**:
   - Prefer top-to-bottom signal flow
   - Consumption arcs: entity → process (downward)
   - Production arcs: process → entity (downward)
   - Modulation arcs: regulator → process (from the side)

6. **State variables**:
   - Add state variables for phosphorylated proteins (e.g., "P@Y705")
   - Add state variables for active/inactive states
   - Format: "VALUE@VARIABLE" (e.g., "P@Y705", "Ub@K48")

7. **Publication style**:
   - Use semantic colors: blue for proteins, pink for metabolites, green for nucleic acids, purple for complexes, teal for drugs
   - Use tinted borders matching entity fill color
   - Compartment backgrounds: light tint with 10-15% opacity
```

### 5.2 Example AI Interaction (Visual-Quality Focused)

```
User: Draw the MAPK/ERK signaling pathway

AI: I'll create the MAPK/ERK pathway with publication-quality styling.

Step 1: Create compartments
- Extracellular space (top, 900×80px)
- Plasma membrane (below, 900×60px)
- Cytoplasm (middle, 900×400px)
- Nucleus (bottom, 900×200px)

Step 2: Create entities with semantic colors
- EGF (simple_chemical, extracellular) — pink capsule
- EGFR (macromolecule, membrane) — blue rounded rect straddling membrane
- RAS (macromolecule, cytoplasm) — blue rounded rect
- RAF (macromolecule, cytoplasm) — blue rounded rect
- MEK (macromolecule, cytoplasm) — blue rounded rect
- ERK (macromolecule, cytoplasm) — blue rounded rect
- ERK-P (macromolecule, cytoplasm) — blue rounded rect with "P@T185/Y187" state variable
- ERK-P (macromolecule, nucleus) — blue rounded rect with "P@T185/Y187"

Step 3: Create processes
- binding (process, membrane)
- recruitment (process, cytoplasm)
- phosphorylation_1 (process, cytoplasm)
- phosphorylation_2 (process, cytoplasm)
- phosphorylation_3 (process, cytoplasm)
- nuclear_translocation (process, near nucleus)

Step 4: Create arcs with colored decorations
- EGF → EGFR: stimulation (blue open triangle)
- EGFR → RAS: stimulation (blue open triangle)
- RAF → phosphorylation_1: catalysis (green circle-on-line)
- MEK → phosphorylation_2: catalysis (green circle-on-line)
- ERK → phosphorylation_3: consumption (plain line)
- phosphorylation_3 → ERK-P: production (filled arrow)

[Uses create_pathway tool with structured data including positions, sizes, and style parameters]
[Uses auto_layout_pathway tool]
```

---

## Part 6: Testing Visual Quality

### 6.1 Visual Regression Tests

For each glyph type and arc decoration, create a Playwright canvas snapshot test:

```
tests/e2e/canvas/pathway-glyphs.spec.ts:
  - macromolecule glyph (compare with reference PNG from Newt)
  - simple chemical stadium shape
  - complex octagon with cut corners
  - nucleic acid feature bottom-rounded rect
  - phenotype hexagon
  - perturbation concave hexagon
  - source and sink (empty set symbol)
  - process square
  - association filled circle
  - dissociation double circle
  - T-bar (inhibition) arc decoration
  - circle-on-line (catalysis) arc decoration
  - open triangle (stimulation) arc decoration
  - filled triangle (necessary stimulation) arc decoration
  - open diamond (modulation) arc decoration
  - state variable badge
  - clone marker
  - multimer stacking
  - compartment with children
  - membrane line with receptor
```

### 6.2 Reference Image Generation

Use Newt editor (http://newteditor.org/) to generate reference PNGs for each glyph type. Compare our CanvasKit rendering against these references with a pixel-diff threshold of <2%.

### 6.3 SBGN-ML Round-trip Visual Test

Import an SBGN-ML file from the libSBGN test suite → render → compare with the reference rendering from the libSBGN render comparison page.

---

## Summary: The Complete Rendering Stack

```
AI Chat / MCP Tool Call
  → create_pathway(entities, processes, arcs)
    → SceneGraph.createNode('PATHWAY_GLYPH', ..., { pluginData: { glyphType: 'macromolecule', ... } })
    → SceneGraph.createNode('PATHWAY_PROCESS', ..., { pluginData: { processType: 'process' } })
    → SceneGraph.createNode('PATHWAY_ARC', ..., { pluginData: { arcType: 'catalysis', sourceId, targetId } })
    → SceneGraph.createNode('COMPARTMENT', ..., { name: 'cytoplasm' })
  → auto_layout_pathway()
    → computePortPositions() for each glyph
    → routeArcsOrthogonal() for each arc
    → layoutPathwayHierarchical() for node positions

Canvas Render Loop
  → renderNodeContent()
    → PATHWAY_GLYPH:
      → getPathwayData(node) → { glyphType: 'macromolecule' }
      → paintMacromolecule(ck, canvas, node, data)
        → drawRRectPath(cornerRadius = min(w,h) * 0.12)
        → fill(#D4E6F1) / stroke(#5B9BD5, 2px)   [publication style]
        → paintStateVariables(ck, canvas, node, data) — badges above node
        → paintCloneMarker(ck, canvas, node, data) — gray band at bottom
        → paintLabel(canvas, node) — "JAK2" centered
    → PATHWAY_PROCESS:
      → paintProcess(ck, canvas, node, data) — 24×24 square
    → PATHWAY_ARC:
      → paintPathwayArc(ck, canvas, node, data, graph)
        → resolvePortPositions(sourceNode, targetNode)
        → buildOrthogonalPath(start, end, bendPoints)
        → drawPath(#5B9BD5, 1.5px)               [activation color]
        → paintCatalysisDecoration(ck, canvas, endpoint) — circle on line
    → COMPARTMENT:
      → paintCompartment(ck, canvas, node, data)
        → buildBarrelPath(width, height)
        → fill(rgba(200,230,201,0.10)) / stroke(#888, 1.5px)
        → paintCompartmentLabel(canvas, node) — "Cytoplasm" top-left
        → paintMembraneLine(ck, canvas, node, 'plasma') — if membrane type
```
