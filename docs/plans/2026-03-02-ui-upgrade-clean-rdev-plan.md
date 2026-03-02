# UI 고급화 + Clean Command + rdev Fix 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** @whale/ui를 shadcn급 컴포넌트 라이브러리로 고급화하고, CLI에 clean command를 추가하며, rdev fork를 교체하여 macOS 크래시를 수정한다.

**Architecture:** CSS 변수 기반 테마 시스템으로 전환하여 런타임 테마 전환을 지원. 새 컴포넌트 6종 추가 + 기존 5종 개선. CLI clean command로 빌드 아티팩트 정리. rdev를 fufesou fork로 교체.

**Tech Stack:** SolidJS, TypeScript, CSS Variables (inline style), cac (CLI), picocolors, rdev (fufesou fork)

---

## Phase 1: rdev Fork 교체

### Task 1: Cargo.toml rdev 의존성 교체

**Files:**
- Modify: `packages/tauri-runtime/Cargo.toml:11`

**Step 1: 의존성 교체**

```toml
# line 11 변경
# before: rdev = "0.5"
# after:
rdev = { git = "https://github.com/fufesou/rdev" }
```

**Step 2: Cargo.lock 업데이트 확인**

Run: `cd packages/tauri-runtime && cargo check 2>&1 | tail -20`
Expected: 컴파일 성공 (rdev API 호환이므로 코드 변경 불필요)

**Step 3: 커밋**

```bash
git add packages/tauri-runtime/Cargo.toml packages/tauri-runtime/Cargo.lock
git commit -m "fix(tauri-runtime): switch to fufesou/rdev fork for macOS compatibility"
```

---

## Phase 2: CLI Clean Command

### Task 2: clean command 구현

**Files:**
- Create: `packages/cli/src/commands/clean.ts`
- Modify: `packages/cli/src/index.ts:6,16`

**Step 1: clean.ts 작성**

```typescript
// packages/cli/src/commands/clean.ts
import { rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import pc from 'picocolors'

interface CleanTarget {
  label: string
  path: string
}

export async function clean(options: { all?: boolean }): Promise<void> {
  const projectRoot = resolve(process.cwd())
  console.log(pc.cyan('[whale]'), 'Cleaning build artifacts...')

  const targets: CleanTarget[] = [
    { label: '.whale', path: resolve(projectRoot, '.whale') },
    { label: 'src-tauri/target', path: resolve(projectRoot, 'src-tauri/target') },
  ]

  if (options.all) {
    targets.push({ label: 'node_modules', path: resolve(projectRoot, 'node_modules') })
  }

  let cleaned = 0

  for (const target of targets) {
    if (existsSync(target.path)) {
      await rm(target.path, { recursive: true, force: true })
      console.log(pc.green('  Removed:'), target.label)
      cleaned++
    } else {
      console.log(pc.dim(`  Skip: ${target.label} (not found)`))
    }
  }

  if (cleaned === 0) {
    console.log(pc.green('[whale]'), 'Already clean!')
  } else {
    console.log(pc.green('[whale]'), `Cleaned ${cleaned} target(s)`)
  }
}
```

**Step 2: index.ts에 clean command 등록**

```typescript
// packages/cli/src/index.ts — import 추가 (line 6 근처)
import { clean } from './commands/clean.js'

// command 등록 추가 (line 14 근처, config:generate 뒤)
cli.command('clean', 'Remove build artifacts and generated files')
  .option('--all', 'Also remove node_modules')
  .action((options: { all?: boolean }) => clean(options))
```

**Step 3: 빌드 확인**

Run: `cd packages/cli && bun run build`
Expected: 컴파일 성공

**Step 4: 커밋**

```bash
git add packages/cli/src/commands/clean.ts packages/cli/src/index.ts
git commit -m "feat(cli): add whale clean command to remove build artifacts"
```

---

## Phase 3: @whale/ui 테마 시스템 개선

### Task 3: CSS 변수 기반 테마 토큰 전환

**Files:**
- Modify: `packages/ui/src/theme/tokens.ts` — CSS 변수 참조로 변경
- Create: `packages/ui/src/theme/themes.ts` — 실제 값 정의
- Create: `packages/ui/src/theme/global-styles.ts` — 글로벌 reset

**Step 1: themes.ts 작성**

```typescript
// packages/ui/src/theme/themes.ts
export interface WhaleTheme {
  '--whale-bg': string
  '--whale-surface': string
  '--whale-primary': string
  '--whale-accent': string
  '--whale-text': string
  '--whale-dim': string
  '--whale-success': string
  '--whale-warning': string
  '--whale-error': string
  '--whale-border': string
  '--whale-ring': string
}

export const darkTheme: WhaleTheme = {
  '--whale-bg': '#0f0f17',
  '--whale-surface': '#1a1a2e',
  '--whale-primary': '#0f3460',
  '--whale-accent': '#e94560',
  '--whale-text': '#eaeaea',
  '--whale-dim': '#8892b0',
  '--whale-success': '#64ffda',
  '--whale-warning': '#ffd700',
  '--whale-error': '#ff6b6b',
  '--whale-border': '#2a2a4a',
  '--whale-ring': 'rgba(233, 69, 96, 0.4)',
}
```

**Step 2: tokens.ts를 CSS 변수 참조로 전환**

```typescript
// packages/ui/src/theme/tokens.ts
export const colors = {
  bg: 'var(--whale-bg)',
  surface: 'var(--whale-surface)',
  primary: 'var(--whale-primary)',
  accent: 'var(--whale-accent)',
  text: 'var(--whale-text)',
  dim: 'var(--whale-dim)',
  success: 'var(--whale-success)',
  warning: 'var(--whale-warning)',
  error: 'var(--whale-error)',
  border: 'var(--whale-border)',
  ring: 'var(--whale-ring)',
}

export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
}

export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
}

export const font = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  size: {
    xs: '11px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
  },
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
}

export const shadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
}

export const transition = {
  fast: '0.1s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
}
```

**Step 3: global-styles.ts 작성**

```typescript
// packages/ui/src/theme/global-styles.ts
export const globalResetStyles = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--whale-bg);
    color: var(--whale-text);
    line-height: 1.5;
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: var(--whale-bg);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--whale-border);
    border-radius: 3px;
  }
`
```

**Step 4: 빌드 확인**

Run: `cd packages/ui && bun run build`
Expected: 컴파일 성공

**Step 5: 커밋**

```bash
git add packages/ui/src/theme/
git commit -m "feat(ui): CSS variable-based theme system with dark theme"
```

### Task 4: ThemeProvider 컴포넌트

**Files:**
- Create: `packages/ui/src/components/ThemeProvider.tsx`
- Modify: `packages/ui/src/index.ts` — export 추가

**Step 1: ThemeProvider.tsx 작성**

```tsx
// packages/ui/src/components/ThemeProvider.tsx
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
```

**Step 2: index.ts에 export 추가**

tokens export 섹션에 추가:
```typescript
export { darkTheme } from './theme/themes'
export type { WhaleTheme } from './theme/themes'

export { ThemeProvider } from './components/ThemeProvider'
export type { ThemeProviderProps } from './components/ThemeProvider'
```

**Step 3: 빌드 확인**

Run: `cd packages/ui && bun run build`

**Step 4: 커밋**

```bash
git add packages/ui/src/components/ThemeProvider.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add ThemeProvider component with global reset styles"
```

---

## Phase 4: 새 컴포넌트 추가

### Task 5: Card 컴포넌트

**Files:**
- Create: `packages/ui/src/components/Card.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: Card.tsx 작성**

```tsx
// packages/ui/src/components/Card.tsx
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
```

**Step 2: index.ts에 export 추가**

```typescript
export { Card } from './components/Card'
export type { CardProps } from './components/Card'
```

**Step 3: 빌드 확인 + 커밋**

```bash
cd packages/ui && bun run build
git add packages/ui/src/components/Card.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Card component with default/bordered/elevated variants"
```

### Task 6: Badge 컴포넌트

**Files:**
- Create: `packages/ui/src/components/Badge.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: Badge.tsx 작성**

```tsx
// packages/ui/src/components/Badge.tsx
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
  const [local, rest] = splitProps(merged, ['variant', 'style', 'children'])

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
```

**Step 2: index.ts export 추가 + 빌드 + 커밋**

```bash
git add packages/ui/src/components/Badge.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Badge component with status variants"
```

### Task 7: Separator 컴포넌트

**Files:**
- Create: `packages/ui/src/components/Separator.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: Separator.tsx 작성**

```tsx
// packages/ui/src/components/Separator.tsx
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
```

**Step 2: export + 빌드 + 커밋**

```bash
git add packages/ui/src/components/Separator.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Separator component"
```

### Task 8: Input 컴포넌트

**Files:**
- Create: `packages/ui/src/components/Input.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: Input.tsx 작성**

```tsx
// packages/ui/src/components/Input.tsx
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
```

**Step 2: export + 빌드 + 커밋**

```bash
git add packages/ui/src/components/Input.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Input component"
```

### Task 9: Tooltip 컴포넌트

**Files:**
- Create: `packages/ui/src/components/Tooltip.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: Tooltip.tsx 작성**

```tsx
// packages/ui/src/components/Tooltip.tsx
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
```

**Step 2: export + 빌드 + 커밋**

```bash
git add packages/ui/src/components/Tooltip.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Tooltip component"
```

### Task 10: IconButton 컴포넌트

**Files:**
- Create: `packages/ui/src/components/IconButton.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: IconButton.tsx 작성**

```tsx
// packages/ui/src/components/IconButton.tsx
import { Component, JSX, splitProps, mergeProps } from 'solid-js'
import { colors, radius, spacing, transition } from '../theme/tokens'

export type IconButtonVariant = 'ghost' | 'default'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  size?: IconButtonSize
}

const sizeMap: Record<IconButtonSize, string> = {
  sm: spacing[6],
  md: spacing[8],
  lg: spacing[10],
}

export const IconButton: Component<IconButtonProps> = (props) => {
  const merged = mergeProps({ variant: 'ghost' as IconButtonVariant, size: 'md' as IconButtonSize }, props)
  const [local, rest] = splitProps(merged, ['variant', 'size', 'style', 'children'])

  const style = (): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: sizeMap[local.size],
    height: sizeMap[local.size],
    padding: '0',
    border: local.variant === 'default' ? `1px solid ${colors.border}` : 'none',
    background: local.variant === 'default' ? colors.surface : 'transparent',
    color: colors.dim,
    'border-radius': radius.md,
    cursor: 'pointer',
    transition: `background ${transition.fast}, color ${transition.fast}`,
    ...(typeof local.style === 'object' ? local.style : {}),
  })

  return (
    <button style={style()} {...rest}>
      {local.children}
    </button>
  )
}
```

**Step 2: export + 빌드 + 커밋**

```bash
git add packages/ui/src/components/IconButton.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add IconButton component"
```

---

## Phase 5: 기존 컴포넌트 개선

### Task 11: Button 개선

**Files:**
- Modify: `packages/ui/src/components/Button.tsx`

**변경 사항:**
- `transition` 토큰 사용
- `disabled` 스타일 추가 (opacity + cursor)
- `shadow` 토큰 활용
- 새 토큰 참조로 업데이트 (font.weight, spacing 확장)

**Step 1: Button.tsx 전체 교체**

기존 inline style 패턴 유지하되:
- `transition` import 추가
- disabled 시 `opacity: '0.5'`, `cursor: 'not-allowed'`, `pointer-events: 'none'` 적용
- variant 스타일에 `border` 색상을 `colors.border` 사용

**Step 2: 빌드 + 커밋**

```bash
git commit -m "feat(ui): improve Button with disabled state and refined styles"
```

### Task 12: Switch 개선

**Files:**
- Modify: `packages/ui/src/components/Switch.tsx`

**변경 사항:**
- `transition` 토큰 사용
- 트랙 색상 off 시 `colors.border`, on 시 `colors.accent`
- 더 부드러운 애니메이션

**Step 1: Switch.tsx 업데이트 + 빌드 + 커밋**

```bash
git commit -m "feat(ui): improve Switch with refined animation and colors"
```

### Task 13: Slider 개선

**Files:**
- Modify: `packages/ui/src/components/Slider.tsx`

**변경 사항:**
- label 스타일에 `font.mono` 사용 (숫자 표시)
- `colors.border` 트랙 색상
- `transition` 토큰 사용

**Step 1: Slider.tsx 업데이트 + 빌드 + 커밋**

```bash
git commit -m "feat(ui): improve Slider with mono font and refined track"
```

### Task 14: Text 개선

**Files:**
- Modify: `packages/ui/src/components/Text.tsx`

**변경 사항:**
- `xs`, `xl`, `2xl` 사이즈 추가
- `semibold` weight 추가
- `font.weight` 토큰 참조로 전환

**Step 1: Text.tsx 업데이트 + 빌드 + 커밋**

```bash
git commit -m "feat(ui): expand Text sizes and weights"
```

---

## Phase 6: Example App 리뉴얼

### Task 15: Example main.tsx 리뉴얼

**Files:**
- Modify: `apps/example/src/ui/windows/main.tsx`

**변경 사항:**
- `ThemeProvider`로 전체 래핑
- `Card`로 섹션 그룹핑
- `Badge`로 ON/OFF 상태 표시
- `Separator`로 섹션 구분
- `Tooltip`으로 핫키 설명

**Step 1: main.tsx 전체 리뉴얼 + 커밋**

```bash
git commit -m "feat(example): redesign main window with Card, Badge, Separator"
```

### Task 16: Example overlay.tsx 리뉴얼

**Files:**
- Modify: `apps/example/src/ui/windows/overlay.tsx`

**변경 사항:**
- `ThemeProvider`로 래핑
- `Card` + `Badge` 활용
- 세련된 HUD 스타일

**Step 1: overlay.tsx 리뉴얼 + 커밋**

```bash
git commit -m "feat(example): redesign overlay with Card and Badge"
```

### Task 17: Example settings.tsx 리뉴얼

**Files:**
- Modify: `apps/example/src/ui/windows/settings.tsx`

**변경 사항:**
- `ThemeProvider`로 래핑
- `Card`로 섹션 분리
- `Separator` 활용

**Step 1: settings.tsx 리뉴얼 + 커밋**

```bash
git commit -m "feat(example): redesign settings with Card and Separator"
```

### Task 18: 전체 빌드 검증

**Step 1: 패키지 빌드**

```bash
cd /Users/sunwoo/work/WhaLe && bun run build
```

Expected: 모든 패키지 빌드 성공

**Step 2: 타입 체크**

```bash
cd apps/example && bun run typecheck
```

Expected: 에러 없음
