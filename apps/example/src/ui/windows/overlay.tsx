import { Text, Flex } from '@whale/ui'
import { useCurrentWindow } from '@whale/sdk'
import { trainer } from '../../store/trainer'

export default function Overlay() {
  const win = useCurrentWindow()

  return (
    <Flex direction="column" gap={1} style={{ padding: '8px', background: 'rgba(0,0,0,0.6)', "border-radius": '8px' }}>
      <Text size="sm" color="accent">Trainer Active</Text>
      <Text size="sm">Speed: {trainer.speedHack}x</Text>
      <Text size="sm">God: {trainer.godMode ? 'ON' : 'OFF'}</Text>
      <Text size="sm">Ammo: {trainer.infiniteAmmo ? '\u221E' : 'Normal'}</Text>
    </Flex>
  )
}
