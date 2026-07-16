import { defineTool, nodeNotFound } from '#core/tools/schema'
import { getPathwayData, updatePathwayData } from '@signal-forge/scene-graph'

export const setActiveState = defineTool({
  name: 'set_active_state',
  mutates: true,
  description: 'Set or remove the active state on a pathway entity. Active state renders as a green border/glow, indicating the entity is in an active conformation.',
  params: {
    node_id: {
      type: 'string',
      description: 'Entity node ID',
      required: true
    },
    enabled: {
      type: 'boolean',
      description: 'true to mark as active, false to remove active state',
      required: true
    }
  },
  execute: (figma, args) => {
    const node = figma.graph.getNode(args.node_id)
    if (!node) return nodeNotFound(args.node_id)
    if (!getPathwayData(node)) return { error: 'Node is not a pathway entity' }
    updatePathwayData(node, { activeState: args.enabled })
    return { id: node.id, name: node.name, active_state: args.enabled }
  }
})
