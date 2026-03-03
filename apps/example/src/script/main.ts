// Example Trainer — Frida Script
// This script runs inside the target process via Frida.
// __whale_store__ is automatically synced with the UI store.

// Safe export lookup with null guard
const target = Module.findGlobalExportByName('game_tick')

if (target === null) {
  send({ type: 'log', level: 'warn', message: 'game_tick not found, skipping hooks' })
} else {
  Interceptor.attach(target, {
    onEnter(_args: InvocationArguments) {
      // Read store values — these update in real-time from the UI
      if (__whale_store__.godMode) {
        // TODO: Patch health to max value
        // Example: Memory.writeU32(healthAddr, 999999)
        send({ type: 'log', level: 'info', message: 'God mode active' })
      }

      if (__whale_store__.infiniteAmmo) {
        // TODO: Patch ammo count
        // Example: Memory.writeU32(ammoAddr, 9999)
      }

      if (__whale_store__.noRecoil) {
        // TODO: Zero out recoil values
        // Example: Memory.writeFloat(recoilAddr, 0.0)
      }

      if (__whale_store__.speedHack !== 1.0) {
        // TODO: Modify game tick speed multiplier
        // Example: Memory.writeFloat(speedAddr, __whale_store__.speedHack)
      }

      if (__whale_store__.fov !== 90) {
        // TODO: Patch field of view
        // Example: Memory.writeFloat(fovAddr, __whale_store__.fov)
      }
    },
  })

  send({ type: 'log', level: 'info', message: 'Hooks installed successfully' })
}

// Write store values from script side (two-way sync)
// __whale_store__.set('godMode', true)

// Receive messages from UI
// recv('toggle-feature', (message) => {
//   send({ type: 'log', level: 'info', message: `Received: ${JSON.stringify(message)}` })
// })
