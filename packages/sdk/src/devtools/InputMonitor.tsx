import { createSignal, onMount, onCleanup, For, type Component } from 'solid-js'
import { safeInvoke, safeListen } from '../tauri'

interface KeyEvent {
  id: number
  key: string
  pressed: boolean
  timestamp: number
}

interface HotkeyInfo {
  id: string
  keys: string[]
}

const MAX_EVENTS = 200
let eventId = 0

export const InputMonitor: Component = () => {
  const [keyEvents, setKeyEvents] = createSignal<KeyEvent[]>([])
  const [hotkeys, setHotkeys] = createSignal<HotkeyInfo[]>([])
  const [activeHotkeys, setActiveHotkeys] = createSignal<Set<string>>(new Set())
  let scrollRef: HTMLDivElement | undefined

  const loadHotkeys = async () => {
    const data = await safeInvoke<HotkeyInfo[]>('devtools_list_hotkeys')
    if (data) setHotkeys(data)
  }

  onMount(async () => {
    await loadHotkeys()

    const unlistenKey = await safeListen<{ key: string; pressed: boolean }>(
      'input:key-event',
      (event) => {
        const entry: KeyEvent = {
          id: ++eventId,
          key: event.payload.key,
          pressed: event.payload.pressed,
          timestamp: Date.now(),
        }
        setKeyEvents((prev) => {
          const next = [...prev, entry]
          return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
        })
        if (scrollRef) {
          requestAnimationFrame(() => {
            scrollRef!.scrollTop = scrollRef!.scrollHeight
          })
        }
      },
    )

    const unlistenHotkey = await safeListen<{ id: string; phase: string }>(
      'input:hotkey-triggered',
      (event) => {
        const { id, phase } = event.payload
        setActiveHotkeys((prev) => {
          const next = new Set(prev)
          if (phase === 'press') next.add(id)
          else next.delete(id)
          return next
        })
      },
    )

    onCleanup(() => {
      unlistenKey()
      unlistenHotkey()
    })
  })

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
  }

  return (
    <div style={{ display: 'flex', gap: '12px', height: '100%' }}>
      <div style={{ flex: '1', display: 'flex', 'flex-direction': 'column', 'min-width': '0' }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'padding-bottom': '4px', 'border-bottom': '1px solid #2a2a4a' }}>
          <span style={{ color: '#888', 'font-size': '11px' }}>Key Events</span>
          <button
            onClick={() => setKeyEvents([])}
            style={{ background: '#2a2a4a', border: 'none', color: '#e0e0e0', padding: '2px 8px', 'border-radius': '4px', cursor: 'pointer', 'font-size': '11px' }}
          >
            Clear
          </button>
        </div>
        <div ref={scrollRef} style={{ flex: '1', overflow: 'auto', 'font-size': '11px', 'line-height': '1.6', 'margin-top': '4px' }}>
          <For each={keyEvents()}>
            {(entry) => (
              <div style={{ display: 'flex', gap: '8px', padding: '1px 4px' }}>
                <span style={{ color: '#555', 'min-width': '85px' }}>{formatTime(entry.timestamp)}</span>
                <span style={{ color: entry.pressed ? '#50fa7b' : '#ff5555', 'min-width': '16px' }}>
                  {entry.pressed ? '\u25BC' : '\u25B2'}
                </span>
                <span style={{ color: '#f8f8f2', 'font-weight': entry.pressed ? 'bold' : 'normal' }}>
                  {entry.key}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>

      <div style={{ width: '240px', 'flex-shrink': '0', 'border-left': '1px solid #2a2a4a', 'padding-left': '12px' }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'padding-bottom': '4px', 'border-bottom': '1px solid #2a2a4a' }}>
          <span style={{ color: '#888', 'font-size': '11px' }}>Registered Hotkeys</span>
          <button
            onClick={loadHotkeys}
            style={{ background: '#2a2a4a', border: 'none', color: '#e0e0e0', padding: '2px 8px', 'border-radius': '4px', cursor: 'pointer', 'font-size': '11px' }}
          >
            Refresh
          </button>
        </div>
        <div style={{ 'margin-top': '4px' }}>
          <For each={hotkeys()}>
            {(hk) => (
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                padding: '4px 8px',
                'border-radius': '4px',
                'margin-bottom': '2px',
                background: activeHotkeys().has(hk.id) ? '#6c63ff33' : '#1e1e3a',
                transition: 'background 0.2s',
              }}>
                <span style={{ color: '#f8f8f2', 'font-size': '11px' }}>{hk.id}</span>
                <span style={{ color: '#bd93f9', 'font-size': '10px' }}>
                  {hk.keys.join(' + ')}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}
