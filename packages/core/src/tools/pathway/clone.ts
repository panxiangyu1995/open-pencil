import { defineTool, nodeNotFound } from '#core/tools/schema'
import type { PathwayNodeData } from '@signal-forge/scene-graph'
import { getPathwayData, updatePathwayData } from '@signal-forge/scene-graph'

function createBooleanToggleTool(config: {
  name: string
  description: string
  field: keyof Pick<PathwayNodeData, 'cloneMarker' | 'multimer' | 'activeState'>
  resultKey: string
}) {
  return defineTool({
    name: config.name,
    mutates: true,
    description: config.description,
    params: {
      node_id: {
        type: 'string',
        description: 'Entity node ID',
        required: true
      },
      enabled: {
        type: 'boolean',
        description: 'true to enable, false to remove',
        required: true
      }
    },
    execute: (figma, args) => {
      const node = figma.graph.getNode(args.node_id)
      if (!node) return nodeNotFound(args.node_id)
      if (!getPathwayData(node)) return { error: 'Node is not a pathway entity' }
      updatePathwayData(node, { [config.field]: args.enabled })
      return { id: node.id, name: node.name, [config.resultKey]: args.enabled }
    }
  })
}

export const setCloneMarker = createBooleanToggleTool({
  name: 'set_clone_marker',
  description: 'Set or remove the clone marker on a pathway entity. Clone markers render as a gray band at the bottom of the entity, indicating the entity is a copy.',
  field: 'cloneMarker',
  resultKey: 'clone_marker'
})

export const addMultimer = createBooleanToggleTool({
  name: 'add_multimer',
  description: 'Set or remove the multimer state on a pathway entity. Multimer renders as a stacked duplicate shape behind the main entity, indicating multiple copies of the entity.',
  field: 'multimer',
  resultKey: 'multimer'
})
