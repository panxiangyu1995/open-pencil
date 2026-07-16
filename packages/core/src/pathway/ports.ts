import type { SceneNode } from '@signal-forge/scene-graph'
import type { PathwayNodeData } from '@signal-forge/scene-graph'

import { SBGN_STYLE } from './constants'

export interface PortPosition {
  side: 'top' | 'right' | 'bottom' | 'left'
  x: number
  y: number
}

export interface PortInfo {
  ports: PortPosition[]
}

export function computePortPositions(node: SceneNode, data: PathwayNodeData): PortInfo {
  const w = node.width
  const h = node.height
  const glyphType = data.glyphType

  if (glyphType === 'complex') {
    const cut = Math.min(SBGN_STYLE.complexCornerCutLength, w / 2, h / 2)
    return {
      ports: [
        { side: 'top', x: w / 2, y: cut },
        { side: 'right', x: w - cut, y: h / 2 },
        { side: 'bottom', x: w / 2, y: h - cut },
        { side: 'left', x: cut, y: h / 2 },
      ]
    }
  }

  if (glyphType === 'source_sink') {
    return {
      ports: [
        { side: 'top', x: w / 2, y: h * 0.15 },
        { side: 'right', x: w * 0.85, y: h / 2 },
        { side: 'bottom', x: w / 2, y: h * 0.85 },
        { side: 'left', x: w * 0.15, y: h / 2 },
      ]
    }
  }

  return {
    ports: [
      { side: 'top', x: w / 2, y: 0 },
      { side: 'right', x: w, y: h / 2 },
      { side: 'bottom', x: w / 2, y: h },
      { side: 'left', x: 0, y: h / 2 },
    ]
  }
}

export function findNearestPort(
  node: SceneNode,
  data: PathwayNodeData,
  targetPoint: { x: number; y: number }
): PortPosition {
  const info = computePortPositions(node, data)
  if (info.ports.length === 0) {
    return { side: 'top', x: node.width / 2, y: 0 }
  }
  let nearest = info.ports[0]
  let minDist = Infinity

  for (const port of info.ports) {
    const dx = port.x - targetPoint.x
    const dy = port.y - targetPoint.y
    const dist = dx * dx + dy * dy
    if (dist < minDist) {
      minDist = dist
      nearest = port
    }
  }

  return nearest
}
