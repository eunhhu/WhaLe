import { Component, JSX, splitProps, mergeProps } from 'solid-js'
import { colors, radius, font, spacing, transition } from '../theme/tokens'

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'ghost'
}

export const Input: Component<InputProps> = (props) => {
  const merged = mergeProps({ variant: 'default' as const }, props)
  const [local, rest] = splitProps(merged, ['variant', 'style'])

  const style = (): JSX.CSSProperties => ({
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    'font-family': font.family,
    'font-size': font.size.md,
    color: colors.text,
    background: local.variant === 'ghost' ? 'transparent' : colors.bg,
    border: `1px solid ${colors.border}`,
    'border-radius': radius.md,
    outline: 'none',
    transition: `border-color ${transition.fast}, box-shadow ${transition.fast}`,
    ...(typeof local.style === 'object' ? local.style : {}),
  })

  return <input style={style()} {...rest} />
}
