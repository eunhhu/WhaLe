import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindow, type WindowHandle } from './useWindow'

export interface CurrentWindowHandle extends WindowHandle {
  id: string
}

export function useCurrentWindow(): CurrentWindowHandle {
  const current = getCurrentWebviewWindow()
  const handle = useWindow(current.label)
  return { ...handle, id: current.label }
}
