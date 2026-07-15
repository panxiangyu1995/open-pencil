# PRD: BioPath — AI-Generated Biological Signaling Pathway Diagram Editor

> Product Requirements Document · Draft · July 2026

## 1. Vision & Problem

### 1.1 Problem

Biological signaling pathway diagrams are essential for publications, grants, and presentations. Current tools fall into two camps:

- **Diagramming tools** (BioRender, PowerPoint, Illustrator): flexible drawing, but manual and time-consuming. No semantic understanding — a "protein" is just a rounded rectangle. No automation, no validation, no interoperability.
- **SBGN editors** (CellDesigner, Newt, PathVisio): semantically rigorous, but steep learning curve, poor UX, and no AI assistance. Most biologists find them impractical for everyday use.

LLMs understand biology deeply — gene/protein names, interactions, pathway logic — but lack a drawing surface that speaks their language. Asking an LLM to "draw a pathway" produces inconsistent, non-standard, and often unrecognizable glyphs.

### 1.2 Vision

**BioPath** repurposes the OpenPencil design editor into an AI-native signaling pathway diagram tool where:

1. Users describe pathways in natural language → AI generates publication-ready SBGN-compliant diagrams
2. AI agents (Claude Code, Codex, Gemini CLI) create and modify pathway diagrams via MCP
3. Every glyph is semantically typed — a protein is a protein, an inhibition is an inhibition — not a generic shape
4. Diagrams are valid SBGN-ML, interoperable with the ecosystem (Reactome, Pathway Commons, CellDesigner)

### 1.3 Key Insight

The root cause of "protein doesn't look like a protein" is **semantic gap**: the AI operates on generic shapes (rectangles, circles, lines) instead of domain-specific glyphs with defined SBGN semantics. The solution is a **domain-specific vocabulary** of glyphs and relations that the AI can assemble, analogous to how HTML has semantic tags rather than pixel coordinates.

## 2. Target Users

| Persona | Workflow | Pain Point |
|---------|----------|------------|
| **Research biologist** | Draws pathway figures for papers/grants | BioRender is manual; every revision takes hours |
| **Bioinformatics student** | Learns pathway analysis | SBGN tools are confusing; can't iterate quickly |
| **AI coding agent** | Generates diagrams from literature | No structured glyph API; falls back to generic shapes |
| **Pharma scientist** | Creates mechanism-of-action diagrams | Current tools don't integrate with knowledge bases |

## 3. Reference Projects

### 3.1 SBGN Standard & Ecosystem

| Project | URL | Stars | Relevance |
|---------|-----|-------|-----------|
| **SBGN** (Systems Biology Graphical Notation) | https://sbgn.github.io/ | — | **Core standard**. Three languages: Process Description (PD), Entity Relationship (ER), Activity Flow (AF). Defines glyph shapes, connection rules, and semantics. Our diagram vocabulary must be SBGN PD-compliant. |
| **libSBGN** | https://github.com/sbgn/libsbgn | 19 | Official C++/Java library for SBGN-ML (XML exchange format). Reference for serialization. |
| **libsbgn.js** | https://github.com/sbgn/libsbgn.js | 3 | JavaScript SBGN-ML parser. Can be integrated directly for import/export. |
| **SBGN-ML spec** | https://pmc.ncbi.nlm.nih.gov/articles/PMC7756621/ | — | XML format specification. Required for interoperability. |

### 3.2 Editors & Visualizers

| Project | URL | Stars | Relevance |
|---------|-----|-------|-----------|
| **Newt** | https://github.com/iVis-at-Bilkent/newt | 62 | **Primary reference**. Web-based SBGN PD+AF editor. Built on Cytoscape.js. Open source, actively maintained. Our glyph rendering and editing UX should match or exceed Newt. |
| **sbgnviz.js** | https://github.com/iVis-at-Bilkent/sbgnviz.js | 35 | Visualization engine behind Newt. Cytoscape.js extension for rendering SBGN PD maps. Contains the canonical SBGN stylesheet (glyph shapes, colors, ports). **Critical reference for glyph rendering.** |
| **PathVisio** | https://github.com/PathVisio/pathvisio | 27 | Java-based pathway editor. Supports GPML format, WikiPathways integration. Good reference for data overlay (expression data on pathways). |
| **CellDesigner** | http://www.celldesigner.org/ | — | Most widely used SBGN PD editor. Java desktop app. Proprietary but free. Good reference for state variable notation and reaction types. |
| **cytoscape-sbgn-stylesheet** | https://github.com/PathwayCommons/cytoscape-sbgn-stylesheet | 70 | CSS-like stylesheet mapping SBGN glyphs to Cytoscape.js visual properties. **Direct reference for implementing SBGN glyphs in our Skia renderer.** |

### 3.3 AI + Pathway

| Project | URL | Stars | Relevance |
|---------|-----|-------|-----------|
| **SBGNFlow** | https://github.com/sciluna/sbgn-flow | 1 | **Highest relevance for AI integration.** AI-assisted workflow: hand-drawn sketch → SBGN-ML via multimodal LLM, layout-aware merging/splitting, SBGN-specific layout refinement. Uses Cytoscape.js + fCoSE layout. Directly demonstrates LLM → SBGN-ML pipeline. |
| **biorender-mechanism-figures-skill** | https://github.com/yiyanli123/biorender-mechanism-figures-skill | 10 | Agent skill that converts biomedical text into structured image-generation prompts. Demonstrates "mechanism-first" decomposition: story → compartments → actors → arrows → labels. **Reference for AI prompt engineering and structured pathway decomposition.** |
| **Reactome MCP Server** | https://github.com/Augmented-Nature/Reactome-MCP-Server | 12 | MCP server for Reactome pathway data. 8 tools: search pathways, gene-to-pathways, disease pathways, reactions, protein interactions. **Reference for our MCP tool design. We should integrate similar data sources.** |
| **ProLLM** | https://github.com/MingyuJ666/ProLLM | 73 | Protein Chain of Thought — replicates signaling pathway logic as language prompts. Shows that LLMs can reason about pathway causality. |
| **Pegasus** | https://github.com/HANsoA-KevinO/Pegasus | 2 | AI scientific illustration agent — fully automated, self-censoring system for generating and precisely editing scientific paper illustrations. Supports continuous interactive improvement. **Reference for AI-driven iterative figure editing workflow.** |
| **SciDraw AI Skill** | https://github.com/TopLocalAI/scidraw-ai-scientific-illustration-skill | 1 | AI scientific illustration skill for Codex/agent workflows. Generates research figures from text descriptions. **Reference for skill-based figure generation patterns.** |
| **AI Research Diagram Studio** | https://github.com/BhaveshBaviskar-IT/ai-research-diagram-studio | 0 | IBM Granite AI + Flask + React + TikZ/LaTeX. Converts natural language prompts into publication-ready academic diagrams. **Reference for NL→diagram pipeline architecture.** |
| **AgInTi LabCanvas** | https://github.com/lachlanchen/AgInTi-LabCanvas | 2 | Agentic studio for editable scientific figures, CAD devices, and experiment design. **Reference for agentic scientific figure editing.** |

### 3.4 Graph Layout & Visualization

| Project | URL | Stars | Relevance |
|---------|-----|-------|-----------|
| **cytoscape.js** | https://github.com/cytoscape/cytoscape.js | 11,095 | Industry-standard graph visualization library. Newt and SBGNViz are built on it. We don't use it (we use Skia), but its graph model and layout algorithms are reference. |
| **cytoscape.js-fcose** | https://github.com/iVis-at-Bilkent/cytoscape.js-fcose | — | Force-directed layout for SBGN-compliant graphs. Used by Newt and SBGNFlow. **Reference for pathway-specific layout.** |
| **cytoscape.js-dagre** | https://github.com/cytoscape/cytoscape.js-dagre | 282 | DAG layout for Cytoscape.js. Good for hierarchical pathway layouts. |
| **ELK.js** | https://github.com/kieler/elkjs | 2,657 | Eclipse Layout Kernel for JS. Advanced layered/orthogonal/force layout algorithms. Could be integrated as an alternative layout engine. |
| **cytoscape-sbgn-layout** | https://github.com/sciluna/cytoscape-sbgn-layout | — | SBGN-specific layout extension from SBGNFlow. Combines fCoSE with SBGN constraints (compartment containment, port alignment). |

### 3.5 Data Sources & Knowledge Infrastructure

| Project | URL | Stars | Relevance |
|---------|-----|-------|-----------|
| **pypath** | https://github.com/saezlab/pypath | 163 | Python module for prior knowledge integration. Builds databases of signaling pathways, enzyme-substrate interactions, complexes, annotations, and intercellular communication roles. **Reference for pathway knowledge base construction and prior knowledge aggregation.** |
| **ReactomePA** | https://github.com/YuLab-SMU/ReactomePA | 45 | R package for Reactome pathway analysis. Good reference for pathway enrichment API patterns. |
| **SPRAS** | https://github.com/Reed-CompBio/spras | 19 | Signaling Pathway Reconstruction Analysis Streamliner. Framework for comparing pathway reconstruction algorithms. **Reference for pathway reconstruction pipeline design.** |
| **chibe** | https://github.com/PathwayCommons/chibe | 14 | Pathway visualization and analysis tool for Pathway Commons and BioPAX data. **Reference for BioPAX data integration.** |
| **biochemical-pathways-poster** | https://github.com/usnish/biochemical-pathways-poster | 297 | Scripts to download and assemble Roche's famous biochemical pathways poster. Useful as a reference for high-density pathway visual layout. |

### 3.6 Data Sources

| Source | Type | Relevance |
|--------|------|-----------|
| **Reactome** | Curated human pathways, REST API | Primary pathway knowledge base. 2,500+ pathways, 25,000+ reactions. MCP server already exists. |
| **Pathway Commons** | Aggregated pathway data (BioPAX) | Integrates Reactome, KEGG, WikiPathways, etc. API for querying interactions. |
| **KEGG** | Metabolic and signaling pathways | Widely referenced. KGML format can be converted to SBGN. |
| **WikiPathways** | Community-curated pathways | GPML format, convertible to SBGN-ML. |
| **STRING** | Protein-protein interaction networks | Useful for discovering interactions to include in diagrams. |
| **UniProt** | Protein database | For gene/protein annotation and cross-referencing. |

### 3.7 Landscape Summary

The "AI + biological pathway diagram" space is nascent — no high-star mature project exists yet. The most promising approaches fall into three categories:

1. **Agent Skill / Prompt Engineering** (biorender-mechanism-figures-skill, SciDraw AI Skill) — LLM generates structured prompts or tool calls to produce pathway figures. Low infrastructure cost, but output consistency depends on prompt quality.
2. **MCP Server / Knowledge Integration** (Reactome MCP Server, pypath) — AI agents query curated pathway databases, then use drawing tools to render. Ensures factual accuracy but requires robust data pipelines.
3. **Traditional Editor + AI Enhancement** (Newt, PathVisio, cytoscape-sbgn-stylesheet) — Mature SBGN editors and renderers that could be augmented with AI. Best visual fidelity and standards compliance, but adding AI is a retrofit.

BioPath's unique position: combining a native design editor (Skia rendering, SceneGraph) with first-class AI tool integration (ToolDef + MCP) and SBGN compliance from the ground up — neither retrofitting AI onto an old editor nor relying on generic image generation.

## 4. SBGN Glyph System — The Core Abstraction

### 4.1 Why SBGN PD

SBGN Process Description is the most expressive and widely adopted standard for signaling pathway diagrams. It defines:

- **Entity pool nodes (EPN)**: macromolecule, simple chemical, complex, nucleic acid feature, source/sink, perturbation, unspecified entity
- **Process nodes**: biochemical reaction, transport, phenotype, omitted process, uncertain process, association, dissociation
- **Modulation arcs**: catalysis, inhibition, stimulation, necessary stimulation, modulation, trigger
- **Logic arcs**: and, or, not
- **Compartment**: container for EPNs
- **State variable**: phosphorylation, ubiquitination, etc.
- **Unit of information**: concentration, charge, etc.

### 4.2 Proposed Glyph Vocabulary for AI Tools

The AI operates on a **typed glyph vocabulary** rather than generic shapes. Each glyph maps to a SBGN PD element:

```
Glyph Types (EPNs):
  macromolecule    → rounded rectangle (protein, RNA, gene)
  simple_chemical  → circle (ATP, Ca2+, glucose)
  complex          → nested rounded rectangle (protein complex)
  nucleic_acid     → rectangle with folded corner (DNA, gene)
  compartment      → large rounded rectangle (nucleus, cytoplasm)
  phenotype        → hexagon (apoptosis, proliferation)
  perturbation     → parallelogram (drug, stimulus)

Arc Types:
  consumption      → arrow from EPN to process
  production       → arrow from process to EPN
  catalysis        → circle-on-line (enzyme catalyzes)
  inhibition       → T-bar (inhibits)
  stimulation      → triangle-on-line (activates)
  necessary_stimulation → filled triangle (required activation)
  modulation       → diamond-on-line (modulates)

Process Types:
  biochemical_reaction → square (chemical transformation)
  transport        → square with double border (cross-compartment)
  association      → circle (complex formation)
  dissociation     → half-circle (complex breakup)
```

### 4.3 Rendering Strategy

Instead of drawing glyphs from scratch, implement **predefined glyph templates** in Skia:

1. Each glyph type has a CanvasKit paint path template with exact SBGN dimensions and styling
2. Glyph instances are SceneGraph nodes with a `glyphType` property
3. The renderer dispatches to glyph-specific paint routines based on `glyphType`
4. State variables and unit-of-information badges render as child nodes
5. Arcs are connection nodes with typed endpoints (not generic lines)

This ensures "a protein always looks like a protein" because the paint routine is deterministic and SBGN-compliant.

## 5. Product Features

### 5.1 P0 — MVP

#### 5.1.1 SBGN PD Glyph Library

- Implement all SBGN PD Level 1 Version 2.1 glyph types as SceneGraph node types
- Each glyph has: name, label, glyph type, state variables, compartment reference
- Glyphs render via Skia with exact SBGN styling (stroke width, fill, corner radius)
- Reference: `cytoscape-sbgn-stylesheet` for visual properties

#### 5.1.2 Arc & Connection System

- SBGN-compliant arcs with typed endpoints and proper glyph connection points (ports)
- Arc routing: orthogonal (right-angle) and straight-line modes
- Arc head/tail decorations: T-bar (inhibition), triangle (stimulation), circle (catalysis), etc.
- Automatic port assignment: arcs connect to nearest valid port on glyph boundary

#### 5.1.3 AI Pathway Generation Tools (Chat + MCP)

New editor tools for pathway creation:

| Tool | Description |
|------|-------------|
| `create_pathway` | Create a new pathway diagram from a natural language description |
| `add_entity` | Add an SBGN entity (macromolecule, chemical, complex, etc.) with label and type |
| `add_process` | Add a process node (reaction, transport, association, etc.) |
| `add_arc` | Add a typed arc between entities and processes (consumption, production, inhibition, catalysis, etc.) |
| `add_compartment` | Add a compartment and move entities into it |
| `set_state_variable` | Add state variable to an entity (e.g., phosphorylation at Y705) |
| `auto_layout` | Apply pathway-specific layout (fCoSE-inspired, compartment-aware) |
| `import_sbgn_ml` | Import an existing SBGN-ML file |
| `export_sbgn_ml` | Export current diagram as SBGN-ML |
| `query_pathway_db` | Query Reactome/Pathway Commons for pathway data |

#### 5.1.4 AI Chat Integration

- User describes a pathway → AI decomposes into entities, processes, and arcs
- AI uses `create_pathway` tool to build the diagram step by step
- Follow-up modifications via natural language ("add STAT3 downstream of JAK2", "inhibit mTOR with rapamycin")
- System prompt includes SBGN glyph vocabulary and pathway construction rules

#### 5.1.5 Basic Auto-Layout

- Force-directed layout with SBGN constraints (compartment containment, port alignment)
- Hierarchical (top-to-bottom) layout option for signaling cascades
- Orthogonal edge routing

### 5.2 P1 — Enhanced

#### 5.2.1 Pathway Knowledge Integration

- Reactome API integration: search pathways, fetch reactions, get participants
- One-click "insert from Reactome": search a pathway → insert as SBGN diagram
- STRING integration: discover protein interactions → add to diagram
- UniProt annotation: hover/click to see protein details

#### 5.2.2 SBGN-ML Interoperability

- Full SBGN-ML import/export
- CellDesigner SBML import (via cd2sbgnml converter)
- GPML import (WikiPathways)
- KGML import (KEGG)

#### 5.2.3 Data Overlay

- Map gene expression data onto pathway entities (color coding)
- Import CSV/TSV with gene → value mapping
- Fold-change gradient: down-regulated (blue) → neutral (white) → up-regulated (red)

#### 5.2.4 AI Sketch-to-SBGN

- Upload a hand-drawn pathway sketch → multimodal LLM converts to SBGN-ML
- Interactive correction interface for recognition errors
- Inspired by SBGNFlow's approach

#### 5.2.5 SBGN AF and ER Languages

- Support Activity Flow (AF) language: simpler, focuses on influence flow
- Support Entity Relationship (ER) language: emphasizes relationships over processes
- Language switcher in the editor

### 5.3 P2 — Advanced

#### 5.2.1 Publication Export

- SVG export with SBGN-compliant styling
- PDF export at publication resolution (300 DPI)
- PNG/JPEG export with configurable DPI
- LaTeX-compatible output (SBGNTikZ)

#### 5.2.2 Pathway Merging & Splitting

- Merge two pathway diagrams (layout-aware)
- Split a large pathway into sub-pathways
- Cross-pathway entity matching (same protein in multiple pathways)

#### 5.2.3 Simulation Integration

- COPASI model export
- Time-course simulation visualization
- Parameter sensitivity analysis overlay

#### 5.2.4 Collaborative Editing

- Real-time co-editing via existing WebRTC/Yjs infrastructure
- Each collaborator sees others' cursors and selections
- Pathway review mode: comment on specific glyphs or arcs

## 6. Technical Design

### 6.1 Architecture Changes

```
packages/
  scene-graph/  — Add SBGN node types (PathwayGlyph, PathwayArc, Compartment)
  core/
    pathway/    — NEW: SBGN glyph rendering, arc routing, layout algorithms
    pathway/tools/ — NEW: AI tool definitions for pathway creation
    pathway/glyphs/ — NEW: Skia paint routines for each SBGN glyph type
    pathway/layout/ — NEW: fCoSE-inspired layout, orthogonal edge routing
    pathway/io/ — NEW: SBGN-ML import/export
  vue/          — Add pathway-specific UI components (glyph palette, arc type selector)
  mcp/          — Add pathway MCP tools (exposed to Claude Code, Codex, etc.)
  cli/          — Add pathway CLI commands (import/export SBGN-ML, auto-layout)

src/
  app/pathway/  — NEW: pathway editor session, knowledge base integration
  components/pathway/ — NEW: pathway-specific UI (glyph inspector, data overlay panel)
```

### 6.2 SceneGraph Extensions

```typescript
type PathwayGlyphType =
  | 'macromolecule'
  | 'simple_chemical'
  | 'complex'
  | 'nucleic_acid_feature'
  | 'unspecified_entity'
  | 'perturbation'
  | 'phenotype'
  | 'source_sink'

type PathwayArcType =
  | 'consumption'
  | 'production'
  | 'catalysis'
  | 'inhibition'
  | 'stimulation'
  | 'necessary_stimulation'
  | 'modulation'
  | 'trigger'
  | 'logic_and'
  | 'logic_or'
  | 'logic_not'

type PathwayProcessType =
  | 'biochemical_reaction'
  | 'transport'
  | 'association'
  | 'dissociation'
  | 'omitted_process'
  | 'uncertain_process'
  | 'phenotype_process'

interface PathwayGlyph extends SceneNode {
  type: 'pathway_glyph'
  glyphType: PathwayGlyphType
  label: string
  stateVariables: StateVariable[]
  unitOfInformation: UnitOfInformation[]
  compartmentId?: string
  cloneMarker?: boolean
}

interface PathwayArc extends SceneNode {
  type: 'pathway_arc'
  arcType: PathwayArcType
  sourceId: string
  targetId: string
  sourcePort?: PortPosition
  targetPort?: PortPosition
  bendPoints?: Vector[]
}

interface PathwayProcess extends SceneNode {
  type: 'pathway_process'
  processType: PathwayProcessType
  label?: string
}

interface Compartment extends SceneNode {
  type: 'compartment'
  label: string
}
```

### 6.3 Glyph Rendering Pipeline

Each SBGN glyph type maps to a Skia paint routine:

```
glyphType → glyphTemplate[glyphType] → CanvasKit path commands

Example: macromolecule
  - Rounded rectangle (corner radius = 1/4 of height)
  - Fill: white
  - Stroke: black, 1px
  - Label: centered, 12pt
  - Clone marker: band at top (if cloned)
  - State variable: badge at top-right corner
  - Ports: 8 connection points (N, NE, E, SE, S, SW, W, NW)
```

### 6.4 AI Tool Design

The AI pathway tools follow the existing `ToolDef` pattern in `packages/core/src/tools/`:

```typescript
const createPathwayTool = defineTool({
  name: 'create_pathway',
  description: 'Create a signaling pathway diagram from a description',
  parameters: {
    description: v.string(),
    entities: v.array(v.object({
      name: v.string(),
      type: v.enum(PathwayGlyphTypes),
      compartment: v.optional(v.string()),
      stateVariables: v.optional(v.array(v.object({
        name: v.string(),
        value: v.optional(v.string()),
      }))),
    })),
    processes: v.array(v.object({
      type: v.enum(PathwayProcessTypes),
      label: v.optional(v.string()),
    })),
    arcs: v.array(v.object({
      type: v.enum(PathwayArcTypes),
      source: v.string(),
      target: v.string(),
    })),
  },
  execute: async (figma, args) => { /* ... */ },
})
```

### 6.5 MCP Tool Exposure

All pathway tools are registered in the MCP server so external AI agents can use them:

```json
{
  "mcpServers": {
    "bio-path": {
      "command": "openpencil-mcp"
    }
  }
}
```

Agents can then:
1. `create_pathway` — generate a JAK-STAT pathway
2. `add_arc` — add an inhibition from SOCS1 to JAK2
3. `set_state_variable` — add "p-Y705" to STAT3
4. `auto_layout` — reorganize the diagram
5. `export_sbgn_ml` — save for downstream analysis
6. `query_pathway_db` — look up Reactome data

### 6.6 Layout Algorithm

Pathway diagrams need specialized layout that respects:

1. **Compartment containment**: entities must stay inside their compartment
2. **Process-centric layout**: processes (reactions) are central; entities surround them
3. **Signal flow direction**: top-to-bottom or left-to-right cascade
4. **Port alignment**: arcs connect to glyph boundary ports, not arbitrary positions
5. **Orthogonal routing**: prefer right-angle edges with minimal crossings

Implementation strategy:
- Phase 1: Adapt existing Yoga WASM for basic layout + custom orthogonal edge routing
- Phase 2: Implement fCoSE-inspired force-directed layout with SBGN constraints (reference: `cytoscape-sbgn-layout`)
- Phase 3: Integrate ELK.js for advanced layered layout

## 7. AI Prompt Strategy

### 7.1 System Prompt Structure

The AI system prompt for pathway generation includes:

```
1. SBGN PD glyph vocabulary — every glyph type, its visual form, and semantic meaning
2. Arc type catalog — every arc type, its decoration, and valid source/target combinations
3. Construction rules — which glyph types can connect via which arc types
4. Layout heuristics — preferred flow direction, compartment nesting, spacing
5. Knowledge source instructions — when to query Reactome/Pathway Commons
6. Error prevention — common mistakes (e.g., arc between two EPNs without a process node)
```

### 7.2 Structured Decomposition

Following the approach from `biorender-mechanism-figures-skill`:

1. **Story**: What biological process is being depicted?
2. **Compartments**: What cellular compartments are involved?
3. **Actors**: What entities (proteins, chemicals, complexes) participate?
4. **Processes**: What reactions/transports occur?
5. **Arrows**: How do entities connect to processes?
6. **Labels**: What labels, state variables, and annotations are needed?

### 7.3 Example AI Interaction

```
User: Draw the JAK-STAT signaling pathway

AI: I'll create the JAK-STAT signaling pathway. Let me break it down:

1. Compartments: extracellular, membrane, cytoplasm, nucleus
2. Entities: cytokine receptor, JAK2, STAT3, SOCS1, PIAS3
3. Processes: receptor binding, phosphorylation, dimerization, nuclear translocation
4. Arcs: catalysis (JAK2 → phosphorylation), stimulation (STAT3-p → dimerization), inhibition (SOCS1 → JAK2)

[Uses create_pathway tool with structured data]
[Uses auto_layout tool]
[Uses set_state_variable for phosphorylation states]

Result: A complete JAK-STAT pathway diagram with 4 compartments, 8 entities, 6 processes, and 15 arcs.
```

## 8. File Format

### 8.1 Primary: SBGN-ML

SBGN-ML is the standard XML exchange format for SBGN diagrams. We implement full read/write support.

```xml
<sbgn xmlns="http://sbgn.org/libsbgn/0.3">
  <map language="process description">
    <glyph class="compartment" id="comp1">
      <label text="cytoplasm"/>
      <bbox x="10" y="10" w="800" h="600"/>
    </glyph>
    <glyph class="macromolecule" id="prot1" compartmentRef="comp1">
      <label text="JAK2"/>
      <bbox x="100" y="200" w="120" h="60"/>
      <state variable="p" value="Y1007"/>
    </glyph>
    <glyph class="process" id="proc1" compartmentRef="comp1">
      <bbox x="300" y="220" w="24" h="24"/>
    </glyph>
    <arc class="catalysis" source="prot1" target="proc1" id="arc1">
      <start x="220" y="230"/>
      <end x="300" y="232"/>
    </arc>
  </map>
</sbgn>
```

### 8.2 Native: .bio-path (extended .pen)

For features beyond SBGN-ML (data overlay, AI metadata, collaboration state), extend the existing `.pen` format with pathway-specific fields. Always embed a valid SBGN-ML subset for interoperability.

### 8.3 Import Formats

| Format | Source | Priority |
|--------|--------|----------|
| SBGN-ML | Standard exchange | P0 |
| CellDesigner SBML | CellDesigner | P1 |
| GPML | WikiPathways | P1 |
| KGML | KEGG | P2 |
| BioPAX | Pathway Commons | P2 |

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI-generated diagram SBGN compliance | >90% | Automated validation against SBGN PD spec |
| Time from description to diagram | <30 seconds | User testing |
| Glyph recognition accuracy | >95% | Visual comparison with Newt/CellDesigner output |
| SBGN-ML round-trip fidelity | 100% | Automated test suite |
| AI tool invocation success rate | >85% | Tool execution logs |
| User satisfaction (vs BioRender) | ≥ comparable | User survey |

## 10. Implementation Phases

### Phase 1 — Glyph Foundation (4-6 weeks)

- Implement SBGN PD glyph types as SceneGraph nodes
- Implement Skia paint routines for all glyphs
- Implement arc types with decorations
- Basic manual placement (no auto-layout)
- Glyph palette UI

### Phase 2 — AI Generation (4-6 weeks)

- Implement pathway AI tools (`create_pathway`, `add_entity`, `add_arc`, etc.)
- AI system prompt with SBGN vocabulary
- Chat integration: describe → generate
- MCP tool registration
- Basic auto-layout (force-directed + orthogonal routing)

### Phase 3 — Interoperability (3-4 weeks)

- SBGN-ML import/export
- Reactome API integration
- `query_pathway_db` tool
- CLI commands for pathway operations

### Phase 4 — Enhanced UX (4-6 weeks)

- Data overlay panel
- Advanced layout (fCoSE-inspired, ELK.js)
- Publication export (SVG, PDF, high-DPI PNG)
- Pathway validation/linting

### Phase 5 — Advanced Features (ongoing)

- Sketch-to-SBGN (multimodal AI)
- Pathway merging/splitting
- SBGN AF and ER language support
- Simulation integration
- Collaborative pathway editing

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SBGN PD spec complexity — 40+ glyph types, many arc rules | High | Start with most common subset (10 glyphs, 6 arcs), expand incrementally |
| Auto-layout quality — pathway layouts are notoriously hard | High | Phase 1: manual placement. Phase 2: simple force-directed. Phase 3: fCoSE/ELK |
| AI hallucination — incorrect pathway relationships | Medium | Validation step after generation; warn on non-standard connections; integrate Reactome as ground truth |
| SBGN-ML compatibility — different tools render SBGN-ML differently | Medium | Test against libSBGN reference renders; join SBGN community for validation |
| Scope creep — bioinformatics features beyond diagramming | Low | Stay focused on diagram generation; defer simulation/analysis to P2+ |

## 12. Open Questions

1. **SBGN PD subset**: Should we implement the full PD Level 1 Version 2.1 spec, or start with a commonly-used subset? Recommendation: start with ~15 most-used glyphs and expand.
2. **Layout engine**: Should we build a custom layout algorithm or integrate ELK.js? ELK.js is powerful but adds dependency. Recommendation: Phase 1-2 custom, Phase 3+ ELK.js.
3. **AI model**: Should we fine-tune a model on SBGN-ML, or rely on prompt engineering? Recommendation: start with prompt engineering + structured tool calls; fine-tune if quality plateaus.
4. **BioRender compatibility**: Should we offer a "BioRender style" rendering mode (more colorful, less strict SBGN)? Recommendation: P1 feature — toggle between strict SBGN and "publication-friendly" styles.
5. **2D vs 2.5D**: Should compartments render with depth/shadow for visual clarity? Recommendation: subtle shadows for compartments, strict 2D for glyphs (SBGN compliance).
