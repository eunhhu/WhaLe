// @ts-nocheck — Frida runtime types
// This script runs inside the target process via Frida injection

// __whale_store__ is auto-injected by WhaLe framework
declare const __whale_store__: {
  speedHack: number
  godMode: boolean
  infiniteAmmo: boolean
  noRecoil: boolean
  fov: number
  set(key: string, value: any): void
}

Interceptor.attach(Module.getExportByName(null, 'game_tick'), {
  onEnter(args) {
    if (__whale_store__.godMode) {
      // Example: patch health to max
    }
    if (__whale_store__.speedHack !== 1.0) {
      // Example: modify game speed
    }
  },
})
