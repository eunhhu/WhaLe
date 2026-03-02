import { Component, JSX, splitProps, mergeProps } from 'solid-js'
import { colors, radius, font, transition } from '../theme/tokens'

export interface SliderProps {
  min?: number
  max?: number
  step?: number
  value?: number
  onChange?: (value: number) => void
  disabled?: boolean
  style?: JSX.CSSProperties
}

export const Slider: Component<SliderProps> = (props) => {
  const merged = mergeProps({ min: 0, max: 100, step: 1, value: 50, disabled: false }, props)
  const [local, rest] = splitProps(merged, ['min', 'max', 'step', 'value', 'onChange', 'disabled', 'style'])

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    local.onChange?.(Number(e.currentTarget.value))
  }

  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
    ...(typeof local.style === 'object' ? local.style : {}),
  }

  const inputStyle: JSX.CSSProperties = {
    '-webkit-appearance': 'none',
    appearance: 'none',
    width: '100%',
    height: '6px',
    background: colors.border,
    'border-radius': radius.sm,
    outline: 'none',
    cursor: local.disabled ? 'not-allowed' : 'pointer',
    opacity: local.disabled ? '0.5' : '1',
    'accent-color': colors.accent,
    transition: `opacity ${transition.fast}`,
  }

  const labelStyle: JSX.CSSProperties = {
    color: colors.dim,
    'font-family': font.mono,
    'font-size': font.size.sm,
    'min-width': '32px',
    'text-align': 'right',
  }

  return (
    <div style={containerStyle}>
      <input
        type="range"
        min={local.min}
        max={local.max}
        step={local.step}
        value={local.value}
        onInput={handleInput}
        disabled={local.disabled}
        style={inputStyle}
      />
      <span style={labelStyle}>{local.value}</span>
    </div>
  )
}
