import { FigmaAPI, SceneGraph } from '@signal-forge/core'
export function createAPI(): FigmaAPI {
  return new FigmaAPI(new SceneGraph())
}
