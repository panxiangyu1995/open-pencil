import type { Fill, NodeType, SceneNode } from '@open-pencil/scene-graph'

import {
  BLACK,
  DEFAULT_FRAME_FILL,
  DEFAULT_SHAPE_FILL,
  SECTION_DEFAULT_FILL,
  SECTION_DEFAULT_STROKE
} from '#core/constants'

import { createPenActions } from './shapes/pen'
import { adoptNodesIntoSection as adoptNodesIntoSectionImpl } from './shapes/section-adopt'
import type { EditorContext } from './types'
export type { PenDragOptions } from './shapes/pen'

const BLACK_FILL: Fill = {
  type: 'SOLID',
  color: BLACK,
  opacity: 1,
  visible: true
}

const NO_FILL: Fill = {
  type: 'SOLID',
  color: { r: 1, g: 1, b: 1, a: 0 },
  opacity: 0,
  visible: true
}

const PATHWAY_ENTITY_FILL: Fill = {
  type: 'SOLID',
  color: { r: 1, g: 1, b: 1, a: 1 },
  opacity: 1,
  visible: true
}

const COMPARTMENT_FILL: Fill = {
  type: 'SOLID',
  color: { r: 0.95, g: 0.95, b: 0.95, a: 0.15 },
  opacity: 1,
  visible: true
}

const DEFAULT_FILLS: Record<string, Fill> = {
  FRAME: DEFAULT_FRAME_FILL,
  SECTION: SECTION_DEFAULT_FILL,
  RECTANGLE: DEFAULT_SHAPE_FILL,
  ELLIPSE: DEFAULT_SHAPE_FILL,
  POLYGON: DEFAULT_SHAPE_FILL,
  STAR: DEFAULT_SHAPE_FILL,
  LINE: BLACK_FILL,
  TEXT: BLACK_FILL,
  PATHWAY_GLYPH: PATHWAY_ENTITY_FILL,
  PATHWAY_PROCESS: PATHWAY_ENTITY_FILL,
  PATHWAY_ARC: NO_FILL,
  COMPARTMENT: COMPARTMENT_FILL
}

export function createShapeActions(ctx: EditorContext) {
  function createShape(
    type: NodeType,
    x: number,
    y: number,
    w: number,
    h: number,
    parentId?: string
  ): string {
    const fill = DEFAULT_FILLS[type] ?? DEFAULT_FILLS.RECTANGLE
    const pid = parentId ?? ctx.state.currentPageId
    const overrides: Partial<SceneNode> = {
      x,
      y,
      width: w,
      height: h,
      fills: [{ ...fill }]
    }
    if (type === 'SECTION') {
      overrides.strokes = [{ ...SECTION_DEFAULT_STROKE }]
      overrides.cornerRadius = 5
    }
    if (type === 'POLYGON') {
      overrides.pointCount = 3
    }
    if (type === 'STAR') {
      overrides.pointCount = 5
      overrides.starInnerRadius = 0.38
    }
    const node = ctx.graph.createNode(type, pid, overrides)
    const id = node.id
    const snapshot = { ...node }
    ctx.undo.push({
      label: `Create ${type.toLowerCase()}`,
      forward: () => {
        ctx.graph.createNode(snapshot.type, pid, snapshot)
      },
      inverse: () => {
        ctx.graph.deleteNode(id)
        const next = new Set(ctx.state.selectedIds)
        next.delete(id)
        ctx.setSelectedIds(next)
      }
    })
    return id
  }

  const penActions = createPenActions(ctx, createShape)

  function setTool(tool: typeof ctx.state.activeTool) {
    ctx.setActiveTool(tool)
  }

  return {
    createShape,
    ...penActions,
    adoptNodesIntoSection: (sectionId: string) => adoptNodesIntoSectionImpl(ctx, sectionId),
    setTool
  }
}
