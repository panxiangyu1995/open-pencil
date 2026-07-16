import type { SceneGraph, SceneNode } from '@signal-forge/scene-graph'
import { getPathwayData, updatePathwayData } from '@signal-forge/scene-graph'

import { collectPathwayArcs } from '#core/pathway/utils'

export function computeOrthogonalBendPoints(
  graph: SceneGraph,
  pageId: string
): number {
  const arcs = collectPathwayArcs(graph, pageId)
  let updated = 0

  for (const arc of arcs) {
    const data = getPathwayData(arc)
    if (!data?.sourceId || !data?.targetId) continue

    const sourceNode = graph.getNode(data.sourceId)
    const targetNode = graph.getNode(data.targetId)
    if (!sourceNode || !targetNode) continue

    const sourceAbs = graph.getAbsolutePosition(data.sourceId)
    const targetAbs = graph.getAbsolutePosition(data.targetId)

    const sx = sourceAbs.x + sourceNode.width / 2
    const sy = sourceAbs.y + sourceNode.height / 2
    const tx = targetAbs.x + targetNode.width / 2
    const ty = targetAbs.y + targetNode.height / 2

    const midY = (sy + ty) / 2

    const bendPoints = [
      { x: sx, y: midY },
      { x: tx, y: midY }
    ]

    updatePathwayData(arc, { bendPoints })
    updated++
  }

  return updated
}
