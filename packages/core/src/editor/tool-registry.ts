import type { Tool } from './types'

export interface EditorToolDef {
  key: Tool
  label: string
  shortcut: string
  flyout?: Tool[]
}

export const EDITOR_TOOLS: EditorToolDef[] = [
  { key: 'SELECT', label: 'Move', shortcut: 'V' },
  { key: 'FRAME', label: 'Frame', shortcut: 'F', flyout: ['FRAME', 'SECTION'] },
  {
    key: 'RECTANGLE',
    label: 'Rectangle',
    shortcut: 'R',
    flyout: ['RECTANGLE', 'LINE', 'ELLIPSE', 'POLYGON', 'STAR']
  },
  { key: 'PEN', label: 'Pen', shortcut: 'P' },
  { key: 'TEXT', label: 'Text', shortcut: 'T' },
  { key: 'HAND', label: 'Hand', shortcut: 'H' },
  { key: 'PATHWAY_GLYPH', label: 'Pathway Entity', shortcut: 'W',
    flyout: ['PATHWAY_GLYPH', 'PATHWAY_PROCESS', 'COMPARTMENT'] },
  { key: 'PATHWAY_ARC', label: 'Pathway Arc', shortcut: 'Q' },
]

export const TOOL_SHORTCUTS: Partial<Record<string, Tool>> = {
  KeyV: 'SELECT',
  KeyF: 'FRAME',
  KeyS: 'SECTION',
  KeyR: 'RECTANGLE',
  KeyO: 'ELLIPSE',
  KeyL: 'LINE',
  KeyT: 'TEXT',
  KeyP: 'PEN',
  KeyH: 'HAND',
  KeyW: 'PATHWAY_GLYPH',
  KeyQ: 'PATHWAY_ARC',
}
