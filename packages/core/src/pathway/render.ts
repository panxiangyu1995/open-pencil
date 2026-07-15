import type { Canvas } from 'canvaskit-wasm'

import { type SceneNode, type SceneGraph, getPathwayData } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'

import { paintPathwayGlyph } from './glyphs'
import { paintPathwayProcess } from './processes'
import { paintPathwayArc } from './arcs'
import { paintPathwayLabel, paintCompartmentLabel, paintStateVariables, paintCloneMarker } from './labels'
import { SBGN_STYLE, type PathwayStyle } from './constants'
import { hexToCKColor } from './utils'

export function renderPathwayGlyph(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode
): void {
  const data = getPathwayData(node)
  if (!data) return

  const style: PathwayStyle = r.pathwayStyle
  const ck = r.ck

  r.fillPaint.setStyle(ck.PaintStyle.Fill)
  r.strokePaint.setStyle(ck.PaintStyle.Stroke)

  paintPathwayGlyph(ck, canvas, node, data, style, r)

  if (data.cloneMarker) {
    paintCloneMarker(ck, canvas, node, data, r)
  }

  paintPathwayLabel(ck, canvas, node, data, r)

  paintStateVariables(ck, canvas, node, data, r)
}

export function renderPathwayProcess(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode
): void {
  const data = getPathwayData(node)
  if (!data) return

  const style: PathwayStyle = r.pathwayStyle
  const ck = r.ck

  r.fillPaint.setStyle(ck.PaintStyle.Fill)
  r.strokePaint.setStyle(ck.PaintStyle.Stroke)

  paintPathwayProcess(ck, canvas, node, data, style, r)

  if (node.name) {
    paintPathwayLabel(ck, canvas, node, data, r)
  }
}

export function renderPathwayArc(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  graph: SceneGraph
): void {
  const data = getPathwayData(node)
  if (!data) return

  const style: PathwayStyle = r.pathwayStyle
  const ck = r.ck
  r.fillPaint.setStyle(ck.PaintStyle.Fill)
  r.strokePaint.setStyle(ck.PaintStyle.Stroke)

  canvas.save()
  canvas.translate(-node.x, -node.y)
  paintPathwayArc(ck, canvas, node, data, graph, style, r)
  canvas.restore()
}

export function renderCompartment(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode
): void {
  const style: PathwayStyle = r.pathwayStyle
  const ck = r.ck
  const w = node.width
  const h = node.height

  const path = new ck.Path()
  try {
    const x0 = w * 0.03
    const x1 = w * 0.97
    const y0 = h * 0.03
    const y1 = h * 0.97

    path.moveTo(w * 0.05, y0)
    path.lineTo(w * 0.25, 0)
    path.lineTo(w * 0.75, 0)
    path.lineTo(w * 0.95, y0)

    path.quadTo(w, h * 0.25, x1, h * 0.25)
    path.quadTo(x1, h * 0.5, x1, h * 0.75)
    path.quadTo(w * 0.95, h, w * 0.75, h)
    path.lineTo(w * 0.25, h)
    path.quadTo(w * 0.05, h, x0, h * 0.75)
    path.quadTo(x0, h * 0.5, x0, h * 0.25)
    path.close()

    const fillColor = style === 'publication'
      ? hexToCKColor(ck, 'rgba(0, 0, 0, 0.03)')
      : hexToCKColor(ck, SBGN_STYLE.nodeBackgroundColor)
    r.fillPaint.setColor(fillColor)
    r.fillPaint.setAlphaf(0.15)
    canvas.drawPath(path, r.fillPaint)
    r.fillPaint.setAlphaf(1)

    r.strokePaint.setColor(hexToCKColor(ck, SBGN_STYLE.nodeBorderColor))
    r.strokePaint.setStrokeWidth(SBGN_STYLE.compartmentBorderWidth)
    r.strokePaint.setStyle(ck.PaintStyle.Stroke)
    canvas.drawPath(path, r.strokePaint)
  } finally {
    path.delete()
  }

  paintCompartmentLabel(ck, canvas, node, r)
}
