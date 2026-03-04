import { createSignal, onMount, onCleanup, For, type Component } from 'solid-js'
import { getCurrentWindowLabel, isTauriRuntime, safeListen } from '../tauri'

interface LogEntry {
  id: number
  source: string
  level: string
  message: string
  timestamp: number
}

const MAX_LOGS = 1000
let logId = 0

const levelColors: Record<string, string> = {
  info: '#8be9fd',
  warn: '#f1fa8c',
  error: '#ff5555',
  debug: '#bd93f9',
}

const sourceColors: Record<string, string> = {
  frida: '#ff79c6',
  rust: '#ffb86c',
  store: '#50fa7b',
  event: '#8be9fd',
}

function normalizeLevel(level: unknown): string {
  if (typeof level !== 'string') return 'info'
  const lowered = level.toLowerCase()
  if (lowered === 'warning') return 'warn'
  if (['info', 'warn', 'error', 'debug'].includes(lowered)) return lowered
  return 'info'
}

function normalizeSource(source: unknown): string {
  if (typeof source !== 'string') return 'event'
  const lowered = source.toLowerCase()
  if (['frida', 'rust', 'store', 'event'].includes(lowered)) return lowered
  return 'event'
}

function normalizeMessage(message: unknown): string {
  if (typeof message === 'string') return message
  try {
    return JSON.stringify(message)
  } catch {
    return String(message)
  }
}

export const Console: Component = () => {
  const [logs, setLogs] = createSignal<LogEntry[]>([])
  const [autoScroll, setAutoScroll] = createSignal(true)
  const [levelFilter, setLevelFilter] = createSignal<Set<string>>(new Set(['info', 'warn', 'error', 'debug']))
  const [sourceFilter, setSourceFilter] = createSignal<Set<string>>(new Set(['frida', 'rust', 'store', 'event']))
  let scrollRef: HTMLDivElement | undefined

  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newEntry: LogEntry = {
      ...entry,
      id: ++logId,
      timestamp: Date.now(),
    }
    setLogs((prev) => {
      const next = [...prev, newEntry]
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next
    })
    if (autoScroll() && scrollRef) {
      requestAnimationFrame(() => {
        scrollRef!.scrollTop = scrollRef!.scrollHeight
      })
    }
  }

  onMount(async () => {
    addLog({
      source: 'event',
      level: 'debug',
      message: `console ready runtime=${String(isTauriRuntime())} window=${getCurrentWindowLabel() ?? 'unknown'}`,
    })

    const unlistenLog = await safeListen<{ source: string; level: string; message: string }>(
      'devtools:log',
      (event) =>
        addLog({
          source: normalizeSource(event.payload?.source),
          level: normalizeLevel(event.payload?.level),
          message: normalizeMessage(event.payload?.message),
        }),
    )

    onCleanup(() => unlistenLog())
  })

  const toggleLevel = (level: string) => {
    setLevelFilter((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  const toggleSource = (source: string) => {
    setSourceFilter((prev) => {
      const next = new Set(prev)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return next
    })
  }

  const filteredLogs = () =>
    logs().filter(
      (l) => levelFilter().has(l.level) && sourceFilter().has(l.source),
    )

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
  }

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '8px', padding: '4px 0', 'border-bottom': '1px solid #2a2a4a', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
        <button
          onClick={() => setLogs([])}
          style={{ background: '#2a2a4a', border: 'none', color: '#e0e0e0', padding: '2px 8px', 'border-radius': '4px', cursor: 'pointer', 'font-size': '11px' }}
        >
          Clear
        </button>
        <span style={{ color: '#666', 'font-size': '11px' }}>|</span>
        {['info', 'warn', 'error', 'debug'].map((level) => (
          <button
            onClick={() => toggleLevel(level)}
            style={{
              background: levelFilter().has(level) ? levelColors[level] + '22' : 'transparent',
              border: `1px solid ${levelFilter().has(level) ? levelColors[level] : '#333'}`,
              color: levelFilter().has(level) ? levelColors[level] : '#555',
              padding: '1px 6px',
              'border-radius': '3px',
              cursor: 'pointer',
              'font-size': '10px',
            }}
          >
            {level}
          </button>
        ))}
        <span style={{ color: '#666', 'font-size': '11px' }}>|</span>
        {['frida', 'rust', 'store', 'event'].map((source) => (
          <button
            onClick={() => toggleSource(source)}
            style={{
              background: sourceFilter().has(source) ? sourceColors[source] + '22' : 'transparent',
              border: `1px solid ${sourceFilter().has(source) ? sourceColors[source] : '#333'}`,
              color: sourceFilter().has(source) ? sourceColors[source] : '#555',
              padding: '1px 6px',
              'border-radius': '3px',
              cursor: 'pointer',
              'font-size': '10px',
            }}
          >
            {source}
          </button>
        ))}
        <div style={{ 'margin-left': 'auto' }}>
          <label style={{ 'font-size': '10px', color: '#888', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoScroll()}
              onChange={(e) => setAutoScroll(e.currentTarget.checked)}
              style={{ 'margin-right': '4px' }}
            />
            Auto-scroll
          </label>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: '1', overflow: 'auto', 'font-size': '11px', 'line-height': '1.6' }}>
        <For each={filteredLogs()}>
          {(entry) => (
            <div style={{ display: 'flex', gap: '8px', padding: '1px 4px', 'border-bottom': '1px solid #1a1a2e' }}>
              <span style={{ color: '#555', 'min-width': '85px', 'flex-shrink': '0' }}>{formatTime(entry.timestamp)}</span>
              <span style={{ color: sourceColors[entry.source] || '#888', 'min-width': '48px', 'flex-shrink': '0' }}>[{entry.source}]</span>
              <span style={{ color: levelColors[entry.level] || '#888', 'min-width': '40px', 'flex-shrink': '0' }}>{entry.level}</span>
              <span style={{ color: entry.level === 'error' ? '#ff5555' : '#e0e0e0', 'word-break': 'break-all' }}>{entry.message}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
