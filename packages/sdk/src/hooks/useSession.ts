import { createEffect, createSignal, getOwner, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'
import type { Session, Script, Process } from '../types'
import { safeInvoke, safeInvokeVoid, safeListen, isTauriRuntime } from '../tauri'
import type { DeviceHandle } from './useDevice'

export interface SessionHandle {
  status: Accessor<'attached' | 'detached'>
  loadScript(code: string, storeName?: string): Promise<Script>
  loadScriptFile(path: string, storeName?: string): Promise<Script>
  unloadScript(scriptId: string): Promise<void>
  detach(): void
}

export type Phase = 'idle' | 'searching' | 'connected' | 'attached' | 'scripted'

export interface ScriptConfig {
  entry: string
  store?: string
}

export interface IntegratedSessionHandle {
  phase: Accessor<Phase>
  processes: Accessor<Process[]>
  session: Accessor<Session | null>
  error: Accessor<string | null>
  fetchProcesses(): Promise<void>
  attachToProcess(pid: number): Promise<void>
  spawnAndAttach(bundleId: string): Promise<void>
  detach(): void
}

interface SessionCommands {
  loadScript(code: string, storeName?: string): Promise<Script>
  loadScriptFile(path: string, storeName?: string): Promise<Script>
  unloadScript(scriptId: string): Promise<void>
  detach(): void
}

function isDeviceHandle(v: Session | DeviceHandle): v is DeviceHandle {
  return typeof (v as DeviceHandle).enumerateProcesses === 'function'
}

function createSessionCommands(session: Session): SessionCommands {
  return {
    loadScript: async (code: string, storeName?: string) => {
      const payload = typeof storeName === 'string'
        ? { sessionId: session.id, code, storeName }
        : { sessionId: session.id, code }
      const scriptId = await safeInvoke<string>('frida_load_script', payload)
      if (!scriptId) throw new Error('Failed to load script')
      return { id: scriptId }
    },
    loadScriptFile: async (path: string, storeName?: string) => {
      const payload = typeof storeName === 'string'
        ? { sessionId: session.id, path, storeName }
        : { sessionId: session.id, path }
      const scriptId = await safeInvoke<string>('frida_load_script_file', payload)
      if (!scriptId) throw new Error('Failed to load script file')
      return { id: scriptId }
    },
    unloadScript: async (scriptId: string) => {
      await safeInvokeVoid('frida_unload_script', { scriptId })
    },
    detach: () => {
      safeInvokeVoid('frida_detach', { sessionId: session.id })
    },
  }
}

export function useSession(session: Session): SessionHandle
export function useSession(device: DeviceHandle, options?: { scripts?: ScriptConfig[] }): IntegratedSessionHandle
export function useSession(
  sessionOrDevice: Session | DeviceHandle,
  options?: { scripts?: ScriptConfig[] },
): SessionHandle | IntegratedSessionHandle {
  if (!isDeviceHandle(sessionOrDevice)) {
    // Overload 1: Session-based handle
    const session = sessionOrDevice
    const commands = createSessionCommands(session)
    const [status, setStatus] = createSignal<'attached' | 'detached'>('attached')
    const unlisten = safeListen<{ sessionId: string }>('frida:session-detached', (event) => {
      if (event.payload.sessionId === session.id) setStatus('detached')
    })
    if (getOwner()) onCleanup(() => { unlisten.then((fn) => fn()) })

    return {
      status,
      loadScript: commands.loadScript,
      loadScriptFile: commands.loadScriptFile,
      unloadScript: commands.unloadScript,
      detach: () => {
        commands.detach()
        setStatus('detached')
      },
    }
  }

  // Overload 2: integrated session manager with a DeviceHandle
  const deviceHandle = sessionOrDevice
  const configuredScripts = options?.scripts ?? []

  const [phase, setPhase] = createSignal<Phase>('idle')
  const [processes, setProcesses] = createSignal<Process[]>([])
  const [currentSession, setCurrentSession] = createSignal<Session | null>(null)
  const [error, setError] = createSignal<string | null>(null)

  let sessionCommands: SessionCommands | null = null

  const syncPhaseFromDevice = () => {
    if (currentSession()) return
    const devStatus = deviceHandle.status()
    if (devStatus === 'connected') setPhase('connected')
    else if (devStatus === 'searching') setPhase('searching')
    else {
      setPhase('idle')
      setProcesses([])
    }
  }

  syncPhaseFromDevice()
  if (getOwner()) {
    createEffect(() => {
      // Track status transitions from the underlying DeviceHandle.
      deviceHandle.status()
      syncPhaseFromDevice()
    })
  }

  // Listen for external session detach events from backend.
  if (isTauriRuntime()) {
    const unlisten = safeListen<{ sessionId: string }>('frida:session-detached', (event) => {
      const sess = currentSession()
      if (sess && event.payload.sessionId === sess.id) {
        sessionCommands = null
        setCurrentSession(null)
        setError('Session detached unexpectedly')
        syncPhaseFromDevice()
      }
    })
    if (getOwner()) onCleanup(() => { unlisten.then((fn) => fn()) })
  }

  const loadScripts = async (sess: Session) => {
    if (!sessionCommands || currentSession()?.id !== sess.id) {
      sessionCommands = createSessionCommands(sess)
    }
    if (configuredScripts.length === 0) {
      setPhase('scripted')
      return
    }

    try {
      for (const script of configuredScripts) {
        await sessionCommands.loadScriptFile(script.entry, script.store)
      }
      setPhase('scripted')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scripts')
    }
  }

  const fetchProcesses = async () => {
    setError(null)
    try {
      const procs = await deviceHandle.enumerateProcesses()
      setProcesses(procs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enumerate processes')
    }
  }

  const attachToProcess = async (pid: number) => {
    setError(null)
    try {
      const attached = await deviceHandle.attach(pid)
      sessionCommands = createSessionCommands(attached)
      setCurrentSession(attached)
      setPhase('attached')
      await loadScripts(attached)
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to attach to PID ${pid}`)
    }
  }

  const spawnAndAttach = async (bundleId: string) => {
    setError(null)
    try {
      const spawned = await deviceHandle.spawn(bundleId)
      sessionCommands = createSessionCommands(spawned)
      setCurrentSession(spawned)
      setPhase('attached')
      if (spawned.pid) {
        await deviceHandle.resume(spawned.pid)
      }
      await loadScripts(spawned)
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to spawn ${bundleId}`)
    }
  }

  const detach = () => {
    if (sessionCommands) {
      sessionCommands.detach()
    } else {
      const sess = currentSession()
      if (sess) {
        safeInvokeVoid('frida_detach', { sessionId: sess.id })
      }
    }
    sessionCommands = null
    setCurrentSession(null)
    setProcesses([])
    setError(null)
    syncPhaseFromDevice()
  }

  return {
    phase,
    processes,
    session: currentSession,
    error,
    fetchProcesses,
    attachToProcess,
    spawnAndAttach,
    detach,
  }
}
