import type { SceneGraph, SceneNode } from '@signal-forge/scene-graph'
import { getPathwayData, updatePathwayData } from '@signal-forge/scene-graph'

export interface MergeResult {
  mergedEntities: number
  totalEntities: number
  totalArcs: number
  totalProcesses: number
}

export function mergePathways(
  graph: SceneGraph,
  sourcePageId: string,
  targetPageId: string,
  matchBy: 'name' | 'name_and_type' = 'name_and_type'
): MergeResult {
  const sourcePage = graph.getNode(sourcePageId)
  const targetPage = graph.getNode(targetPageId)
  if (!sourcePage || !targetPage) {
    return { mergedEntities: 0, totalEntities: 0, totalArcs: 0, totalProcesses: 0 }
  }

  const targetEntityMap = new Map<string, string>()
  for (const childId of collectDescendantIds(graph, targetPageId)) {
    const node = graph.getNode(childId)
    if (!node || node.type !== 'PATHWAY_GLYPH') continue
    const key = matchBy === 'name_and_type'
      ? `${getPathwayData(node)?.glyphType ?? 'unknown'}:${node.name}`
      : node.name
    targetEntityMap.set(key, node.id)
  }

  const nameToId = new Map<string, string>()
  let mergedEntities = 0

  for (const childId of collectDescendantIds(graph, sourcePageId)) {
    const node = graph.getNode(childId)
    if (!node) continue

    if (node.type === 'PATHWAY_GLYPH') {
      const key = matchBy === 'name_and_type'
        ? `${getPathwayData(node)?.glyphType ?? 'unknown'}:${node.name}`
        : `glyph:${node.name}`
      const existingId = targetEntityMap.get(key)

      if (existingId) {
        nameToId.set(key, existingId)
        mergedEntities++
      } else {
        const clone = graph.createNode('PATHWAY_GLYPH', targetPageId, {
          name: node.name,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        })
        const data = getPathwayData(node)
        if (data) updatePathwayData(clone, data)
        nameToId.set(key, clone.id)
        targetEntityMap.set(key, clone.id)
      }
    } else if (node.type === 'PATHWAY_PROCESS') {
      const key = matchBy === 'name_and_type'
        ? `${getPathwayData(node)?.processType ?? 'unknown'}:${node.name}`
        : `process:${node.name}`
      const clone = graph.createNode('PATHWAY_PROCESS', targetPageId, {
        name: node.name,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      })
      const data = getPathwayData(node)
      if (data) updatePathwayData(clone, data)
      nameToId.set(key, clone.id)
    }
  }

  for (const childId of collectDescendantIds(graph, sourcePageId)) {
    const node = graph.getNode(childId)
    if (!node || node.type !== 'PATHWAY_ARC') continue

    const data = getPathwayData(node)
    if (!data?.sourceId || !data?.targetId || !data.arcType) continue

    const sourceNode = graph.getNode(data.sourceId)
    const targetNode = graph.getNode(data.targetId)
    if (!sourceNode || !targetNode) continue

    const sourceKey = matchBy === 'name_and_type'
      ? `${getPathwayData(sourceNode)?.glyphType ?? getPathwayData(sourceNode)?.processType ?? 'unknown'}:${sourceNode.name}`
      : (sourceNode.type === 'PATHWAY_PROCESS' ? `process:${sourceNode.name}` : `glyph:${sourceNode.name}`)
    const targetKey = matchBy === 'name_and_type'
      ? `${getPathwayData(targetNode)?.glyphType ?? getPathwayData(targetNode)?.processType ?? 'unknown'}:${targetNode.name}`
      : (targetNode.type === 'PATHWAY_PROCESS' ? `process:${targetNode.name}` : `glyph:${targetNode.name}`)

    const newSourceId = nameToId.get(sourceKey)
    const newTargetId = nameToId.get(targetKey)

    if (!newSourceId || !newTargetId) continue

    const arc = graph.createNode('PATHWAY_ARC', targetPageId, {
      name: node.name,
    })
    updatePathwayData(arc, { arcType: data.arcType, sourceId: newSourceId, targetId: newTargetId })
  }

  let totalEntities = 0
  let totalArcs = 0
  let totalProcesses = 0
  for (const childId of collectDescendantIds(graph, targetPageId)) {
    const n = graph.getNode(childId)
    if (!n) continue
    if (n.type === 'PATHWAY_GLYPH') totalEntities++
    else if (n.type === 'PATHWAY_ARC') totalArcs++
    else if (n.type === 'PATHWAY_PROCESS') totalProcesses++
  }

  return { mergedEntities, totalEntities, totalArcs, totalProcesses }
}

function collectDescendantIds(graph: SceneGraph, parentId: string): string[] {
  const ids: string[] = []
  const stack = [parentId]
  while (stack.length > 0) {
    const id = stack.pop()
    if (!id) break
    const node = graph.getNode(id)
    if (!node) continue
    if (id !== parentId) ids.push(id)
    stack.push(...node.childIds)
  }
  return ids
}
