import { Button, Switch, Slider, Text, Flex } from '@whale/ui'
import { useHotkey, useWindow } from '@whale/sdk'
import { trainer } from '../../store/trainer'

export default function Main() {
  const overlay = useWindow('overlay')
  const settings = useWindow('settings')

  useHotkey(['f1'], () => trainer.setGodMode(!trainer.godMode))
  useHotkey(['f2'], () => trainer.setInfiniteAmmo(!trainer.infiniteAmmo))
  useHotkey(['f3'], () => overlay.toggle())

  return (
    <Flex direction="column" gap={4}>
      <Text size="lg" weight="bold">Example Trainer</Text>
      <Flex direction="column" gap={2}>
        <Flex justify="space-between" align="center">
          <Text>God Mode [F1]</Text>
          <Switch checked={trainer.godMode} onChange={trainer.setGodMode} />
        </Flex>
        <Flex justify="space-between" align="center">
          <Text>Infinite Ammo [F2]</Text>
          <Switch checked={trainer.infiniteAmmo} onChange={trainer.setInfiniteAmmo} />
        </Flex>
        <Flex justify="space-between" align="center">
          <Text>No Recoil</Text>
          <Switch checked={trainer.noRecoil} onChange={trainer.setNoRecoil} />
        </Flex>
        <Text>Speed Hack: {trainer.speedHack}x</Text>
        <Slider min={0.1} max={5} step={0.1} value={trainer.speedHack} onChange={trainer.setSpeedHack} />
        <Text>FOV: {trainer.fov}</Text>
        <Slider min={60} max={120} step={1} value={trainer.fov} onChange={trainer.setFov} />
      </Flex>
      <Flex gap={2}>
        <Button variant="primary" onClick={() => overlay.toggle()}>Toggle Overlay [F3]</Button>
        <Button variant="ghost" onClick={() => settings.show()}>Settings</Button>
      </Flex>
    </Flex>
  )
}
