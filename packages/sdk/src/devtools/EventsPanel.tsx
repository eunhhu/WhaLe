import { createSignal, onMount, onCleanup, For, type Component } from 'solid-js'
import { safeListen } from '../tauri'

interface EventEntry {
  id: number
  event: string
  payload: unknown
  timestamp: number
  expanded: boolean
}

const MAX_EVENTS = 500
let eventId = 0

const WATCHED_EVENTS = [
  'store:changed',
  'window:visibility-changed',
  'input:hotkey-triggered',
  'devtools:log',
  'devtools:event',
  'input:key-event',
]

const eventColors: Record<string, string> = {
  'store:changed': '#50fa7b',
  'window:visibility-changed': '#f1fa8c',
  'input:hotkey-triggered': '#ff79c6',
  'devtools:log': '#8be9fd',
  'devtools:event': '#bd93f9',
  'input:key-event': '#ffb86c',
}

export const EventsPanel: Component = () => {
  const [events, setEvents] = createSignal<EventEntry[]>([])
  const [filter, setFilter] = createSignal('')
  let scrollRef: HTMLDivElement | undefined
  const unlisteners: (() => void)[] = []

  const addEvent = (eventName: string, payload: unknown) => {
    const entry: EventEntry = {
      id: ++eventId,
      event: eventName,
      payload,
      timestamp: Date.now(),
      expanded: false,
    }
    setEvents((prev) => {
      const next = [...prev, entry]
      return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
    })
    if (scrollRef) {
      requestAnimationFrame(() => {
        scrollRef!.scrollTop = scrollRef!.scrollHeight
      })
    }
  }

  const toggleExpand = (id: number) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e)),
    )
  }

  onMount(async () => {
    for (const eventName of WATCHED_EVENTS) {
      const unlisten = await safeListen<unknown>(eventName, (event) => {
        addEvent(eventName, event.payload)
      })
      unlisteners.push(unlisten)
    }

    onCleanup(() => {
      unlisteners.forEach((fn) => fn())
    })
  })

  const filteredEvents = () => {
    const f = filter().toLowerCase()
    if (!f) return events()
    return events().filter((e) => e.event.toLowerCase().includes(f))
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
  }

  const formatPayload = (payload: unknown): string => {
    try {
      return JSON.stringify(payload, null, 2)
    } catch {
      return String(payload)
    }
  }

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '8px', padding: '4px 0', 'border-bottom': '1px solid #2a2a4a', 'align-items': 'center' }}>
        <button
          onClick={() => setEvents([])}
          style={{ background: '#2a2a4a', border: 'none', color: '#e0e0e0', padding: '2px 8px', 'border-radius': '4px', cursor: 'pointer', 'font-size': '11px' }}
        >
          Clear
        </button>
        <input
          placeholder="Filter events..."
          value={filter()}
          onInput={(e) => setFilter(e.currentTarget.value)}
          style={{
            flex: '1',
            background: '#2a2a4a',
            border: '1px solid #333',
            color: '#e0e0e0',
            padding: '3px 8px',
            'border-radius': '4px',
            'font-family': 'inherit',
            'font-size': '11px',
          }}
        />
        <span style={{ color: '#555', 'font-size': '10px' }}>{filteredEvents().length} events</span>
      </div>

      <div ref={scrollRef} style={{ flex: '1', overflow: 'auto', 'font-size': '11px', 'line-height': '1.6', 'margin-top': '4px' }}>
        <For each={filteredEvents()}>
          {(entry) => (
            <div style={{ 'border-bottom': '1px solid #1a1a2e' }}>
              <div
                onClick={() => toggleExpand(entry.id)}
                style={{ display: 'flex', gap: '8px', padding: '2px 4px', cursor: 'pointer' }}
              >
                <span style={{ color: '#555', 'min-width': '85px', 'flex-shrink': '0' }}>
                  {formatTime(entry.timestamp)}
                </span>
                <span style={{ color: '#666', 'min-width': '14px' }}>
                  {entry.expanded ? '\u25BC' : '\u25B6'}
                </span>
                <span style={{ color: eventColors[entry.event] || '#888', 'font-weight': 'bold' }}>
                  {entry.event}
                </span>
              </div>
              {entry.expanded && (
                <pre style={{
                  margin: '0',
                  padding: '4px 8px 4px 110px',
                  color: '#8be9fd',
                  'font-size': '10px',
                  'white-space': 'pre-wrap',
                  'word-break': 'break-all',
                  background: '#16162a',
                }}>
                  {formatPayload(entry.payload)}
                </pre>
              )}
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
