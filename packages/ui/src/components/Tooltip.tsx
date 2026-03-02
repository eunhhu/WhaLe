import { Component, JSX, splitProps, mergeProps, createSignal } from 'solid-js'
import { colors, radius, font, spacing, shadow } from '../theme/tokens'

export interface TooltipProps {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: JSX.Element
  style?: JSX.CSSProperties
}

export const Tooltip: Component<TooltipProps> = (props) => {
  const merged = mergeProps({ position: 'top' as const }, props)
  const [local] = splitProps(merged, ['content', 'position', 'children', 'style'])
  const [visible, setVisible] = createSignal(false)

  const positionStyles: Record<string, JSX.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', 'margin-bottom': spacing[1] },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', 'margin-top': spacing[1] },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', 'margin-right': spacing[1] },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', 'margin-left': spacing[1] },
  }

  const tooltipStyle = (): JSX.CSSProperties => ({
    position: 'absolute',
    background: colors.surface,
    color: colors.text,
    padding: `${spacing[1]} ${spacing[2]}`,
    'border-radius': radius.sm,
    'font-size': font.size.xs,
    'font-family': font.family,
    'white-space': 'nowrap',
    'box-shadow': shadow.md,
    'pointer-events': 'none',
    opacity: visible() ? '1' : '0',
    transition: 'opacity 0.15s ease',
    'z-index': '1000',
    border: `1px solid ${colors.border}`,
    ...positionStyles[local.position],
  })

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', ...(typeof local.style === 'object' ? local.style : {}) }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {local.children}
      <div style={tooltipStyle()}>{local.content}</div>
    </div>
  )
}
