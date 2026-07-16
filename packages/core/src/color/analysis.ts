import type { Color } from '@signal-forge/scene-graph/primitives'

export interface ColorUsageEntry {
  hex: string
  color: Color
  count: number
  variableName: string | null
}
