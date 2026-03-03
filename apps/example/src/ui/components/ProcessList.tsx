import { createSignal, createMemo, For, Show } from 'solid-js'
import { Text, Flex, Button, Input, Badge } from '@whale1/ui'
import type { Process } from '@whale1/sdk'

type Tab = 'attach' | 'spawn'

interface ProcessListProps {
  processes: Process[]
  onAttach: (pid: number) => void
  onSpawn: (bundleId: string) => void
}

export default function ProcessList(props: ProcessListProps) {
  const [tab, setTab] = createSignal<Tab>('attach')
  const [search, setSearch] = createSignal('')
  const [bundleId, setBundleId] = createSignal('')

  const filtered = createMemo(() => {
    const query = search().toLowerCase()
    if (!query) return props.processes
    return props.processes.filter(
      (p) => p.name.toLowerCase().includes(query) || String(p.pid).includes(query),
    )
  })

  const tabStyle = (t: Tab) => ({
    padding: '6px 12px',
    cursor: 'pointer',
    'border-bottom': tab() === t ? '2px solid var(--whale-accent)' : '2px solid transparent',
    color: tab() === t ? 'var(--whale-text)' : 'var(--whale-dim)',
    background: 'none',
    border: 'none',
    'font-size': '12px',
    'font-weight': tab() === t ? '600' : '400',
  })

  return (
    <Flex direction="column" gap={2}>
      <Text size="sm" weight="semibold" color="var(--whale-dim)">PROCESS</Text>

      {/* Tabs */}
      <Flex gap={0}>
        <button style={tabStyle('attach')} onClick={() => setTab('attach')}>
          Attach (Running)
        </button>
        <button style={tabStyle('spawn')} onClick={() => setTab('spawn')}>
          Spawn (New)
        </button>
      </Flex>

      <Show when={tab() === 'attach'}>
        <Input
          placeholder="Search by name or PID..."
          value={search()}
          onInput={(e: InputEvent) => setSearch((e.target as HTMLInputElement).value)}
        />

        <div style={{
          'max-height': '200px',
          'overflow-y': 'auto',
          display: 'flex',
          'flex-direction': 'column',
          gap: '2px',
        }}>
          <Show when={filtered().length > 0} fallback={
            <Text size="xs" color="var(--whale-dim)" style={{ padding: '8px 0', 'text-align': 'center' }}>
              No processes found
            </Text>
          }>
            <For each={filtered()}>
              {(proc) => (
                <Flex
                  justify="space-between"
                  align="center"
                  style={{
                    padding: '4px 8px',
                    'border-radius': '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Flex align="center" gap={2}>
                    <Badge variant="default">{proc.pid}</Badge>
                    <Text size="xs">{proc.name}</Text>
                  </Flex>
                  <Button size="sm" variant="ghost" onClick={() => props.onAttach(proc.pid)}>
                    Attach
                  </Button>
                </Flex>
              )}
            </For>
          </Show>
        </div>
      </Show>

      <Show when={tab() === 'spawn'}>
        <Input
          placeholder="Bundle ID (e.g., com.example.app)"
          value={bundleId()}
          onInput={(e: InputEvent) => setBundleId((e.target as HTMLInputElement).value)}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={!bundleId().trim()}
          onClick={() => {
            const id = bundleId().trim()
            if (id) props.onSpawn(id)
          }}
        >
          Spawn & Attach
        </Button>
      </Show>
    </Flex>
  )
}
