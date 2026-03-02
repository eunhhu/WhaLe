import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createSignal, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'
import type { Session, Script } from '../types'

export interface SessionHandle {
  status: Accessor<'attached' | 'detached'>
  loadScript(code: string): Promise<Script>
  loadScriptFile(path: string): Promise<Script>
  detach(): void
}

export function useSession(session: Session): SessionHandle {
  const [status, setStatus] = createSignal<'attached' | 'detached'>('attached')
  const unlisten = listen<{ sessionId: string }>('frida:session-detached', (event) => {
    if (event.payload.sessionId === session.id) setStatus('detached')
  })
  try { onCleanup(() => { unlisten.then((fn) => fn()) }) } catch {}
  return {
    status,
    loadScript: async (code: string) => {
      const scriptId = await invoke<string>('frida_load_script', { sessionId: session.id, code })
      return { id: scriptId }
    },
    loadScriptFile: async (path: string) => {
      const scriptId = await invoke<string>('frida_load_script_file', { sessionId: session.id, path })
      return { id: scriptId }
    },
    detach: () => { invoke('frida_detach', { sessionId: session.id }); setStatus('detached') },
  }
}
