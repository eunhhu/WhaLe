import { Component, JSX, splitProps, mergeProps } from 'solid-js'
import { colors, spacing } from '../theme/tokens'

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  spacing?: keyof typeof spacing
  style?: JSX.CSSProperties
}

export const Separator: Component<SeparatorProps> = (props) => {
  const merged = mergeProps({ orientation: 'horizontal' as const }, props)
  const [local] = splitProps(merged, ['orientation', 'spacing', 'style'])

  const style = (): JSX.CSSProperties => ({
    ...(local.orientation === 'horizontal'
      ? {
          width: '100%',
          height: '1px',
          'margin-top': local.spacing ? spacing[local.spacing] : '0',
          'margin-bottom': local.spacing ? spacing[local.spacing] : '0',
        }
      : {
          width: '1px',
          'align-self': 'stretch',
          'margin-left': local.spacing ? spacing[local.spacing] : '0',
          'margin-right': local.spacing ? spacing[local.spacing] : '0',
        }),
    background: colors.border,
    border: 'none',
    ...(typeof local.style === 'object' ? local.style : {}),
  })

  return <div role="separator" style={style()} />
}
