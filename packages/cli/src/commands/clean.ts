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
