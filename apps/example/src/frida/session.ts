import { createSignal, onMount } from 'solid-js'
import {
  useDevice,
  useSession,
  isTauriRuntime,
  safeListen,
  type Device,
  type Session,
  type Process,
  type SessionHandle,
} from '@whale1/sdk'
import whaleConfig from '../../whale.config'

export type Phase = 'idle' | 'searching' | 'connected' | 'attached' | 'scripted'

export interface TrainerSession {
  phase: () => Phase
  device: () => Device | null
  processes: () => Process[]
  session: () => Session | null
  error: () => string | null

  refresh(): Promise<void>
  fetchProcesses(): Promise<void>
  spawnAndAttach(bundleId: string): Promise<void>
  attachToProcess(pid: number): Promise<void>
  loadScripts(): Promise<void>
  detach(): void
}

export function createTrainerSession(): TrainerSession {
  const [phase, setPhase] = createSignal<Phase>('idle')
  const [currentDevice, setCurrentDevice] = createSignal<Device | null>(null)
  const [processes, setProcesses] = createSignal<Process[]>([])
  const [currentSession, setCurrentSession] = createSignal<Session | null>(null)
  const [error, setError] = createSignal<string | null>(null)

  const configuredScripts = whaleConfig.frida?.scripts ?? []
  let sessionHandle: SessionHandle | null = null
  let deviceHandle: ReturnType<typeof useDevice> | null = null

  const refresh = async () => {
    if (!isTauriRuntime()) {
      setError('Tauri runtime required. Run with `whale dev` to enable Frida features.')
      setPhase('idle')
      return
    }

    setError(null)
    setPhase('searching')

    try {
      deviceHandle = useDevice({ type: 'usb' })
      await deviceHandle.refresh()

      const dev = deviceHandle.device()
      if (!dev) {
        setError('No USB device found. Connect a device and try again.')
        setPhase('idle')
        return
      }

      setCurrentDevice(dev)
      setPhase('connected')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to device')
      setPhase('idle')
    }
  }

  const fetchProcesses = async () => {
    if (!deviceHandle) {
      setError('No device connected')
      return
    }

    setError(null)

    try {
      const procs = await deviceHandle.enumerateProcesses()
      setProcesses(procs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enumerate processes')
    }
  }

  const attachToProcess = async (pid: number) => {
    if (!deviceHandle) {
      setError('No device connected')
      return
    }

    setError(null)

    try {
      const attached = await deviceHandle.attach(pid)
      sessionHandle = useSession(attached)
      setCurrentSession(attached)
      setPhase('attached')
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to attach to PID ${pid}`)
    }
  }

  const spawnAndAttach = async (bundleId: string) => {
    if (!deviceHandle) {
      setError('No device connected')
      return
    }

    setError(null)

    try {
      const spawned = await deviceHandle.spawn(bundleId)
      sessionHandle = useSession(spawned)
      setCurrentSession(spawned)
      setPhase('attached')

      // Resume the spawned process
      if (spawned.pid) {
        await deviceHandle.resume(spawned.pid)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to spawn ${bundleId}`)
    }
  }

  const loadScripts = async () => {
    if (!sessionHandle) {
      setError('No session attached')
      return
    }

    if (configuredScripts.length === 0) {
      setPhase('scripted')
      return
    }

    setError(null)

    try {
      for (const script of configuredScripts) {
        await sessionHandle.loadScriptFile(script.entry, script.store)
      }
      setPhase('scripted')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scripts')
    }
  }

  const detach = () => {
    if (sessionHandle) {
      sessionHandle.detach()
    }

    sessionHandle = null
    deviceHandle = null
    setCurrentSession(null)
    setCurrentDevice(null)
    setProcesses([])
    setError(null)
    setPhase('idle')
  }

  // Listen for external session detach
  if (isTauriRuntime()) {
    safeListen('frida:session-detached', () => {
      sessionHandle = null
      setCurrentSession(null)
      setError('Session detached unexpectedly')
      // Go back to connected if we still have a device
      if (currentDevice()) {
        setPhase('connected')
      } else {
        setPhase('idle')
      }
    })
  }

  // Auto-refresh on mount
  onMount(() => {
    void refresh()
  })

  return {
    phase,
    device: currentDevice,
    processes,
    session: currentSession,
    error,
    refresh,
    fetchProcesses,
    spawnAndAttach,
    attachToProcess,
    loadScripts,
    detach,
  }
}
