import { defineConfig } from '@whale1/cli'

export default defineConfig({
  app: {
    name: 'Example Trainer',
    version: '0.1.0',
    identifier: 'com.whale.example',
    icon: '../../assets/icon.png',
  },
  windows: {
    main: {
      entry: './src/ui/windows/main.tsx',
      title: 'Example Trainer',
      width: 400,
      height: 500,
      resizable: false,
    },
    overlay: {
      entry: './src/ui/windows/overlay.tsx',
      title: 'Overlay',
      width: 300,
      height: 200,
      transparent: true,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
    },
    settings: {
      entry: './src/ui/windows/settings.tsx',
      title: 'Settings',
      width: 500,
      height: 400,
      visible: false,
    },
  },
  frida: {
    scripts: [
      { entry: './src/script/main.ts', store: 'trainer' },
    ],
  },
  store: {
    persist: true,
  },
})
