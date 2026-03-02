import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import pc from 'picocolors'
import { loadConfig } from '../config-loader.js'
import { generateHtmlEntries } from '../generators/html-entry.js'
import { generateViteConfig } from '../generators/vite-config.js'
import { generateTauriConf, resolveBundleIcon } from '../generators/tauri-conf.js'
import type { WhaleConfig } from '../config.js'
import { resolveRuntimeOptions, type RuntimeOptions } from '../runtime-options.js'

const NPX_BIN = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const CARGO_BIN = process.platform === 'win32' ? 'cargo.exe' : 'cargo'

function hasRustToolchain(): boolean {
  const result = spawnSync(CARGO_BIN, ['--version'], { stdio: 'ignore' })
  return result.status === 0 && !result.error
}

function ensureTauriProject(
  projectRoot: string,
  config: WhaleConfig,
  runtime: RuntimeOptions,
): void {
  const srcTauri = join(projectRoot, 'src-tauri')
  if (existsSync(join(srcTauri, 'tauri.conf.json')) ||
      existsSync(join(srcTauri, 'tauri.conf.json5')) ||
      existsSync(join(srcTauri, 'Tauri.toml'))) {
    return
  }

  console.log(pc.cyan('[whale]'), 'Initializing Tauri project...')
  const result = spawnSync(NPX_BIN, [
    'tauri', 'init',
    '--ci',
    '--app-name', config.app.name,
    '--window-title', config.app.name,
    '--dev-url', runtime.devUrl,
    '--frontend-dist', runtime.frontendDistFromSrcTauri,
    '--before-dev-command', runtime.beforeDevCommand,
    '--before-build-command', runtime.beforeBuildCommand,
  ], {
    cwd: projectRoot,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    throw new Error('Failed to initialize Tauri project')
  }
  console.log(pc.green('[whale]'), 'Tauri project initialized')
}

function syncTauriIcons(projectRoot: string, config: WhaleConfig): void {
  const srcTauri = join(projectRoot, 'src-tauri')
  const bundleIcon = resolveBundleIcon(config, projectRoot)
  if (!bundleIcon) return

  const iconSourceAbsPath = resolve(srcTauri, bundleIcon)
  if (!existsSync(iconSourceAbsPath)) return

  console.log(pc.dim('  Syncing Tauri icons from source icon...'))
  const result = spawnSync(
    NPX_BIN,
    ['tauri', 'icon', iconSourceAbsPath, '--output', join(srcTauri, 'icons')],
    {
      cwd: projectRoot,
      stdio: 'inherit',
    },
  )

  if (result.status !== 0) {
    throw new Error(`Failed to generate Tauri icons from: ${iconSourceAbsPath}`)
  }
}

function syncTauriCapabilities(projectRoot: string, config: WhaleConfig, mode: 'development' | 'production'): void {
  const capabilitiesDir = join(projectRoot, 'src-tauri', 'capabilities')
  const defaultCapabilityPath = join(capabilitiesDir, 'default.json')
  const desiredWindows = [
    ...Object.keys(config.windows),
    ...(mode === 'development' ? ['__devtools__'] : []),
  ]

  if (!existsSync(defaultCapabilityPath)) {
    mkdirSync(capabilitiesDir, { recursive: true })
    const defaultCapability = {
      $schema: '../gen/schemas/desktop-schema.json',
      identifier: 'default',
      description: 'enables the default permissions',
      windows: desiredWindows,
      permissions: ['core:default'],
    }
    writeFileSync(defaultCapabilityPath, `${JSON.stringify(defaultCapability, null, 2)}\n`, 'utf-8')
    console.log(pc.dim('  Generated default capability with synced windows'))
    return
  }

  let changed = false
  let capability: Record<string, unknown>
  try {
    capability = JSON.parse(readFileSync(defaultCapabilityPath, 'utf-8')) as Record<string, unknown>
  } catch {
    capability = {
      $schema: '../gen/schemas/desktop-schema.json',
      identifier: 'default',
      description: 'enables the default permissions',
      permissions: ['core:default'],
    }
    changed = true
  }

  const currentWindows = Array.isArray(capability.windows) ? capability.windows : []
  const sameLength = currentWindows.length === desiredWindows.length
  const sameOrder = sameLength && currentWindows.every((w, i) => w === desiredWindows[i])
  if (!sameOrder) {
    capability.windows = desiredWindows
    changed = true
  }

  if (changed) {
    writeFileSync(defaultCapabilityPath, `${JSON.stringify(capability, null, 2)}\n`, 'utf-8')
    console.log(pc.dim(`  Synced capability windows: ${desiredWindows.join(', ')}`))
  }
}

function validateFridaScripts(projectRoot: string, config: WhaleConfig): void {
  const scripts = config.frida?.scripts ?? []
  for (const [index, script] of scripts.entries()) {
    const absPath = resolve(projectRoot, script.entry)
    if (!existsSync(absPath)) {
      throw new Error(`frida.scripts[${index}].entry not found: ${absPath}`)
    }
  }
  if (scripts.length > 0) {
    console.log(pc.dim(`  Frida scripts configured: ${scripts.length}`))
  }
}

export async function build(configPath: string): Promise<void> {
  const projectRoot = resolve(process.cwd())
  const skipTauri = process.env.WHALE_SKIP_TAURI === '1'
  const canRunTauri = !skipTauri && hasRustToolchain()
  console.log(pc.cyan('[whale]'), 'Building for production...')

  try {
    // 1. Load whale.config.ts
    console.log(pc.dim('  Loading config...'))
    const config = await loadConfig(resolve(projectRoot, configPath))
    const runtime = resolveRuntimeOptions(config, projectRoot)
    console.log(pc.green('  Config loaded:'), config.app.name)
    validateFridaScripts(projectRoot, config)

    // 2. Generate HTML entries in configured outDir
    console.log(pc.dim('  Generating HTML entries...'))
    const htmlEntries = generateHtmlEntries(config, projectRoot, 'production', runtime.outDirAbs)
    for (const [label] of htmlEntries) {
      console.log(pc.dim(`    ${label}.html`))
    }

    // 3. Vite production build
    console.log(pc.cyan('[whale]'), 'Building frontend...')
    const viteConfig = generateViteConfig({
      config,
      projectRoot,
      htmlEntries,
      mode: 'production',
    })

    const { build: viteBuild } = await import('vite')
    const solidPlugin = (await import('vite-plugin-solid')).default
    viteConfig.plugins = [solidPlugin()]

    await viteBuild(viteConfig)
    console.log(pc.green('  Frontend build complete'))

    // 4. Generate tauri.conf.json for production
    console.log(pc.dim('  Generating tauri.conf.json...'))
    const tauriConf = generateTauriConf(config, 'production', projectRoot)
    const tauriConfPath = runtime.tauriConfPathAbs
    writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2))

    if (!canRunTauri) {
      if (skipTauri) {
        console.log(pc.yellow('[whale]'), 'WHALE_SKIP_TAURI=1, skipping Tauri build')
      } else {
        console.log(pc.yellow('[whale]'), 'Rust toolchain not found (cargo missing), skipping Tauri build')
        console.log(pc.dim('  Install Rust from https://rustup.rs to build native Tauri bundles'))
      }
      console.log(pc.green('[whale]'), 'Build complete!')
      return
    }

    // 5. Ensure src-tauri exists (auto-init if missing)
    ensureTauriProject(projectRoot, config, runtime)

    // 6. Keep Tauri window capability labels in sync with whale.config windows.
    syncTauriCapabilities(projectRoot, config, 'production')

    // 7. Keep platform icons aligned with app.icon/assets icon source.
    syncTauriIcons(projectRoot, config)

    // 8. Run tauri build
    console.log(pc.cyan('[whale]'), 'Building Tauri application...')
    const tauriProcess = spawn(
      NPX_BIN,
      ['tauri', 'build', '--config', tauriConfPath],
      {
        cwd: projectRoot,
        stdio: 'inherit',
      },
    )

    await new Promise<void>((resolve, reject) => {
      tauriProcess.on('close', (code) => {
        if (code === 0) {
          console.log(pc.green('[whale]'), 'Build complete!')
          resolve()
        } else {
          reject(new Error(`Tauri build failed with exit code ${code}`))
        }
      })
      tauriProcess.on('error', reject)
    })
  } catch (error) {
    console.error(pc.red('[whale]'), 'Build command failed')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
