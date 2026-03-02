import { Component, JSX, splitProps, mergeProps } from 'solid-js'
import { colors, radius, font, spacing } from '../theme/tokens'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'accent'

export interface BadgeProps {
  variant?: BadgeVariant
  children?: JSX.Element
  style?: JSX.CSSProperties
}

const variantStyles: Record<BadgeVariant, JSX.CSSProperties> = {
  default: { background: colors.primary, color: colors.text },
  success: { background: 'rgba(100, 255, 218, 0.15)', color: colors.success },
  warning: { background: 'rgba(255, 215, 0, 0.15)', color: colors.warning },
  error: { background: 'rgba(255, 107, 107, 0.15)', color: colors.error },
  accent: { background: 'rgba(233, 69, 96, 0.15)', color: colors.accent },
}

export const Badge: Component<BadgeProps> = (props) => {
  const merged = mergeProps({ variant: 'default' as BadgeVariant }, props)
  const [local] = splitProps(merged, ['variant', 'style', 'children'])

  const style = (): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    padding: `${spacing[0.5]} ${spacing[2]}`,
    'border-radius': radius.full,
    'font-size': font.size.xs,
    'font-weight': font.weight.medium,
    'font-family': font.family,
    'line-height': '1',
    'white-space': 'nowrap',
    ...variantStyles[local.variant],
    ...(typeof local.style === 'object' ? local.style : {}),
  })

  return <span style={style()}>{local.children}</span>
}
