import type { ChatTransport, UIMessage } from 'ai'

import type { EditorStore } from '@/app/editor/session/create'

export interface SignalForgeTestHooks {
  writeCount?: () => number
  mockHandle?: FileSystemFileHandle
  savedOpen?: Window['open']
}

export interface SignalForgeWindowAPI {
  getStore?: () => EditorStore
  setChatTransport?: (factory: () => ChatTransport<UIMessage>) => void
  openFile?: (path: string) => Promise<void>
  test?: SignalForgeTestHooks
}

declare global {
  interface Window {
    openPencil?: SignalForgeWindowAPI
  }
}

let activeStore: EditorStore | null = null

function windowApi(): SignalForgeWindowAPI {
  window.openPencil ??= {}
  window.openPencil.getStore ??= () => {
    if (!activeStore) throw new Error('SignalForge store not initialized')
    return activeStore
  }
  return window.openPencil
}

export function setSignalForgeStore(store: EditorStore) {
  activeStore = store
  windowApi()
}

export function exposeChatTransportOverride(
  setChatTransport: (factory: () => ChatTransport<UIMessage>) => void
) {
  windowApi().setChatTransport = setChatTransport
}

export function setSignalForgeOpenFileHandler(openFile: (path: string) => Promise<void>) {
  windowApi().openFile = openFile
}
