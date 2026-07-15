import {
  type PathwayGlyphType,
  type PathwayProcessType,
  type PathwayArcType,
  getPathwayData,
  updatePathwayData
} from '@open-pencil/scene-graph'

import { defineTool, nodeSummary, nodeNotFound } from '#core/tools/schema'

const GLYPH_TYPES: string[] = [
  'macromolecule', 'simple_chemical', 'complex',
  'nucleic_acid_feature', 'unspecified_entity', 'perturbation',
  'phenotype', 'source_sink'
]

const PROCESS_TYPES: string[] = [
  'process', 'transport', 'association', 'dissociation',
  'omitted_process', 'uncertain_process'
]

const ARC_TYPES: string[] = [
  'consumption', 'production', 'modulation', 'stimulation',
  'catalysis', 'inhibition', 'necessary_stimulation', 'trigger',
  'logic_and', 'logic_or', 'logic_not', 'equivalence'
]

export const addEntity = defineTool({
  name: 'add_entity',
  mutates: true,
  description: 'Add a single SBGN entity (glyph) to the pathway diagram.',
  params: {
    name: { type: 'string', description: 'Entity name (e.g. "JAK2", "ATP")', required: true },
    glyph_type: {
      type: 'string',
      description: 'SBGN glyph type',
      required: true,
      enum: GLYPH_TYPES
    },
    x: { type: 'number', description: 'X position' },
    y: { type: 'number', description: 'Y position' },
    width: { type: 'number', description: 'Width in pixels', min: 1 },
    height: { type: 'number', description: 'Height in pixels', min: 1 },
    compartment_id: { type: 'string', description: 'Parent compartment node ID' }
  },
  execute: (figma, args) => {
    const overrides: Partial<SceneNode> = {
      name: args.name,
      x: args.x ?? 0,
      y: args.y ?? 0,
      width: args.width ?? 96,
      height: args.height ?? 48
    }
    const node = figma.createPathwayGlyph(args.glyph_type as PathwayGlyphType, overrides)
    if (args.compartment_id) {
      const parent = figma.getNodeById(args.compartment_id)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})

export const addProcess = defineTool({
  name: 'add_process',
  mutates: true,
  description: 'Add a single SBGN process node to the pathway diagram.',
  params: {
    name: { type: 'string', description: 'Process name', required: true },
    process_type: {
      type: 'string',
      description: 'SBGN process type',
      required: true,
      enum: PROCESS_TYPES
    },
    x: { type: 'number', description: 'X position' },
    y: { type: 'number', description: 'Y position' },
    compartment_id: { type: 'string', description: 'Parent compartment node ID' }
  },
  execute: (figma, args) => {
    const overrides: Partial<SceneNode> = {
      name: args.name,
      x: args.x ?? 0,
      y: args.y ?? 0
    }
    const node = figma.createPathwayProcess(args.process_type as PathwayProcessType, overrides)
    if (args.compartment_id) {
      const parent = figma.getNodeById(args.compartment_id)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})

export const addArc = defineTool({
  name: 'add_arc',
  mutates: true,
  description: 'Add a single SBGN arc connecting two pathway nodes.',
  params: {
    source_id: { type: 'string', description: 'Source node ID', required: true },
    target_id: { type: 'string', description: 'Target node ID', required: true },
    arc_type: {
      type: 'string',
      description: 'SBGN arc type',
      required: true,
      enum: ARC_TYPES
    }
  },
  execute: (figma, args) => {
    const sourceNode = figma.getNodeById(args.source_id)
    const targetNode = figma.getNodeById(args.target_id)
    if (!sourceNode) return nodeNotFound(args.source_id)
    if (!targetNode) return nodeNotFound(args.target_id)

    const node = figma.createPathwayArc(
      args.arc_type as PathwayArcType,
      args.source_id,
      args.target_id
    )
    return nodeSummary(node)
  }
})

export const addCompartment = defineTool({
  name: 'add_compartment',
  mutates: true,
  description: 'Add a compartment (cell region) to the pathway diagram.',
  params: {
    label: { type: 'string', description: 'Compartment label (e.g. "Cytoplasm", "Nucleus")', required: true },
    x: { type: 'number', description: 'X position' },
    y: { type: 'number', description: 'Y position' },
    width: { type: 'number', description: 'Width in pixels', min: 1 },
    height: { type: 'number', description: 'Height in pixels', min: 1 }
  },
  execute: (figma, args) => {
    const node = figma.createCompartment(args.label, {
      x: args.x ?? 0,
      y: args.y ?? 0,
      width: args.width ?? 800,
      height: args.height ?? 600
    })
    return nodeSummary(node)
  }
})

export const setStateVariable = defineTool({
  name: 'set_state_variable',
  mutates: true,
  description: 'Add or update a state variable badge on a pathway entity (e.g. phosphorylation state).',
  params: {
    node_id: { type: 'string', description: 'Entity node ID', required: true },
    variable: { type: 'string', description: 'State variable name (e.g. "P@Y705", "Ub")', required: true },
    value: { type: 'string', description: 'Optional value for the state variable' }
  },
  execute: (figma, args) => {
    const rawNode = figma.graph.getNode(args.node_id)
    if (!rawNode) return nodeNotFound(args.node_id)

    if (!getPathwayData(rawNode)) return { error: 'Node is not a pathway entity' }

    const sv = { variable: args.variable, value: args.value }
    updatePathwayData(rawNode, {
      stateVariables: [...(getPathwayData(rawNode)?.stateVariables ?? []), sv]
    })
    return { id: rawNode.id, name: rawNode.name, state_variable: sv }
  }
})

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

    if (!getPathwayData(rawNode)) return { error: 'Node is not a pathway entity' }

    updatePathwayData(rawNode, {
      unitOfInformation: [...(getPathwayData(rawNode)?.unitOfInformation ?? []), { text: args.text }]
    })
    return { id: rawNode.id, name: rawNode.name, unit_of_information: args.text }
  }
})

export const setPathwayStyle = defineTool({
  name: 'set_pathway_style',
  mutates: true,
  description: 'Set the pathway rendering style. "sbgn" uses strict gray SBGN styling; "publication" uses semantic color coding with tinted fills and borders.',
  params: {
    style: { type: 'string', description: 'Rendering style', required: true, enum: ['sbgn', 'publication'] }
  },
  execute: (figma, args) => {
    figma.setPathwayStyle(args.style as 'sbgn' | 'publication')
    return { style: args.style }
  }
})
