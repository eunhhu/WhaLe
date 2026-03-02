export interface WindowConfig {
  entry: string
  width?: number
  height?: number
  resizable?: boolean
  alwaysOnTop?: boolean
  transparent?: boolean
  decorations?: boolean
  skipTaskbar?: boolean
  visible?: boolean
  position?: { x: number; y: number } | string
  clickThrough?: boolean
}

export interface WhaleConfig {
  app: { name: string; version: string; identifier: string }
  windows: Record<string, WindowConfig & { entry: string }>
  store?: { persist?: boolean; persistPath?: string }
  build?: { outDir?: string }
}

export function defineConfig(config: WhaleConfig): WhaleConfig {
  return config
}
