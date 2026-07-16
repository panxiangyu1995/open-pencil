import { defineTool } from '#core/tools/schema'

import {
  type PathwayGlyphType,
  type PathwayProcessType,
  type PathwayArcType,
  updatePathwayData
} from '@signal-forge/scene-graph'

interface EntitySpec {
  name: string
  glyph_type: PathwayGlyphType
  x?: number
  y?: number
  width?: number
  height?: number
  compartment?: string
  state_variables?: string
  clone_marker?: boolean
}

interface ProcessSpec {
  name: string
  process_type: PathwayProcessType
  x?: number
  y?: number
  compartment?: string
}

interface ArcSpec {
  source: string
  target: string
  arc_type: PathwayArcType
}

interface CompartmentSpec {
  name: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export const createPathway = defineTool({
  name: 'create_pathway',
  mutates: true,
  description:
    'Create a complete SBGN pathway diagram from structured JSON specs. Creates compartments first, then entities, then processes, then arcs. Entities are placed inside their specified compartment.',
  params: {
    compartments: {
      type: 'string',
      description: 'JSON array of compartment specs: [{name, x?, y?, width?, height?}]',
      required: true
    },
    entities: {
      type: 'string',
      description: 'JSON array of entity specs: [{name, glyph_type, x?, y?, width?, height?, compartment?, state_variables?, clone_marker?}]',
      required: true
    },
    processes: {
      type: 'string',
      description: 'JSON array of process specs: [{name, process_type, x?, y?, compartment?}]',
      required: true
    },
    arcs: {
      type: 'string',
      description: 'JSON array of arc specs: [{source, target, arc_type}]',
      required: true
    }
  },
  execute: (figma, args) => {
    const nameToId = new Map<string, string>()
    const compartmentIds: string[] = []
    const entityIds: string[] = []
    const processIds: string[] = []
    const arcIds: string[] = []

    let compartments: CompartmentSpec[]
    try {
      compartments = JSON.parse(args.compartments) as CompartmentSpec[]
    } catch {
      return { error: 'Invalid JSON in compartments parameter' }
    }

    let entities: EntitySpec[]
    try {
      entities = JSON.parse(args.entities) as EntitySpec[]
    } catch {
      return { error: 'Invalid JSON in entities parameter' }
    }

    let processes: ProcessSpec[]
    try {
      processes = JSON.parse(args.processes) as ProcessSpec[]
    } catch {
      return { error: 'Invalid JSON in processes parameter' }
    }

    let arcs: ArcSpec[]
    try {
      arcs = JSON.parse(args.arcs) as ArcSpec[]
    } catch {
      return { error: 'Invalid JSON in arcs parameter' }
    }

    const nameCollisions: string[] = []

    function addNameToId(name: string, id: string): void {
      if (nameToId.has(name)) {
        nameCollisions.push(name)
      }
      nameToId.set(name, id)
    }

    for (const spec of compartments) {
      const node = figma.createCompartment(spec.name, {
        x: spec.x ?? 0,
        y: spec.y ?? 0,
        width: spec.width ?? 800,
        height: spec.height ?? 600
      })
      addNameToId(spec.name, node.id)
      compartmentIds.push(node.id)
    }

    for (const spec of entities) {
      const parentId = spec.compartment ? nameToId.get(spec.compartment) : undefined
      const node = figma.createPathwayGlyph(spec.glyph_type, {
        name: spec.name,
        x: spec.x ?? 0,
        y: spec.y ?? 0,
        width: spec.width ?? 96,
        height: spec.height ?? 48
      })

      if (spec.state_variables) {
        const svs = spec.state_variables.split(',').map((s: string) => {
          const trimmed = s.trim()
          const atIdx = trimmed.indexOf('@')
          if (atIdx > 0) {
            return { variable: trimmed.slice(0, atIdx), value: trimmed.slice(atIdx + 1) }
          }
          return { variable: trimmed }
        })
        const rawNode = figma.graph.getNode(node.id)
        if (rawNode) {
          updatePathwayData(rawNode, { stateVariables: svs })
        }
      }
      if (spec.clone_marker) {
        const rawNode = figma.graph.getNode(node.id)
        if (rawNode) {
          updatePathwayData(rawNode, { cloneMarker: true })
        }
      }

      if (parentId) {
        const parent = figma.getNodeById(parentId)
        if (parent) parent.appendChild(node)
      }

      addNameToId(spec.name, node.id)
      entityIds.push(node.id)
    }

    for (const spec of processes) {
      const parentId = spec.compartment ? nameToId.get(spec.compartment) : undefined
      const node = figma.createPathwayProcess(spec.process_type, {
        name: spec.name,
        x: spec.x ?? 0,
        y: spec.y ?? 0
      })

      if (parentId) {
        const parent = figma.getNodeById(parentId)
        if (parent) parent.appendChild(node)
      }

      addNameToId(spec.name, node.id)
      processIds.push(node.id)
    }

    const skippedArcs: string[] = []

    for (const spec of arcs) {
      const sourceId = nameToId.get(spec.source)
      const targetId = nameToId.get(spec.target)
      if (!sourceId || !targetId) {
        skippedArcs.push(`${spec.source} → ${spec.target} (${!sourceId ? `source "${spec.source}" not found` : `target "${spec.target}" not found`})`)
        continue
      }
      const node = figma.createPathwayArc(spec.arc_type, sourceId, targetId, {
        name: `${spec.source} → ${spec.target}`
      })
      arcIds.push(node.id)
    }

    const result: Record<string, unknown> = {
      created: {
        compartments: compartmentIds,
        entities: entityIds,
        processes: processIds,
        arcs: arcIds
      },
      summary: `Created ${compartmentIds.length} compartments, ${entityIds.length} entities, ${processIds.length} processes, ${arcIds.length} arcs`
    }

    if (skippedArcs.length > 0) {
      result.warnings = [...result.warnings ?? [], ...skippedArcs.map(s => `Skipped arc: ${s}`)]
    }

    if (nameCollisions.length > 0) {
      result.warnings = [...result.warnings ?? [], ...nameCollisions.map(n => `Duplicate name "${n}" — later node shadows earlier, arcs may connect to wrong node`)]
    }

    return result
  }
})
