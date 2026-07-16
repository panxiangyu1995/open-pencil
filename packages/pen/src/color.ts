import { converter, parse } from 'culori'

import { BLACK } from '@signal-forge/scene-graph/constants'
import type { Color } from '@signal-forge/scene-graph/primitives'

const rgbConverter = converter('rgb')

export function parseColor(input: string): Color {
  const parsedColor = parse(input)
  const rgbColor = parsedColor ? rgbConverter(parsedColor) : null

  return rgbColor
    ? {
        r: rgbColor.r,
        g: rgbColor.g,
        b: rgbColor.b,
        a: parsedColor?.alpha ?? 1
      }
    : structuredClone(BLACK)
}
