import { Text, Flex, Card, Badge, ThemeProvider } from '@whale1/ui'
import { trainer } from '../../store/trainer'

export default function Overlay() {
  return (
    <ThemeProvider transparent>
      <Card variant="elevated" padding={2} style={{ 'max-width': '180px' }}>
        <Flex direction="column" gap={1}>
          <Flex justify="space-between" align="center" style={{ 'margin-bottom': '2px' }}>
            <Text size="xs" weight="bold">TRAINER</Text>
            <Badge variant="accent">ACTIVE</Badge>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text size="xs" color="var(--whale-dim)">God</Text>
            <Badge variant={trainer.godMode ? 'success' : 'error'}>
              {trainer.godMode ? 'ON' : 'OFF'}
            </Badge>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text size="xs" color="var(--whale-dim)">Ammo</Text>
            <Badge variant={trainer.infiniteAmmo ? 'success' : 'error'}>
              {trainer.infiniteAmmo ? 'ON' : 'OFF'}
            </Badge>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text size="xs" color="var(--whale-dim)">Recoil</Text>
            <Badge variant={trainer.noRecoil ? 'success' : 'error'}>
              {trainer.noRecoil ? 'ON' : 'OFF'}
            </Badge>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text size="xs" color="var(--whale-dim)">Speed</Text>
            <Text size="xs" weight="medium">{trainer.speedHack.toFixed(1)}x</Text>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text size="xs" color="var(--whale-dim)">FOV</Text>
            <Text size="xs" weight="medium">{trainer.fov}</Text>
          </Flex>
        </Flex>
      </Card>
    </ThemeProvider>
  )
}
