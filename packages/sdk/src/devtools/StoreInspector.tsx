import { createSignal, onMount, onCleanup, For, type Component } from 'solid-js'
import { safeInvoke, safeListen, safeInvokeVoid } from '../tauri'

type StoreData = Record<string, Record<string, unknown>>

export const StoreInspector: Component = () => {
  const [stores, setStores] = createSignal<StoreData>({})
  const [editingKey, setEditingKey] = createSignal<string | null>(null)
  const [editValue, setEditValue] = createSignal('')
  const [flashKeys, setFlashKeys] = createSignal<Set<string>>(new Set())

  const refresh = async () => {
    const data = await safeInvoke<StoreData>('devtools_list_stores')
    if (data) setStores(data)
  }

  onMount(async () => {
    await refresh()

    const unlisten = await safeListen<{ store: string; patch: Record<string, unknown> }>(
      'store:changed',
      (event) => {
        const { store, patch } = event.payload
        setStores((prev) => ({
          ...prev,
          [store]: { ...prev[store], ...patch },
        }))

        const changedKeys = Object.keys(patch).map((k) => `${store}.${k}`)
        setFlashKeys((prev) => new Set([...prev, ...changedKeys]))
        setTimeout(() => {
          setFlashKeys((prev) => {
            const next = new Set(prev)
            changedKeys.forEach((k) => next.delete(k))
            return next
          })
        }, 500)
      },
    )

    onCleanup(() => unlisten())
  })

  const startEdit = (storeName: string, key: string, value: unknown) => {
    setEditingKey(`${storeName}.${key}`)
    setEditValue(JSON.stringify(value))
  }

  const commitEdit = (storeName: string, key: string) => {
    try {
      const parsed = JSON.parse(editValue())
      setStores((prev) => ({
        ...prev,
        [storeName]: { ...prev[storeName], [key]: parsed },
      }))
      safeInvokeVoid('store_set', { name: storeName, key, value: parsed })
      setEditingKey(null)
    } catch {
      // Invalid JSON
    }
  }

  const cancelEdit = () => setEditingKey(null)

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <span style={{ color: '#888', 'font-size': '11px' }}>{Object.keys(stores()).length} store(s)</span>
        <button
          onClick={refresh}
          style={{ background: '#2a2a4a', border: 'none', color: '#e0e0e0', padding: '2px 8px', 'border-radius': '4px', cursor: 'pointer', 'font-size': '11px' }}
        >
          Refresh
        </button>
      </div>

      <For each={Object.entries(stores())}>
        {([storeName, storeData]) => (
          <div style={{ border: '1px solid #2a2a4a', 'border-radius': '4px', overflow: 'hidden' }}>
            <div style={{ background: '#1e1e3a', padding: '6px 10px', 'font-weight': 'bold', color: '#6c63ff', 'font-size': '12px' }}>
              {storeName}
            </div>
            <div style={{ padding: '4px' }}>
              <For each={Object.entries(storeData as Record<string, unknown>)}>
                {([key, value]) => {
                  const fullKey = `${storeName}.${key}`
                  const isEditing = () => editingKey() === fullKey
                  const isFlashing = () => flashKeys().has(fullKey)

                  return (
                    <div
                      style={{
                        display: 'flex',
                        'align-items': 'center',
                        padding: '3px 8px',
                        'border-bottom': '1px solid #1a1a2e',
                        background: isFlashing() ? '#6c63ff22' : 'transparent',
                        transition: 'background 0.3s',
                      }}
                    >
                      <span style={{ color: '#50fa7b', 'min-width': '120px', 'flex-shrink': '0', 'font-size': '11px' }}>{key}</span>
                      {isEditing() ? (
                        <div style={{ display: 'flex', gap: '4px', flex: '1' }}>
                          <input
                            value={editValue()}
                            onInput={(e) => setEditValue(e.currentTarget.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(storeName, key)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            style={{
                              flex: '1',
                              background: '#2a2a4a',
                              border: '1px solid #6c63ff',
                              color: '#e0e0e0',
                              padding: '2px 6px',
                              'border-radius': '3px',
                              'font-family': 'inherit',
                              'font-size': '11px',
                            }}
                            autofocus
                          />
                        </div>
                      ) : (
                        <span
                          onClick={() => startEdit(storeName, key, value)}
                          style={{
                            color: typeof value === 'boolean' ? (value ? '#50fa7b' : '#ff5555') : typeof value === 'number' ? '#bd93f9' : '#f8f8f2',
                            cursor: 'pointer',
                            'font-size': '11px',
                          }}
                          title="Click to edit"
                        >
                          {JSON.stringify(value)}
                        </span>
                      )}
                    </div>
                  )
                }}
              </For>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}
