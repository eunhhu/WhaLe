import { Button, Switch, Text, Flex } from '@whale/ui'
import { useCurrentWindow } from '@whale/sdk'
import { trainer } from '../../store/trainer'

export default function Settings() {
  const win = useCurrentWindow()

  const handleReset = () => {
    trainer.setSpeedHack(1.0)
    trainer.setGodMode(false)
    trainer.setInfiniteAmmo(false)
    trainer.setNoRecoil(false)
    trainer.setFov(90)
  }

  return (
    <Flex direction="column" gap={4}>
      <Text size="lg" weight="bold">Settings</Text>
      <Flex direction="column" gap={2}>
        <Flex justify="space-between" align="center">
          <Text>Persist Store</Text>
          <Switch checked={true} onChange={() => {}} />
        </Flex>
      </Flex>
      <Flex gap={2}>
        <Button variant="danger" onClick={handleReset}>Reset All</Button>
        <Button variant="ghost" onClick={() => win.hide()}>Close</Button>
      </Flex>
    </Flex>
  )
}
