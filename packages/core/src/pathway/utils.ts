import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import type { CanvasKit } from 'canvaskit-wasm'

import { parseColor } from '#core/color'

export function hexToCKColor(ck: CanvasKit, hex: string): Float32Array {
  const c = parseColor(hex)
  return ck.Color4f(c.r, c.g, c.b, c.a)
}

export function collectPathwayArcs(graph: SceneGraph, pageId: string): SceneNode[] {
  const arcs: SceneNode[] = []
  const page = graph.getNode(pageId)
  if (!page) return arcs

  const stack = [...page.childIds]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const node = graph.getNode(current)
    if (!node) continue
    if (node.type === 'PATHWAY_ARC') arcs.push(node)
    stack.push(...node.childIds)
  }
  return arcs
}
