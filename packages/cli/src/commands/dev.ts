import pc from 'picocolors'

export async function dev(configPath: string): Promise<void> {
  console.log(pc.cyan('[whale]'), 'Starting development server...')
  console.log(pc.dim(`  Config: ${configPath}`))

  // TODO: Load whale.config.ts
  // TODO: Generate tauri.conf.json from config
  // TODO: Start Vite dev server for frontend
  // TODO: Start Tauri dev process
  // TODO: Watch whale.config.ts for changes and regenerate tauri.conf.json

  console.log(pc.yellow('[whale]'), 'Dev command not yet implemented')
}
