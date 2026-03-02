import { Text, Flex, Card, Badge, ThemeProvider } from '@whale/ui'
import { useCurrentWindow } from '@whale/sdk'
import { trainer } from '../../store/trainer'

export default function Overlay() {
  const win = useCurrentWindow()

  return (
    <ThemeProvider>
      <Card variant="elevated" padding={3} style={{ 'max-width': '200px' }}>
        <Flex direction="column" gap={2}>
          <Flex justify="space-between" align="center">
            <Text size="xs" weight="bold">TRAINER</Text>
            <Badge variant="accent">ACTIVE</Badge>
          </Flex>
          <Flex direction="column" gap={1}>
            <Flex justify="space-between" align="center">
              <Text size="xs" color="var(--whale-dim)">Speed</Text>
              <Text size="xs" weight="medium">{trainer.speedHack.toFixed(1)}x</Text>
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
              <Text size="xs" color="var(--whale-dim)">FOV</Text>
              <Text size="xs" weight="medium">{trainer.fov}</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </ThemeProvider>
  )
}
