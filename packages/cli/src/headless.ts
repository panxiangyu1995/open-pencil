import { readFile } from 'node:fs/promises'

import { BUILTIN_IO_FORMATS, IORegistry, initCanvasKit } from '@signal-forge/core/io'
import { computeAllLayouts } from '@signal-forge/core/layout'
import type { SceneGraph } from '@signal-forge/scene-graph'

export { initCanvasKit }

const io = new IORegistry(BUILTIN_IO_FORMATS)

export async function loadDocument(filePath: string): Promise<SceneGraph> {
  const bytes = new Uint8Array(await readFile(filePath))
  const { graph } = await io.readDocument({ name: filePath, data: bytes })
  computeAllLayouts(graph)
  return graph
}
