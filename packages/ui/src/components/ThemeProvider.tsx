import { Component, JSX, createEffect, onCleanup } from 'solid-js'
import type { WhaleTheme } from '../theme/themes'
import { darkTheme } from '../theme/themes'
import { globalResetStyles } from '../theme/global-styles'

export interface ThemeProviderProps {
  theme?: WhaleTheme
  children: JSX.Element
}

export const ThemeProvider: Component<ThemeProviderProps> = (props) => {
  let styleEl: HTMLStyleElement | undefined

  createEffect(() => {
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.setAttribute('data-whale-theme', '')
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = globalResetStyles
  })

  onCleanup(() => {
    styleEl?.remove()
  })

  const theme = () => props.theme ?? darkTheme

  const style = (): JSX.CSSProperties => {
    const t = theme()
    const vars: Record<string, string> = {}
    for (const [key, value] of Object.entries(t)) {
      vars[key] = value
    }
    return {
      ...vars,
      width: '100%',
      height: '100%',
      background: 'var(--whale-bg)',
      color: 'var(--whale-text)',
    } as JSX.CSSProperties
  }

  return (
    <div style={style()}>
      {props.children}
    </div>
  )
}
