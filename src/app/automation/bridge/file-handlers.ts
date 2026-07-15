import { FigmaAPI } from '@open-pencil/core/figma-api'

import {
  resolveAutomationTarget,
  responseWithTarget,
  type AutomationTarget
} from '@/app/automation/bridge/target'
import { openFileFromPath } from '@/app/shell/menu/use'
import { createTab, getActiveStore, openFileInNewTab } from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'

export async function handleSaveFile(target: AutomationTarget, args: unknown): Promise<unknown> {
  const store = target.store
  const path = (args as { path?: string }).path
  if (path) {
    store.setPlannedFilePath(path)
    await ensureTauriParentDirectory(path)
  }
  await store.saveFigFile()
  if (path) store.startWatchingCurrentFile()
  return { ok: true }
}

export async function ensureTauriParentDirectory(path: string): Promise<void> {
  if (!isTauri()) return
  const [{ dirname }, { mkdir }] = await Promise.all([
    import('@tauri-apps/api/path'),
    import('@tauri-apps/plugin-fs')
  ])
  const dir = await dirname(path)
  if (dir === path) return
  await mkdir(dir, { recursive: true })
}

export async function handleNewDocument(
  _target: AutomationTarget,
  args: unknown
): Promise<unknown> {
  const { path, template } = args as { path?: string; template?: string }
  const tab = createTab()

  if (template === 'pathway') {
    const figma = new FigmaAPI(tab.store.graph)
    const page = figma.currentPage

    const extracellular = figma.createCompartment('Extracellular', {
      x: 0, y: 0, width: 1200, height: 200
    })
    page.appendChild(extracellular)

    const membrane = figma.createCompartment('Membrane', {
      x: 0, y: 200, width: 1200, height: 150
    })
    page.appendChild(membrane)

    const cytoplasm = figma.createCompartment('Cytoplasm', {
      x: 0, y: 350, width: 1200, height: 500
    })
    page.appendChild(cytoplasm)

    const nucleus = figma.createCompartment('Nucleus', {
      x: 400, y: 400, width: 400, height: 350
    })
    cytoplasm.appendChild(nucleus)
  }

  if (path) {
    tab.store.setPlannedFilePath(path)
    await ensureTauriParentDirectory(path)
    await tab.store.saveFigFile()
    tab.store.startWatchingCurrentFile()
  }
  const target = resolveAutomationTarget(tab.store, { document_id: tab.id })
  return responseWithTarget({ ok: true, result: { created: true } }, target)
}

export async function handleOpenFile(_target: AutomationTarget, args: unknown): Promise<unknown> {
  const path = (args as { path?: string }).path
  if (!path) throw new Error('Missing "path" in args')
  if (isTauri()) {
    await openFileFromPath(path)
  } else {
    const response = await fetch(path)
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`)
    const name = path.split(/[\\/]/).pop() ?? 'file.fig'
    const file = new File([await response.blob()], name)
    await openFileInNewTab(file, undefined, path)
  }
  const target = resolveAutomationTarget(getActiveStore(), undefined)
  return responseWithTarget({ ok: true, result: { opened: true } }, target)
}
