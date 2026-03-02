import { Component, JSX, createEffect, onCleanup } from 'solid-js'
import type { WhaleTheme } from '../theme/themes'
import { darkTheme } from '../theme/themes'
import { globalResetStyles } from '../theme/global-styles'

export interface ThemeProviderProps {
  theme?: WhaleTheme
  transparent?: boolean
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

    if (props.transparent) {
      document.documentElement.setAttribute('data-transparent', 'true')
      document.body.setAttribute('data-transparent', 'true')
      document.documentElement.style.setProperty('background', 'transparent', 'important')
      document.documentElement.style.setProperty('background-color', 'transparent', 'important')
      document.body.style.setProperty('background', 'transparent', 'important')
      document.body.style.setProperty('background-color', 'transparent', 'important')
    } else {
      document.documentElement.removeAttribute('data-transparent')
      document.body.removeAttribute('data-transparent')
      document.documentElement.style.removeProperty('background')
      document.documentElement.style.removeProperty('background-color')
      document.body.style.removeProperty('background')
      document.body.style.removeProperty('background-color')
    }
  })

  onCleanup(() => {
    styleEl?.remove()
    document.documentElement.removeAttribute('data-transparent')
    document.body.removeAttribute('data-transparent')
    document.documentElement.style.removeProperty('background')
    document.documentElement.style.removeProperty('background-color')
    document.body.style.removeProperty('background')
    document.body.style.removeProperty('background-color')
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
      background: props.transparent ? 'transparent' : 'var(--whale-bg)',
      color: 'var(--whale-text)',
    } as JSX.CSSProperties
  }

  return (
    <div data-whale-theme-root="" style={style()}>
      {props.children}
    </div>
  )
}
