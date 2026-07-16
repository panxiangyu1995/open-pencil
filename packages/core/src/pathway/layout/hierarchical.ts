import type { SceneGraph, SceneNode } from '@signal-forge/scene-graph'
import { getPathwayData } from '@signal-forge/scene-graph'

import { collectPathwayArcs } from '#core/pathway/utils'

interface LayeredNode {
  id: string
  node: SceneNode
  layer: number
  order: number
}

export function hierarchicalLayout(
  graph: SceneGraph,
  pageId: string,
  options?: { direction?: 'top-bottom' | 'left-right'; spacing?: number }
): { positioned: number; layers: number } {
  const page = graph.getNode(pageId)
  if (!page) return { positioned: 0, layers: 0 }

  const pathwayNodes: SceneNode[] = []
  for (const childId of page.childIds) {
    const child = graph.getNode(childId)
    if (!child) continue
    if (child.type === 'PATHWAY_GLYPH' || child.type === 'PATHWAY_PROCESS') {
      pathwayNodes.push(child)
    }
  }

  const arcs = collectPathwayArcs(graph, pageId)

  const adjacencyDown = new Map<string, string[]>()
  for (const arc of arcs) {
    const data = getPathwayData(arc)
    if (!data?.sourceId || !data?.targetId) continue
    const downs = adjacencyDown.get(data.sourceId) ?? []
    downs.push(data.targetId)
    adjacencyDown.set(data.sourceId, downs)
  }

  const layerMap = new Map<string, number>()

  const queue: Array<{ id: string; layer: number }> = []

  const sourceIds = new Set(arcs.map(a => getPathwayData(a)?.sourceId).filter((x): x is string => x != null))
  const targetIds = new Set(arcs.map(a => getPathwayData(a)?.targetId).filter((x): x is string => x != null))
  const rootIds = pathwayNodes.filter(n => !targetIds.has(n.id))

  for (const root of rootIds.length > 0 ? rootIds : pathwayNodes) {
    queue.push({ id: root.id, layer: 0 })
  }

  while (queue.length > 0) {
    const item = queue.shift()!
    const existing = layerMap.get(item.id) ?? -1
    if (item.layer <= existing) continue
    layerMap.set(item.id, item.layer)
    const downs = adjacencyDown.get(item.id) ?? []
    for (const downId of downs) {
      queue.push({ id: downId, layer: item.layer + 1 })
    }
  }

  for (const node of pathwayNodes) {
    if (!layerMap.has(node.id)) {
      layerMap.set(node.id, 0)
    }
  }

  const maxLayer = Math.max(...layerMap.values(), 0)
  const layers: Map<number, string[]> = new Map()
  for (let i = 0; i <= maxLayer; i++) layers.set(i, [])
  for (const [id, layer] of layerMap) {
    layers.get(layer)?.push(id)
  }

  const direction = options?.direction ?? 'top-bottom'
  const spacing = options?.spacing ?? 60
  const verticalSpacing = direction === 'top-bottom' ? spacing * 1.5 : spacing
  const horizontalSpacing = direction === 'left-right' ? spacing * 1.5 : spacing

  for (let layer = 0; layer <= maxLayer; layer++) {
    const ids = layers.get(layer) ?? []
    if (direction === 'left-right') {
      const totalHeight = ids.reduce((sum, id) => {
        const n = graph.getNode(id)
        return sum + (n?.height ?? 0)
      }, 0) + (ids.length - 1) * horizontalSpacing
      let y = -totalHeight / 2

      for (const id of ids) {
        const n = graph.getNode(id)
        if (!n) continue
        graph.updateNode(id, {
          x: layer * verticalSpacing + n.width / 2,
          y: y + n.height / 2
        })
        y += n.height + horizontalSpacing
      }
    } else {
      const totalWidth = ids.reduce((sum, id) => {
        const n = graph.getNode(id)
        return sum + (n?.width ?? 0)
      }, 0) + (ids.length - 1) * horizontalSpacing
      let x = -totalWidth / 2

      for (const id of ids) {
        const n = graph.getNode(id)
        if (!n) continue
        graph.updateNode(id, {
          x: x + n.width / 2,
          y: layer * verticalSpacing + n.height / 2
        })
        x += n.width + horizontalSpacing
      }
    }
  }

  expandCompartments(graph, pageId)

  return { positioned: pathwayNodes.length, layers: maxLayer + 1 }
}

function expandCompartments(graph: SceneGraph, pageId: string): void {
  const page = graph.getNode(pageId)
  if (!page) return

  const padding = 40

  for (const childId of page.childIds) {
    const child = graph.getNode(childId)
    if (child?.type !== 'COMPARTMENT') continue

    if (child.childIds.length === 0) continue

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const gcId of child.childIds) {
      const gc = graph.getNode(gcId)
      if (!gc) continue
      minX = Math.min(minX, gc.x)
      minY = Math.min(minY, gc.y)
      maxX = Math.max(maxX, gc.x + gc.width)
      maxY = Math.max(maxY, gc.y + gc.height)
    }

    if (minX === Infinity) continue

    graph.updateNode(child.id, {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    })
  }
}
