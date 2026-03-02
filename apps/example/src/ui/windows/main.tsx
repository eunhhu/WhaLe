import { Button, Switch, Slider, Text, Flex, Card, Badge, Separator, Tooltip, ThemeProvider } from '@whale/ui'
import { useHotkey, useWindow } from '@whale/sdk'
import { trainer } from '../../store/trainer'
import { setupTrainerSession } from '../../frida/session'

export default function Main() {
  const { device } = setupTrainerSession()
  const overlay = useWindow('overlay')
  const settings = useWindow('settings')

  useHotkey(['f1'], () => trainer.setGodMode(!trainer.godMode))
  useHotkey(['f2'], () => trainer.setInfiniteAmmo(!trainer.infiniteAmmo))
  useHotkey(['f3'], () => overlay.toggle())

  return (
    <ThemeProvider>
      <Flex direction="column" gap={4} style={{ padding: '16px', height: '100%' }}>
        <Flex justify="space-between" align="center">
          <Text size="xl" weight="bold">Example Trainer</Text>
          <Badge variant={trainer.godMode || trainer.infiniteAmmo ? 'success' : 'default'}>
            {trainer.godMode || trainer.infiniteAmmo ? 'ACTIVE' : 'IDLE'}
          </Badge>
        </Flex>
        <Flex>
          <Button onClick={() => device.refresh()}>Refresh</Button>
          <Button onClick={() => device.spawn('com.tencent.xin', { realm: "emulated" })}>Spawn</Button>
          <Button onClick={() => device.attach(12345)}>Attach</Button>
          <Button onClick={() => device.enumerateProcesses()}>Enumerate Processes</Button>
          <Button onClick={() => device.resume(12345)}>Resume</Button>
        </Flex>

        <Card>
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
              <Switch checked={trainer.godMode} onChange={trainer.setGodMode} />
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
              <Switch checked={trainer.infiniteAmmo} onChange={trainer.setInfiniteAmmo} />
            </Flex>
            <Separator />
            <Flex justify="space-between" align="center">
              <Flex align="center" gap={2}>
                <Text>No Recoil</Text>
                <Badge variant={trainer.noRecoil ? 'success' : 'default'}>
                  {trainer.noRecoil ? 'ON' : 'OFF'}
                </Badge>
              </Flex>
              <Switch checked={trainer.noRecoil} onChange={trainer.setNoRecoil} />
            </Flex>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap={3}>
            <Text size="sm" weight="semibold" color="var(--whale-dim)">ADJUSTMENTS</Text>
            <Flex direction="column" gap={1}>
              <Flex justify="space-between" align="center">
                <Text>Speed Hack</Text>
                <Badge variant="accent">{trainer.speedHack.toFixed(1)}x</Badge>
              </Flex>
              <Slider min={0.1} max={5} step={0.1} value={trainer.speedHack} onChange={trainer.setSpeedHack} />
            </Flex>
            <Separator />
            <Flex direction="column" gap={1}>
              <Flex justify="space-between" align="center">
                <Text>Field of View</Text>
                <Badge variant="accent">{trainer.fov}</Badge>
              </Flex>
              <Slider min={60} max={120} step={1} value={trainer.fov} onChange={trainer.setFov} />
            </Flex>
          </Flex>
        </Card>

        <Flex gap={2}>
          <Button variant="primary" onClick={() => overlay.toggle()}>Toggle Overlay [F3]</Button>
          <Button variant="ghost" onClick={() => settings.show()}>Settings</Button>
        </Flex>
      </Flex>
    </ThemeProvider>
  )
}
