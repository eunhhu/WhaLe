import pc from 'picocolors'

export async function build(configPath: string): Promise<void> {
  console.log(pc.cyan('[whale]'), 'Building for production...')
  console.log(pc.dim(`  Config: ${configPath}`))

  // TODO: Load whale.config.ts
  // TODO: Generate tauri.conf.json from config
  // TODO: Build frontend with Vite
  // TODO: Build Tauri application
  // TODO: Output build artifacts

  console.log(pc.yellow('[whale]'), 'Build command not yet implemented')
}
