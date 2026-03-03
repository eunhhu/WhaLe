import { Button, Switch, Text, Flex, Card, Badge, Separator, ThemeProvider } from '@whale1/ui'
import { createSignal, onMount } from 'solid-js'
import { isTauriRuntime, safeInvoke, useCurrentWindow } from '@whale1/sdk'
import { trainer } from '../../store/trainer'
import whaleConfig from '../../../whale.config'

export default function Settings() {
  const win = useCurrentWindow()
  const [persistEnabled, setPersistEnabled] = createSignal(true)
  const [persistLoading, setPersistLoading] = createSignal(true)

  const loadPersistEnabled = async () => {
    if (!isTauriRuntime()) {
      setPersistLoading(false)
      return
    }

    try {
      const enabled = await safeInvoke<boolean>('store_get_persist_enabled')
      if (typeof enabled === 'boolean') {
        setPersistEnabled(enabled)
      }
    } catch (error) {
      console.error('[settings] failed to load persist toggle state', error)
    } finally {
      setPersistLoading(false)
    }
  }

  const handlePersistToggle = async (enabled: boolean) => {
    const previous = persistEnabled()
    setPersistEnabled(enabled)

    if (!isTauriRuntime()) return

    const updated = await safeInvoke<boolean>('store_set_persist_enabled', { enabled })
    if (updated !== true) {
      setPersistEnabled(previous)
    }
  }

  const handleReset = () => {
    trainer.setSpeedHack(1.0)
    trainer.setGodMode(false)
    trainer.setInfiniteAmmo(false)
    trainer.setNoRecoil(false)
    trainer.setFov(90)
  }

  onMount(() => {
    void loadPersistEnabled()
  })

  const shortcuts = [
    { key: 'F1', action: 'Toggle God Mode' },
    { key: 'F2', action: 'Toggle Infinite Ammo' },
    { key: 'F3', action: 'Toggle Overlay' },
  ]

  return (
    <ThemeProvider>
      <Flex direction="column" gap={4} style={{ padding: '16px', height: '100%' }}>
        <Text size="xl" weight="bold">Settings</Text>

        {/* About */}
        <Card>
          <Flex direction="column" gap={2}>
            <Text size="sm" weight="semibold" color="var(--whale-dim)">ABOUT</Text>
            <Flex justify="space-between" align="center">
              <Text size="sm">App</Text>
              <Text size="sm" weight="medium">{whaleConfig.app.name}</Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text size="sm">Version</Text>
              <Badge variant="default">{whaleConfig.app.version}</Badge>
            </Flex>
          </Flex>
        </Card>

        {/* General */}
        <Card>
          <Flex direction="column" gap={3}>
            <Text size="sm" weight="semibold" color="var(--whale-dim)">GENERAL</Text>
            <Flex justify="space-between" align="center">
              <Text>Persist Store</Text>
              <Switch
                checked={persistEnabled()}
                onChange={(checked) => {
                  void handlePersistToggle(checked)
                }}
                disabled={persistLoading()}
              />
            </Flex>
          </Flex>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <Flex direction="column" gap={2}>
            <Text size="sm" weight="semibold" color="var(--whale-dim)">KEYBOARD SHORTCUTS</Text>
            {shortcuts.map((s) => (
              <Flex justify="space-between" align="center">
                <Text size="sm">{s.action}</Text>
                <Badge variant="accent">{s.key}</Badge>
              </Flex>
            ))}
          </Flex>
        </Card>

        {/* Danger Zone */}
        <Card>
          <Flex direction="column" gap={3}>
            <Text size="sm" weight="semibold" color="var(--whale-dim)">DANGER ZONE</Text>
            <Text size="sm" color="var(--whale-dim)">
              Reset all trainer values to their defaults.
            </Text>
            <Button variant="danger" onClick={handleReset}>Reset All</Button>
          </Flex>
        </Card>

        <Flex justify="flex-end">
          <Button variant="ghost" onClick={() => win.hide()}>Close</Button>
        </Flex>
      </Flex>
    </ThemeProvider>
  )
}
