import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createSignal, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'

export interface WindowHandle {
  show(): void
  hide(): void
  toggle(): void
  close(): void
  visible: Accessor<boolean>
  setPosition(x: number, y: number): void
  setSize(w: number, h: number): void
  setAlwaysOnTop(value: boolean): void
  center(): void
}

export function useWindow(id: string): WindowHandle {
  const [visible, setVisible] = createSignal(true)
  const unlisten = listen<{ id: string; visible: boolean }>(
    'window:visibility-changed',
    (event) => {
      if (event.payload.id === id) setVisible(event.payload.visible)
    },
  )
  try { onCleanup(() => { unlisten.then((fn) => fn()) }) } catch {}
  return {
    show: () => invoke('window_show', { id }),
    hide: () => invoke('window_hide', { id }),
    toggle: () => invoke('window_toggle', { id }),
    close: () => invoke('window_close', { id }),
    visible,
    setPosition: (x: number, y: number) => invoke('window_set_position', { id, x, y }),
    setSize: (w: number, h: number) => invoke('window_set_size', { id, width: w, height: h }),
    setAlwaysOnTop: (value: boolean) => invoke('window_set_always_on_top', { id, value }),
    center: () => invoke('window_center', { id }),
  }
}
