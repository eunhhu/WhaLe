import { Component, JSX, splitProps, mergeProps } from 'solid-js'
import { colors, radius, spacing, shadow } from '../theme/tokens'

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated'
  padding?: keyof typeof spacing
}

export const Card: Component<CardProps> = (props) => {
  const merged = mergeProps({ variant: 'default' as const, padding: 4 as keyof typeof spacing }, props)
  const [local, rest] = splitProps(merged, ['variant', 'padding', 'style', 'children'])

  const variantStyles: Record<string, JSX.CSSProperties> = {
    default: {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
    },
    bordered: {
      background: 'transparent',
      border: `1px solid ${colors.border}`,
    },
    elevated: {
      background: colors.surface,
      border: 'none',
      'box-shadow': shadow.md,
    },
  }

  const style = (): JSX.CSSProperties => ({
    'border-radius': radius.lg,
    padding: spacing[local.padding],
    ...variantStyles[local.variant],
    ...(typeof local.style === 'object' ? local.style : {}),
  })

  return (
    <div style={style()} {...rest}>
      {local.children}
    </div>
  )
}
