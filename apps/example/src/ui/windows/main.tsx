import { Show, createEffect } from 'solid-js'
import { Button, Switch, Slider, Text, Flex, Card, Badge, Separator, Tooltip, ThemeProvider } from '@whale1/ui'
import { useHotkey, useWindow } from '@whale1/sdk'
import { trainer } from '../../store/trainer'
import { createTrainerSession } from '../../frida/session'
import ConnectionStatus from '../components/ConnectionStatus'
import ProcessList from '../components/ProcessList'

export default function Main() {
  const session = createTrainerSession()
  const overlay = useWindow('overlay')
  const settings = useWindow('settings')
  let autoLoadedSessionId: string | null = null

  useHotkey(['f1'], () => trainer.setGodMode(!trainer.godMode))
  useHotkey(['f2'], () => trainer.setInfiniteAmmo(!trainer.infiniteAmmo))
  useHotkey(['f3'], () => overlay.toggle())

  // Auto-fetch processes when device connects
  createEffect(() => {
    if (session.phase() === 'connected') {
      void session.fetchProcesses()
    }
  })

  // Auto-load scripts after attach
  createEffect(() => {
    const phase = session.phase()
    const currentSession = session.session()
    if (phase === 'attached' && currentSession?.id && currentSession.id !== autoLoadedSessionId) {
      autoLoadedSessionId = currentSession.id
      void session.loadScripts()
    }
    if (phase === 'idle') {
      autoLoadedSessionId = null
    }
  })

  const isScripted = () => session.phase() === 'scripted'

  return (
    <ThemeProvider>
      <Flex direction="column" gap={4} style={{ padding: '16px', height: '100%', 'overflow-y': 'auto' }}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Text size="xl" weight="bold">Example Trainer</Text>
          <Flex gap={1}>
            <Button variant="ghost" size="sm" onClick={() => settings.show()}>Settings</Button>
          </Flex>
        </Flex>

        {/* Connection Status */}
        <Card>
          <ConnectionStatus
            phase={session.phase()}
            device={session.device()}
            session={session.session()}
            error={session.error()}
            onRefresh={() => void session.refresh()}
          />
        </Card>

        {/* Process Selection — only when connected */}
        <Show when={session.phase() === 'connected'}>
          <Card>
            <ProcessList
              processes={session.processes()}
              onAttach={(pid) => void session.attachToProcess(pid)}
              onSpawn={(bundleId) => void session.spawnAndAttach(bundleId)}
            />
          </Card>
        </Show>

        {/* Cheats */}
        <Card style={{ opacity: isScripted() ? '1' : '0.5', transition: 'opacity 0.2s ease' }}>
          <Flex direction="column" gap={3}>
            <Text size="sm" weight="semibold" color="var(--whale-dim)">CHEATS</Text>
            <Flex justify="space-between" align="center">
              <Flex align="center" gap={2}>
                <Tooltip content="Toggle with F1">
                  <Text>God Mode</Text>
                </Tooltip>
                <Badge variant={trainer.godMode ? 'success' : 'default'}>
                  {trainer.godMode ? 'ON' : 'OFF'}
                </Badge>
              </Flex>
              <Switch checked={trainer.godMode} onChange={trainer.setGodMode} disabled={!isScripted()} />
            </Flex>
            <Separator />
            <Flex justify="space-between" align="center">
              <Flex align="center" gap={2}>
                <Tooltip content="Toggle with F2">
                  <Text>Infinite Ammo</Text>
                </Tooltip>
                <Badge variant={trainer.infiniteAmmo ? 'success' : 'default'}>
                  {trainer.infiniteAmmo ? 'ON' : 'OFF'}
                </Badge>
              </Flex>
              <Switch checked={trainer.infiniteAmmo} onChange={trainer.setInfiniteAmmo} disabled={!isScripted()} />
            </Flex>
            <Separator />
            <Flex justify="space-between" align="center">
              <Flex align="center" gap={2}>
                <Text>No Recoil</Text>
                <Badge variant={trainer.noRecoil ? 'success' : 'default'}>
                  {trainer.noRecoil ? 'ON' : 'OFF'}
                </Badge>
              </Flex>
              <Switch checked={trainer.noRecoil} onChange={trainer.setNoRecoil} disabled={!isScripted()} />
            </Flex>
          </Flex>
        </Card>

        {/* Adjustments */}
        <Card style={{ opacity: isScripted() ? '1' : '0.5', transition: 'opacity 0.2s ease' }}>
          <Flex direction="column" gap={3}>
            <Text size="sm" weight="semibold" color="var(--whale-dim)">ADJUSTMENTS</Text>
            <Flex direction="column" gap={1}>
              <Flex justify="space-between" align="center">
                <Text>Speed Hack</Text>
                <Badge variant="accent">{trainer.speedHack.toFixed(1)}x</Badge>
              </Flex>
              <Slider min={0.1} max={5} step={0.1} value={trainer.speedHack} onChange={trainer.setSpeedHack} disabled={!isScripted()} />
            </Flex>
            <Separator />
            <Flex direction="column" gap={1}>
              <Flex justify="space-between" align="center">
                <Text>Field of View</Text>
                <Badge variant="accent">{trainer.fov}</Badge>
              </Flex>
              <Slider min={60} max={120} step={1} value={trainer.fov} onChange={trainer.setFov} disabled={!isScripted()} />
            </Flex>
          </Flex>
        </Card>

        {/* Footer buttons */}
        <Flex gap={2}>
          <Button variant="primary" onClick={() => overlay.toggle()}>Toggle Overlay [F3]</Button>
          <Show when={isScripted()}>
            <Button variant="danger" onClick={() => session.detach()}>Detach</Button>
          </Show>
        </Flex>
      </Flex>
    </ThemeProvider>
  )
}
