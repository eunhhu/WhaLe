import { Text, Flex, Badge, Button } from '@whale1/ui'
import type { Phase } from '../../frida/session'
import type { Device, Session } from '@whale1/sdk'

interface Step {
  label: string
  phase: Phase
  getValue: () => string
}

interface ConnectionStatusProps {
  phase: Phase
  device: Device | null
  session: Session | null
  error: string | null
  onRefresh: () => void
}

const PHASE_ORDER: Phase[] = ['idle', 'searching', 'connected', 'attached', 'scripted']

function phaseIndex(phase: Phase): number {
  return PHASE_ORDER.indexOf(phase)
}

export default function ConnectionStatus(props: ConnectionStatusProps) {
  const steps: Step[] = [
    {
      label: 'Device',
      phase: 'connected',
      getValue: () => props.device?.name ?? 'Not connected',
    },
    {
      label: 'Process',
      phase: 'connected',
      getValue: () => props.phase === 'connected' ? 'Select a process' : 'Waiting',
    },
    {
      label: 'Session',
      phase: 'attached',
      getValue: () => props.session ? `PID ${props.session.pid}` : 'Not attached',
    },
    {
      label: 'Script',
      phase: 'scripted',
      getValue: () => 'Loaded',
    },
  ]

  const getStepStatus = (stepPhase: Phase, index: number): 'done' | 'active' | 'waiting' => {
    const current = phaseIndex(props.phase)
    const stepIdx = index + 1 // steps map to phases: connected(1), connected(1), attached(3), scripted(4)

    if (stepPhase === 'connected' && index === 1) {
      // Process step is "done" once we're attached or beyond
      if (current >= phaseIndex('attached')) return 'done'
      if (current === phaseIndex('connected')) return 'active'
      return 'waiting'
    }

    if (current >= phaseIndex(stepPhase)) return 'done'
    if (current === phaseIndex(stepPhase) - 1) return 'active'
    return 'waiting'
  }

  const statusColor = (status: 'done' | 'active' | 'waiting'): string => {
    if (status === 'done') return 'var(--whale-success)'
    if (status === 'active') return 'var(--whale-accent)'
    return 'var(--whale-dim)'
  }

  const statusIcon = (status: 'done' | 'active' | 'waiting'): string => {
    if (status === 'done') return '\u2714'
    if (status === 'active') return '\u25CF'
    return '\u25CB'
  }

  return (
    <Flex direction="column" gap={2}>
      <Flex justify="space-between" align="center">
        <Text size="sm" weight="semibold" color="var(--whale-dim)">CONNECTION</Text>
        {props.phase === 'searching' && (
          <Badge variant="warning">Searching...</Badge>
        )}
      </Flex>

      {steps.map((step, i) => {
        const status = getStepStatus(step.phase, i)
        return (
          <Flex align="center" gap={2} style={{ 'min-height': '24px' }}>
            <Text size="sm" weight="bold" color={statusColor(status)} style={{ width: '16px', 'text-align': 'center' }}>
              {statusIcon(status)}
            </Text>
            <Text size="sm" weight="medium" color={statusColor(status)} style={{ width: '56px' }}>
              {step.label}
            </Text>
            <Text size="xs" color="var(--whale-dim)" style={{ flex: '1' }}>
              {status === 'done' || status === 'active' ? step.getValue() : '\u2014'}
            </Text>
          </Flex>
        )
      })}

      {props.error && (
        <Flex direction="column" gap={1} style={{ 'margin-top': '4px' }}>
          <Text size="xs" color="var(--whale-error)">{props.error}</Text>
          <Button size="sm" variant="ghost" onClick={props.onRefresh}>Retry</Button>
        </Flex>
      )}
    </Flex>
  )
}
