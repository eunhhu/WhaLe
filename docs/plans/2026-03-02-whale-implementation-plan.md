# WhaLe Framework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tauri + frida-rust + rdev 기반의 Node/TS 트레이너 프레임워크 라이브러리 구축

**Architecture:** Tauri 단일 프로세스에서 frida-rust와 rdev를 Rust 백엔드로 통합하고, WebView에서 SolidJS Hook API로 사용자에게 노출. Store 동기화 시스템으로 UI ↔ Rust ↔ Frida 스크립트 간 양방향 상태 관리.

**Tech Stack:** Tauri 2.x, Rust, frida-rust, rdev, SolidJS, TypeScript, Vite, frida-compile, pnpm workspaces

---

## Phase 0: 프로젝트 부트스트랩

### Task 1: Monorepo 초기화

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.npmrc`

**Step 1: pnpm workspace root 설정**

```json
// package.json
{
  "name": "whale",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @whale/cli dev",
    "build": "pnpm -r build",
    "test": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

```
# .gitignore
node_modules/
dist/
target/
.tauri/
*.tsbuildinfo
.DS_Store
```

```
# .npmrc
shamefully-hoist=false
strict-peer-dependencies=false
```

**Step 2: pnpm install로 초기화**

Run: `pnpm install`
Expected: lockfile 생성, node_modules 설치

**Step 3: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .npmrc pnpm-lock.yaml
git commit -m "chore: initialize pnpm monorepo workspace"
```

---

### Task 2: Tauri Runtime 패키지 (Rust) — 기본 셸

**Files:**
- Create: `packages/tauri-runtime/Cargo.toml`
- Create: `packages/tauri-runtime/src/main.rs`
- Create: `packages/tauri-runtime/src/commands/mod.rs`
- Create: `packages/tauri-runtime/src/state/mod.rs`

**Step 1: Cargo.toml 작성**

```toml
# packages/tauri-runtime/Cargo.toml
[package]
name = "whale-tauri-runtime"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-build = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }

# Phase 2에서 추가:
# frida = "0.4"
# rdev = "0.5"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

**Step 2: 최소 main.rs 작성**

```rust
// packages/tauri-runtime/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod state;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```rust
// packages/tauri-runtime/src/commands/mod.rs
// Tauri command modules — 각 Phase에서 추가
```

```rust
// packages/tauri-runtime/src/state/mod.rs
// Tauri managed state — 각 Phase에서 추가
```

**Step 3: Tauri 설정 파일 작성**

Create: `packages/tauri-runtime/tauri.conf.json` (개발용 최소 설정)

```json
{
  "$schema": "https://raw.githubusercontent.com/nicegram/nicegram-web/refs/heads/tauri-v2/packages/tauri-cli/schema.json",
  "productName": "whale-dev",
  "identifier": "com.whale.dev",
  "build": {
    "frontendDist": "../sdk/dist",
    "devUrl": "http://localhost:5173"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "WhaLe Dev",
        "width": 600,
        "height": 450
      }
    ]
  }
}
```

**Step 4: 빌드 테스트**

Run: `cd packages/tauri-runtime && cargo check`
Expected: 컴파일 성공 (빌드는 Tauri CLI 필요하므로 check만)

**Step 5: Commit**

```bash
git add packages/tauri-runtime/
git commit -m "feat(tauri-runtime): initialize Tauri Rust backend shell"
```

---

## Phase 1: Store 시스템 (핵심 인프라)

Store는 모든 모듈(윈도우, Frida, Input)이 의존하는 핵심이므로 가장 먼저 구현.

### Task 3: Rust StoreManager 구현

**Files:**
- Create: `packages/tauri-runtime/src/state/store_state.rs`
- Create: `packages/tauri-runtime/src/commands/store_cmd.rs`
- Modify: `packages/tauri-runtime/src/state/mod.rs`
- Modify: `packages/tauri-runtime/src/commands/mod.rs`
- Modify: `packages/tauri-runtime/src/main.rs`

**Step 1: StoreState 구현**

```rust
// packages/tauri-runtime/src/state/store_state.rs
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use std::path::PathBuf;
use std::fs;

pub struct StoreManager {
    stores: Mutex<HashMap<String, HashMap<String, Value>>>,
    persist_path: Option<PathBuf>,
}

impl StoreManager {
    pub fn new(persist_path: Option<PathBuf>) -> Self {
        let stores = if let Some(ref path) = persist_path {
            if path.exists() {
                let data = fs::read_to_string(path).unwrap_or_default();
                serde_json::from_str(&data).unwrap_or_default()
            } else {
                HashMap::new()
            }
        } else {
            HashMap::new()
        };

        Self {
            stores: Mutex::new(stores),
            persist_path,
        }
    }

    pub fn register(&self, name: &str, defaults: HashMap<String, Value>) {
        let mut stores = self.stores.lock().unwrap();
        stores.entry(name.to_string()).or_insert(defaults);
    }

    pub fn get(&self, name: &str) -> Option<HashMap<String, Value>> {
        let stores = self.stores.lock().unwrap();
        stores.get(name).cloned()
    }

    pub fn set(&self, name: &str, key: &str, value: Value) -> Option<HashMap<String, Value>> {
        let mut stores = self.stores.lock().unwrap();
        if let Some(store) = stores.get_mut(name) {
            store.insert(key.to_string(), value.clone());
            // 변경된 키만 반환 (patch)
            let mut patch = HashMap::new();
            patch.insert(key.to_string(), value);
            Some(patch)
        } else {
            None
        }
    }

    pub fn merge_patch(&self, name: &str, patch: HashMap<String, Value>) -> bool {
        let mut stores = self.stores.lock().unwrap();
        if let Some(store) = stores.get_mut(name) {
            for (k, v) in patch {
                store.insert(k, v);
            }
            true
        } else {
            false
        }
    }

    pub fn persist(&self) {
        if let Some(ref path) = self.persist_path {
            let stores = self.stores.lock().unwrap();
            if let Ok(data) = serde_json::to_string_pretty(&*stores) {
                let _ = fs::create_dir_all(path.parent().unwrap_or(path));
                let _ = fs::write(path, data);
            }
        }
    }
}
```

**Step 2: Store Tauri commands 구현**

```rust
// packages/tauri-runtime/src/commands/store_cmd.rs
use crate::state::store_state::StoreManager;
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub fn store_register(
    store_manager: State<'_, StoreManager>,
    name: String,
    defaults: HashMap<String, Value>,
) {
    store_manager.register(&name, defaults);
}

#[tauri::command]
pub fn store_get(
    store_manager: State<'_, StoreManager>,
    name: String,
) -> Option<HashMap<String, Value>> {
    store_manager.get(&name)
}

#[tauri::command]
pub fn store_set(
    app: AppHandle,
    store_manager: State<'_, StoreManager>,
    name: String,
    key: String,
    value: Value,
) {
    if let Some(patch) = store_manager.set(&name, &key, value) {
        // 모든 윈도우에 변경사항 emit
        let payload = serde_json::json!({
            "store": name,
            "patch": patch,
        });
        let _ = app.emit("store:changed", &payload);
    }
}

#[tauri::command]
pub fn store_get_all(
    store_manager: State<'_, StoreManager>,
    name: String,
) -> Option<HashMap<String, Value>> {
    store_manager.get(&name)
}
```

**Step 3: mod.rs 파일들 업데이트**

```rust
// packages/tauri-runtime/src/state/mod.rs
pub mod store_state;
```

```rust
// packages/tauri-runtime/src/commands/mod.rs
pub mod store_cmd;
```

**Step 4: main.rs에 Store 등록**

```rust
// packages/tauri-runtime/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod state;

use state::store_state::StoreManager;

fn main() {
    tauri::Builder::default()
        .manage(StoreManager::new(None))
        .invoke_handler(tauri::generate_handler![
            commands::store_cmd::store_register,
            commands::store_cmd::store_get,
            commands::store_cmd::store_set,
            commands::store_cmd::store_get_all,
        ])
        .setup(|app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 5: cargo check로 컴파일 확인**

Run: `cd packages/tauri-runtime && cargo check`
Expected: 컴파일 성공

**Step 6: Commit**

```bash
git add packages/tauri-runtime/
git commit -m "feat(tauri-runtime): implement StoreManager with Tauri commands"
```

---

### Task 4: @whale/sdk 패키지 초기화 + createSyncStore

**Files:**
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/tsconfig.json`
- Create: `packages/sdk/src/index.ts`
- Create: `packages/sdk/src/store.ts`
- Create: `packages/sdk/src/types.ts`
- Test: `packages/sdk/src/__tests__/store.test.ts`

**Step 1: 패키지 초기화**

```json
// packages/sdk/package.json
{
  "name": "@whale/sdk",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "solid-js": "^1.9.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  "peerDependencies": {
    "solid-js": "^1.9.0"
  }
}
```

```json
// packages/sdk/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 2: 타입 정의**

```ts
// packages/sdk/src/types.ts

// Store 관련 타입
export type StoreDefaults<T> = {
  [K in keyof T]: T[K]
}

export type SetterName<K extends string> = `set${Capitalize<K>}`

export type SyncStore<T extends Record<string, any>> = {
  readonly [K in keyof T]: T[K]
} & {
  [K in keyof T & string as SetterName<K>]: (value: T[K]) => void
}

// Window 관련 타입
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

// Frida 관련 타입
export interface Device {
  id: string
  name: string
  type: 'local' | 'usb' | 'remote'
}

export interface Session {
  id: string
  pid: number
}

export interface SpawnOptions {
  realm?: 'native' | 'emulated'
}

export interface Script {
  id: string
}

// Error 타입
export class WhaleError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
    this.name = 'WhaleError'
  }
}

export class DeviceNotFoundError extends WhaleError {
  constructor(filter?: string) {
    super(`Device not found${filter ? `: ${filter}` : ''}`, 'DEVICE_NOT_FOUND')
  }
}

export class SpawnFailedError extends WhaleError {
  constructor(bundleId: string, reason?: string) {
    super(`Failed to spawn ${bundleId}${reason ? `: ${reason}` : ''}`, 'SPAWN_FAILED')
  }
}

export class ScriptError extends WhaleError {
  constructor(message: string) {
    super(message, 'SCRIPT_ERROR')
  }
}

export class HotkeyConflictError extends WhaleError {
  constructor(keys: string[]) {
    super(`Hotkey already registered: ${keys.join('+')}`, 'HOTKEY_CONFLICT')
  }
}
```

**Step 3: failing test 작성**

```ts
// packages/sdk/src/__tests__/store.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tauri API를 mock
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

describe('createSyncStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a store with default values', async () => {
    const { createSyncStore } = await import('../store')

    const store = createSyncStore('test', {
      count: 0,
      name: 'hello',
      active: false,
    })

    expect(store.count).toBe(0)
    expect(store.name).toBe('hello')
    expect(store.active).toBe(false)
  })

  it('should provide setter functions for each key', async () => {
    const { invoke } = await import('@tauri-apps/api/core')
    const { createSyncStore } = await import('../store')

    const store = createSyncStore('test', {
      count: 0,
    })

    expect(typeof store.setCount).toBe('function')
  })

  it('should call invoke on set', async () => {
    const { invoke } = await import('@tauri-apps/api/core')
    const { createSyncStore } = await import('../store')

    const store = createSyncStore('test', {
      count: 0,
    })

    store.setCount(42)

    expect(invoke).toHaveBeenCalledWith('store_set', {
      name: 'test',
      key: 'count',
      value: 42,
    })
  })
})
```

**Step 4: 테스트 실행 — 실패 확인**

Run: `cd packages/sdk && pnpm test -- --run`
Expected: FAIL — store 모듈 없음

**Step 5: createSyncStore 구현**

```ts
// packages/sdk/src/store.ts
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createStore, produce } from 'solid-js/store'
import { onCleanup } from 'solid-js'
import type { SyncStore, SetterName } from './types'

export function createSyncStore<T extends Record<string, any>>(
  name: string,
  defaults: T,
): SyncStore<T> {
  const [store, setStore] = createStore<T>({ ...defaults })

  // Rust에 store 등록
  invoke('store_register', { name, defaults })

  // Tauri 이벤트 수신 — 다른 윈도우 또는 Frida에서 변경된 값 반영
  const unlisten = listen<{ store: string; patch: Partial<T> }>(
    'store:changed',
    (event) => {
      if (event.payload.store !== name) return
      setStore(
        produce((s: T) => {
          for (const [key, value] of Object.entries(event.payload.patch)) {
            (s as any)[key] = value
          }
        }),
      )
    },
  )

  // Cleanup
  try {
    onCleanup(() => {
      unlisten.then((fn) => fn())
    })
  } catch {
    // onCleanup은 컴포넌트 바깥에서 호출 시 무시
  }

  // Proxy로 getter/setter 제공
  return new Proxy(store, {
    get(target, prop: string) {
      // setXxx 패턴 감지
      if (prop.startsWith('set') && prop.length > 3) {
        const field = prop[3].toLowerCase() + prop.slice(4)
        return (value: any) => {
          setStore(
            produce((s: T) => {
              (s as any)[field] = value
            }),
          )
          invoke('store_set', { name, key: field, value })
        }
      }
      return (target as any)[prop]
    },
  }) as SyncStore<T>
}
```

**Step 6: 테스트 실행 — 통과 확인**

Run: `cd packages/sdk && pnpm test -- --run`
Expected: PASS

**Step 7: index.ts export**

```ts
// packages/sdk/src/index.ts
export { createSyncStore } from './store'
export type {
  SyncStore,
  WindowConfig,
  Device,
  Session,
  SpawnOptions,
  Script,
  WhaleError,
  DeviceNotFoundError,
  SpawnFailedError,
  ScriptError,
  HotkeyConflictError,
} from './types'
```

**Step 8: Commit**

```bash
git add packages/sdk/
git commit -m "feat(sdk): implement createSyncStore with Tauri IPC sync"
```

---

## Phase 2: 윈도우 관리

### Task 5: Rust WindowManager 구현

**Files:**
- Create: `packages/tauri-runtime/src/commands/window_cmd.rs`
- Modify: `packages/tauri-runtime/src/commands/mod.rs`
- Modify: `packages/tauri-runtime/src/main.rs`

**Step 1: window commands 구현**

```rust
// packages/tauri-runtime/src/commands/window_cmd.rs
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct WindowCreateConfig {
    pub id: String,
    pub url: String,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub transparent: Option<bool>,
    pub decorations: Option<bool>,
    pub always_on_top: Option<bool>,
    pub skip_taskbar: Option<bool>,
    pub visible: Option<bool>,
    pub x: Option<f64>,
    pub y: Option<f64>,
}

#[tauri::command]
pub fn window_show(app: AppHandle, id: String) -> Result<(), String> {
    let window = app.get_webview_window(&id).ok_or(format!("Window '{}' not found", id))?;
    window.show().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_hide(app: AppHandle, id: String) -> Result<(), String> {
    let window = app.get_webview_window(&id).ok_or(format!("Window '{}' not found", id))?;
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_toggle(app: AppHandle, id: String) -> Result<(), String> {
    let window = app.get_webview_window(&id).ok_or(format!("Window '{}' not found", id))?;
    if window.is_visible().unwrap_or(false) {
        window.hide().map_err(|e| e.to_string())
    } else {
        window.show().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn window_close(app: AppHandle, id: String) -> Result<(), String> {
    let window = app.get_webview_window(&id).ok_or(format!("Window '{}' not found", id))?;
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_set_position(app: AppHandle, id: String, x: f64, y: f64) -> Result<(), String> {
    let window = app.get_webview_window(&id).ok_or(format!("Window '{}' not found", id))?;
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: x as i32,
            y: y as i32,
        }))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_set_size(app: AppHandle, id: String, width: f64, height: f64) -> Result<(), String> {
    let window = app.get_webview_window(&id).ok_or(format!("Window '{}' not found", id))?;
    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: width as u32,
            height: height as u32,
        }))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_set_always_on_top(app: AppHandle, id: String, value: bool) -> Result<(), String> {
    let window = app.get_webview_window(&id).ok_or(format!("Window '{}' not found", id))?;
    window.set_always_on_top(value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_center(app: AppHandle, id: String) -> Result<(), String> {
    let window = app.get_webview_window(&id).ok_or(format!("Window '{}' not found", id))?;
    window.center().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_is_visible(app: AppHandle, id: String) -> Result<bool, String> {
    let window = app.get_webview_window(&id).ok_or(format!("Window '{}' not found", id))?;
    window.is_visible().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_create(app: AppHandle, config: WindowCreateConfig) -> Result<(), String> {
    let url = WebviewUrl::App(config.url.into());
    let mut builder = WebviewWindowBuilder::new(&app, &config.id, url);

    if let Some(w) = config.width {
        if let Some(h) = config.height {
            builder = builder.inner_size(w, h);
        }
    }
    if let Some(true) = config.transparent {
        builder = builder.transparent(true);
    }
    if let Some(v) = config.decorations {
        builder = builder.decorations(v);
    }
    if let Some(true) = config.always_on_top {
        builder = builder.always_on_top(true);
    }
    if let Some(true) = config.skip_taskbar {
        builder = builder.skip_taskbar(true);
    }
    if let Some(false) = config.visible {
        builder = builder.visible(false);
    }
    if let (Some(x), Some(y)) = (config.x, config.y) {
        builder = builder.position(x, y);
    }

    builder.build().map_err(|e| e.to_string())?;
    Ok(())
}
```

**Step 2: mod.rs 업데이트, main.rs에 커맨드 등록**

```rust
// packages/tauri-runtime/src/commands/mod.rs
pub mod store_cmd;
pub mod window_cmd;
```

main.rs의 `invoke_handler`에 모든 window 커맨드 추가.

**Step 3: cargo check**

Run: `cd packages/tauri-runtime && cargo check`
Expected: 컴파일 성공

**Step 4: Commit**

```bash
git add packages/tauri-runtime/
git commit -m "feat(tauri-runtime): implement window management commands"
```

---

### Task 6: useWindow / useCurrentWindow 훅

**Files:**
- Create: `packages/sdk/src/hooks/useWindow.ts`
- Create: `packages/sdk/src/hooks/useCurrentWindow.ts`
- Test: `packages/sdk/src/__tests__/useWindow.test.ts`
- Modify: `packages/sdk/src/index.ts`

**Step 1: failing test 작성**

```ts
// packages/sdk/src/__tests__/useWindow.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

describe('useWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return window control methods', async () => {
    const { useWindow } = await import('../hooks/useWindow')
    const win = useWindow('overlay')

    expect(typeof win.show).toBe('function')
    expect(typeof win.hide).toBe('function')
    expect(typeof win.toggle).toBe('function')
    expect(typeof win.close).toBe('function')
    expect(typeof win.setPosition).toBe('function')
    expect(typeof win.setSize).toBe('function')
    expect(typeof win.setAlwaysOnTop).toBe('function')
    expect(typeof win.center).toBe('function')
  })

  it('should invoke correct Tauri command on show', async () => {
    const { invoke } = await import('@tauri-apps/api/core')
    const { useWindow } = await import('../hooks/useWindow')

    const win = useWindow('overlay')
    win.show()

    expect(invoke).toHaveBeenCalledWith('window_show', { id: 'overlay' })
  })

  it('should invoke correct Tauri command on toggle', async () => {
    const { invoke } = await import('@tauri-apps/api/core')
    const { useWindow } = await import('../hooks/useWindow')

    const win = useWindow('overlay')
    win.toggle()

    expect(invoke).toHaveBeenCalledWith('window_toggle', { id: 'overlay' })
  })
})
```

**Step 2: 테스트 실행 — 실패 확인**

Run: `cd packages/sdk && pnpm test -- --run`
Expected: FAIL — useWindow 모듈 없음

**Step 3: useWindow 구현**

```ts
// packages/sdk/src/hooks/useWindow.ts
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createSignal, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'

export interface WindowHandle {
  show(): void
  hide(): void
  toggle(): void
  close(): void
  visible: Accessor<boolean>
  setPosition(x: number, y: number): void
  setSize(w: number, h: number): void
  setAlwaysOnTop(value: boolean): void
  center(): void
}

export function useWindow(id: string): WindowHandle {
  const [visible, setVisible] = createSignal(true)

  // 윈도우 visibility 변경 이벤트 수신
  const unlisten = listen<{ id: string; visible: boolean }>(
    'window:visibility-changed',
    (event) => {
      if (event.payload.id === id) {
        setVisible(event.payload.visible)
      }
    },
  )

  try {
    onCleanup(() => {
      unlisten.then((fn) => fn())
    })
  } catch {
    // 컴포넌트 바깥 호출 시 무시
  }

  return {
    show: () => invoke('window_show', { id }),
    hide: () => invoke('window_hide', { id }),
    toggle: () => invoke('window_toggle', { id }),
    close: () => invoke('window_close', { id }),
    visible,
    setPosition: (x: number, y: number) => invoke('window_set_position', { id, x, y }),
    setSize: (w: number, h: number) => invoke('window_set_size', { id, width: w, height: h }),
    setAlwaysOnTop: (value: boolean) => invoke('window_set_always_on_top', { id, value }),
    center: () => invoke('window_center', { id }),
  }
}
```

```ts
// packages/sdk/src/hooks/useCurrentWindow.ts
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindow, type WindowHandle } from './useWindow'

export interface CurrentWindowHandle extends WindowHandle {
  id: string
}

export function useCurrentWindow(): CurrentWindowHandle {
  const current = getCurrentWebviewWindow()
  const handle = useWindow(current.label)

  return {
    ...handle,
    id: current.label,
  }
}
```

**Step 4: 테스트 실행 — 통과 확인**

Run: `cd packages/sdk && pnpm test -- --run`
Expected: PASS

**Step 5: index.ts 업데이트**

```ts
// packages/sdk/src/index.ts
export { createSyncStore } from './store'
export { useWindow } from './hooks/useWindow'
export { useCurrentWindow } from './hooks/useCurrentWindow'
export type { WindowHandle } from './hooks/useWindow'
export type { CurrentWindowHandle } from './hooks/useCurrentWindow'
// ... types
```

**Step 6: Commit**

```bash
git add packages/sdk/
git commit -m "feat(sdk): implement useWindow and useCurrentWindow hooks"
```

---

## Phase 3: Input 시스템 (rdev)

### Task 7: Rust rdev 플러그인 구현

**Files:**
- Create: `packages/tauri-runtime/src/commands/input_cmd.rs`
- Create: `packages/tauri-runtime/src/state/input_state.rs`
- Modify: `packages/tauri-runtime/Cargo.toml` — rdev 의존성 추가
- Modify: `packages/tauri-runtime/src/commands/mod.rs`
- Modify: `packages/tauri-runtime/src/state/mod.rs`
- Modify: `packages/tauri-runtime/src/main.rs`

**Step 1: Cargo.toml에 rdev 추가**

```toml
# Cargo.toml [dependencies] 에 추가
rdev = "0.5"
```

**Step 2: InputState 구현**

```rust
// packages/tauri-runtime/src/state/input_state.rs
use rdev::{listen, simulate, EventType, Key};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;

pub struct HotkeyEntry {
    pub keys: Vec<String>,
    pub id: String,
}

pub struct InputManager {
    hotkeys: Arc<Mutex<Vec<HotkeyEntry>>>,
    pressed_keys: Arc<Mutex<Vec<String>>>,
    listener_running: Mutex<bool>,
}

impl InputManager {
    pub fn new() -> Self {
        Self {
            hotkeys: Arc::new(Mutex::new(Vec::new())),
            pressed_keys: Arc::new(Mutex::new(Vec::new())),
            listener_running: Mutex::new(false),
        }
    }

    pub fn register_hotkey(&self, id: &str, keys: Vec<String>) {
        let mut hotkeys = self.hotkeys.lock().unwrap();
        hotkeys.push(HotkeyEntry {
            keys,
            id: id.to_string(),
        });
    }

    pub fn unregister_hotkey(&self, id: &str) {
        let mut hotkeys = self.hotkeys.lock().unwrap();
        hotkeys.retain(|h| h.id != id);
    }

    pub fn start_listener(&self, app_handle: tauri::AppHandle) {
        let mut running = self.listener_running.lock().unwrap();
        if *running {
            return;
        }
        *running = true;

        let hotkeys = self.hotkeys.clone();
        let pressed = self.pressed_keys.clone();

        thread::spawn(move || {
            listen(move |event| {
                match event.event_type {
                    EventType::KeyPress(key) => {
                        let key_name = format!("{:?}", key).to_lowercase();
                        let mut pressed_keys = pressed.lock().unwrap();
                        if !pressed_keys.contains(&key_name) {
                            pressed_keys.push(key_name);
                        }

                        // 핫키 매칭 체크
                        let hotkeys = hotkeys.lock().unwrap();
                        for hotkey in hotkeys.iter() {
                            if hotkey.keys.iter().all(|k| pressed_keys.contains(k)) {
                                let _ = app_handle.emit(
                                    "input:hotkey-triggered",
                                    &serde_json::json!({ "id": hotkey.id }),
                                );
                            }
                        }
                    }
                    EventType::KeyRelease(key) => {
                        let key_name = format!("{:?}", key).to_lowercase();
                        let mut pressed_keys = pressed.lock().unwrap();
                        pressed_keys.retain(|k| k != &key_name);
                    }
                    _ => {}
                }
            })
            .expect("Failed to start input listener");
        });
    }
}
```

**Step 3: input commands 구현**

```rust
// packages/tauri-runtime/src/commands/input_cmd.rs
use crate::state::input_state::InputManager;
use rdev::{simulate, EventType, Key};
use tauri::State;
use std::thread;
use std::time::Duration;

#[tauri::command]
pub fn input_register_hotkey(
    input_manager: State<'_, InputManager>,
    id: String,
    keys: Vec<String>,
) {
    input_manager.register_hotkey(&id, keys);
}

#[tauri::command]
pub fn input_unregister_hotkey(
    input_manager: State<'_, InputManager>,
    id: String,
) {
    input_manager.unregister_hotkey(&id);
}

#[tauri::command]
pub fn input_simulate_key_press(key: String) -> Result<(), String> {
    let rdev_key = string_to_key(&key).ok_or(format!("Unknown key: {}", key))?;
    simulate(&EventType::KeyPress(rdev_key)).map_err(|e| format!("{:?}", e))?;
    thread::sleep(Duration::from_millis(20));
    simulate(&EventType::KeyRelease(rdev_key)).map_err(|e| format!("{:?}", e))?;
    Ok(())
}

#[tauri::command]
pub fn input_simulate_mouse_click(x: f64, y: f64) -> Result<(), String> {
    simulate(&EventType::MouseMove { x, y }).map_err(|e| format!("{:?}", e))?;
    thread::sleep(Duration::from_millis(20));
    simulate(&EventType::ButtonPress(rdev::Button::Left)).map_err(|e| format!("{:?}", e))?;
    thread::sleep(Duration::from_millis(20));
    simulate(&EventType::ButtonRelease(rdev::Button::Left)).map_err(|e| format!("{:?}", e))?;
    Ok(())
}

#[tauri::command]
pub fn input_simulate_mouse_move(x: f64, y: f64) -> Result<(), String> {
    simulate(&EventType::MouseMove { x, y }).map_err(|e| format!("{:?}", e))
}

fn string_to_key(s: &str) -> Option<Key> {
    match s.to_lowercase().as_str() {
        "a" => Some(Key::KeyA),
        "b" => Some(Key::KeyB),
        // ... 나머지 키 매핑 (구현 시 전체 키 매핑 작성)
        "f1" => Some(Key::F1),
        "f2" => Some(Key::F2),
        "f3" => Some(Key::F3),
        "escape" | "esc" => Some(Key::Escape),
        "enter" | "return" => Some(Key::Return),
        "space" => Some(Key::Space),
        "tab" => Some(Key::Tab),
        "shift" => Some(Key::ShiftLeft),
        "ctrl" | "control" => Some(Key::ControlLeft),
        "alt" => Some(Key::Alt),
        "meta" | "super" | "cmd" => Some(Key::MetaLeft),
        _ => None,
    }
}
```

**Step 4: mod.rs 업데이트, main.rs에 등록**

**Step 5: cargo check**

Run: `cd packages/tauri-runtime && cargo check`
Expected: 컴파일 성공

**Step 6: Commit**

```bash
git add packages/tauri-runtime/
git commit -m "feat(tauri-runtime): implement rdev input manager with hotkey and simulation"
```

---

### Task 8: useHotkey / useSimulate 훅

**Files:**
- Create: `packages/sdk/src/hooks/useHotkey.ts`
- Create: `packages/sdk/src/hooks/useSimulate.ts`
- Test: `packages/sdk/src/__tests__/useHotkey.test.ts`
- Modify: `packages/sdk/src/index.ts`

**Step 1: failing test 작성**

```ts
// packages/sdk/src/__tests__/useHotkey.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((_event: string, handler: Function) => {
    return Promise.resolve(() => {})
  }),
}))

describe('useHotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register hotkey via invoke', async () => {
    const { invoke } = await import('@tauri-apps/api/core')
    const { useHotkey } = await import('../hooks/useHotkey')

    const callback = vi.fn()
    useHotkey(['ctrl', 'f1'], callback)

    expect(invoke).toHaveBeenCalledWith('input_register_hotkey', expect.objectContaining({
      keys: ['ctrl', 'f1'],
    }))
  })
})
```

**Step 2: 테스트 실행 — 실패 확인**

**Step 3: useHotkey 구현**

```ts
// packages/sdk/src/hooks/useHotkey.ts
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createSignal, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'

let hotkeyCounter = 0

export interface HotkeyHandle {
  enabled: Accessor<boolean>
  setEnabled(value: boolean): void
  unregister(): void
}

export function useHotkey(
  keys: string[],
  callback: () => void,
): HotkeyHandle {
  const id = `hk_${++hotkeyCounter}`
  const [enabled, setEnabled] = createSignal(true)

  // Rust에 핫키 등록
  invoke('input_register_hotkey', { id, keys })

  // 핫키 트리거 이벤트 수신
  const unlisten = listen<{ id: string }>(
    'input:hotkey-triggered',
    (event) => {
      if (event.payload.id === id && enabled()) {
        callback()
      }
    },
  )

  const unregister = () => {
    invoke('input_unregister_hotkey', { id })
    unlisten.then((fn) => fn())
  }

  try {
    onCleanup(unregister)
  } catch {
    // 컴포넌트 바깥 호출 시 무시
  }

  return {
    enabled,
    setEnabled,
    unregister,
  }
}
```

```ts
// packages/sdk/src/hooks/useSimulate.ts
import { invoke } from '@tauri-apps/api/core'

export interface SimulateHandle {
  keyPress(key: string): void
  keyDown(key: string): void
  keyUp(key: string): void
  mouseClick(x: number, y: number): void
  mouseMove(x: number, y: number): void
}

export function useSimulate(): SimulateHandle {
  return {
    keyPress: (key: string) => invoke('input_simulate_key_press', { key }),
    keyDown: (key: string) => invoke('input_simulate_key_down', { key }),
    keyUp: (key: string) => invoke('input_simulate_key_up', { key }),
    mouseClick: (x: number, y: number) => invoke('input_simulate_mouse_click', { x, y }),
    mouseMove: (x: number, y: number) => invoke('input_simulate_mouse_move', { x, y }),
  }
}
```

**Step 4: 테스트 실행 — 통과 확인**

**Step 5: index.ts 업데이트, Commit**

```bash
git add packages/sdk/
git commit -m "feat(sdk): implement useHotkey and useSimulate hooks"
```

---

## Phase 4: Frida 통합

### Task 9: Rust frida-rust 통합

**Files:**
- Create: `packages/tauri-runtime/src/commands/frida_cmd.rs`
- Create: `packages/tauri-runtime/src/state/frida_state.rs`
- Create: `packages/tauri-runtime/src/bridge.rs`
- Modify: `packages/tauri-runtime/Cargo.toml` — frida-rust 의존성 추가
- Modify: `packages/tauri-runtime/src/commands/mod.rs`
- Modify: `packages/tauri-runtime/src/state/mod.rs`
- Modify: `packages/tauri-runtime/src/main.rs`

**Step 1: Cargo.toml에 frida-rust 추가**

```toml
# [dependencies] 에 추가
frida = "0.4"
```

**Step 2: FridaState 구현**

```rust
// packages/tauri-runtime/src/state/frida_state.rs
use frida::{DeviceManager, Frida};
use std::sync::Mutex;

pub struct FridaManager {
    frida: Frida,
}

impl FridaManager {
    pub fn new() -> Self {
        let frida = unsafe { Frida::obtain() };
        Self { frida }
    }

    pub fn device_manager(&self) -> DeviceManager {
        DeviceManager::obtain(&self.frida)
    }
}

// Note: frida-rust의 Session, Script 등은 Phase 4에서 상세 구현.
// frida-rust의 API에 맞춰 실제 구현 시 조정 필요.
```

**Step 3: frida commands 구현**

```rust
// packages/tauri-runtime/src/commands/frida_cmd.rs
use crate::state::frida_state::FridaManager;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub device_type: String,
}

#[tauri::command]
pub fn frida_list_devices(
    frida_manager: State<'_, FridaManager>,
) -> Result<Vec<DeviceInfo>, String> {
    let dm = frida_manager.device_manager();
    let devices = dm.enumerate_devices();

    Ok(devices
        .iter()
        .map(|d| DeviceInfo {
            id: d.get_id().to_string(),
            name: d.get_name().to_string(),
            device_type: format!("{:?}", d.get_type()),
        })
        .collect())
}

#[tauri::command]
pub fn frida_spawn(
    frida_manager: State<'_, FridaManager>,
    device_id: String,
    bundle_id: String,
) -> Result<u32, String> {
    let dm = frida_manager.device_manager();
    let device = dm
        .enumerate_devices()
        .into_iter()
        .find(|d| d.get_id() == device_id)
        .ok_or("Device not found")?;

    let pid = device
        .spawn(&bundle_id, &frida::SpawnOptions::new())
        .map_err(|e| format!("Spawn failed: {:?}", e))?;

    Ok(pid)
}

#[tauri::command]
pub fn frida_attach(
    frida_manager: State<'_, FridaManager>,
    device_id: String,
    pid: u32,
) -> Result<String, String> {
    // Session 관리는 실제 구현 시 FridaManager에 HashMap<String, Session>으로 관리
    // 여기서는 세션 ID를 반환하는 스텁
    Ok(format!("session_{}", pid))
}

#[tauri::command]
pub fn frida_load_script(
    frida_manager: State<'_, FridaManager>,
    session_id: String,
    code: String,
) -> Result<String, String> {
    // 스크립트 로드 + __whale_store__ 프리앰블 삽입
    // 실제 구현 시 session에서 script를 생성하고 on_message 핸들러 등록
    Ok(format!("script_{}", session_id))
}

#[tauri::command]
pub fn frida_detach(
    frida_manager: State<'_, FridaManager>,
    session_id: String,
) -> Result<(), String> {
    // 세션 detach
    Ok(())
}
```

**Step 4: bridge.rs — Frida 메시지 → Store 자동 업데이트**

```rust
// packages/tauri-runtime/src/bridge.rs
use crate::state::store_state::StoreManager;
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager};

/// Frida 스크립트에서 send()된 메시지를 처리
/// __whale 마커가 있으면 store를 자동 업데이트
pub fn handle_frida_message(
    app: &AppHandle,
    message: &Value,
) {
    if let Some(obj) = message.as_object() {
        if obj.get("__whale").and_then(|v| v.as_bool()) == Some(true) {
            if let (Some(store_name), Some(patch)) = (
                obj.get("store").and_then(|v| v.as_str()),
                obj.get("patch").and_then(|v| v.as_object()),
            ) {
                let store_manager = app.state::<StoreManager>();
                let patch_map: HashMap<String, Value> = patch
                    .iter()
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect();

                store_manager.merge_patch(store_name, patch_map.clone());

                // 모든 윈도우에 emit
                let payload = serde_json::json!({
                    "store": store_name,
                    "patch": patch_map,
                });
                let _ = app.emit("store:changed", &payload);
            }
        }
    }
}
```

**Step 5: main.rs 업데이트**

**Step 6: cargo check**

Run: `cd packages/tauri-runtime && cargo check`
Expected: 컴파일 성공

**Step 7: Commit**

```bash
git add packages/tauri-runtime/
git commit -m "feat(tauri-runtime): integrate frida-rust with store bridge"
```

---

### Task 10: useDevice / useSession 훅

**Files:**
- Create: `packages/sdk/src/hooks/useDevice.ts`
- Create: `packages/sdk/src/hooks/useDevices.ts`
- Create: `packages/sdk/src/hooks/useSession.ts`
- Test: `packages/sdk/src/__tests__/useDevice.test.ts`
- Modify: `packages/sdk/src/index.ts`

**Step 1: failing test**

```ts
// packages/sdk/src/__tests__/useDevice.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

describe('useDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return device state and spawn/attach methods', async () => {
    const { useDevice } = await import('../hooks/useDevice')
    const dev = useDevice({ type: 'usb' })

    expect(typeof dev.spawn).toBe('function')
    expect(typeof dev.attach).toBe('function')
    expect(typeof dev.status).toBe('function')
  })
})
```

**Step 2: 테스트 실행 — 실패 확인**

**Step 3: 구현**

```ts
// packages/sdk/src/hooks/useDevice.ts
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createSignal, onMount, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'
import type { Device, Session, SpawnOptions } from '../types'

export interface DeviceHandle {
  device: Accessor<Device | null>
  status: Accessor<'searching' | 'connected' | 'disconnected'>
  spawn(bundleId: string, opts?: SpawnOptions): Promise<Session>
  attach(pid: number): Promise<Session>
}

export function useDevice(filter?: {
  type?: 'usb' | 'local' | 'remote'
  id?: string
}): DeviceHandle {
  const [device, setDevice] = createSignal<Device | null>(null)
  const [status, setStatus] = createSignal<'searching' | 'connected' | 'disconnected'>('searching')

  const findDevice = async () => {
    try {
      setStatus('searching')
      const devices = await invoke<Device[]>('frida_list_devices')
      const found = devices.find((d) => {
        if (filter?.id && d.id !== filter.id) return false
        if (filter?.type && d.type !== filter.type) return false
        return true
      })

      if (found) {
        setDevice(found)
        setStatus('connected')
      } else {
        setStatus('disconnected')
      }
    } catch {
      setStatus('disconnected')
    }
  }

  onMount(() => {
    findDevice()
  })

  const spawn = async (bundleId: string, opts?: SpawnOptions): Promise<Session> => {
    const dev = device()
    if (!dev) throw new Error('No device connected')

    const pid = await invoke<number>('frida_spawn', {
      deviceId: dev.id,
      bundleId,
      ...(opts || {}),
    })

    const sessionId = await invoke<string>('frida_attach', {
      deviceId: dev.id,
      pid,
    })

    return { id: sessionId, pid }
  }

  const attach = async (pid: number): Promise<Session> => {
    const dev = device()
    if (!dev) throw new Error('No device connected')

    const sessionId = await invoke<string>('frida_attach', {
      deviceId: dev.id,
      pid,
    })

    return { id: sessionId, pid }
  }

  return { device, status, spawn, attach }
}
```

```ts
// packages/sdk/src/hooks/useDevices.ts
import { invoke } from '@tauri-apps/api/core'
import { createSignal, onMount } from 'solid-js'
import type { Accessor } from 'solid-js'
import type { Device } from '../types'

export interface DevicesHandle {
  devices: Accessor<Device[]>
  refresh(): void
}

export function useDevices(): DevicesHandle {
  const [devices, setDevices] = createSignal<Device[]>([])

  const refresh = async () => {
    const list = await invoke<Device[]>('frida_list_devices')
    setDevices(list)
  }

  onMount(refresh)

  return { devices, refresh }
}
```

```ts
// packages/sdk/src/hooks/useSession.ts
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createSignal, onCleanup } from 'solid-js'
import type { Accessor } from 'solid-js'
import type { Session, Script } from '../types'

export interface SessionHandle {
  status: Accessor<'attached' | 'detached'>
  loadScript(code: string): Promise<Script>
  loadScriptFile(path: string): Promise<Script>
  detach(): void
}

export function useSession(session: Session): SessionHandle {
  const [status, setStatus] = createSignal<'attached' | 'detached'>('attached')

  const unlisten = listen<{ sessionId: string }>(
    'frida:session-detached',
    (event) => {
      if (event.payload.sessionId === session.id) {
        setStatus('detached')
      }
    },
  )

  try {
    onCleanup(() => {
      unlisten.then((fn) => fn())
    })
  } catch {}

  return {
    status,
    loadScript: async (code: string) => {
      const scriptId = await invoke<string>('frida_load_script', {
        sessionId: session.id,
        code,
      })
      return { id: scriptId }
    },
    loadScriptFile: async (path: string) => {
      const scriptId = await invoke<string>('frida_load_script_file', {
        sessionId: session.id,
        path,
      })
      return { id: scriptId }
    },
    detach: () => {
      invoke('frida_detach', { sessionId: session.id })
      setStatus('detached')
    },
  }
}
```

**Step 4: 테스트 실행 — 통과 확인**

**Step 5: index.ts 업데이트, Commit**

```bash
git add packages/sdk/
git commit -m "feat(sdk): implement useDevice, useDevices, useSession hooks"
```

---

## Phase 5: CLI 빌드 시스템

### Task 11: @whale/cli 패키지 초기화

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/config.ts`
- Create: `packages/cli/src/commands/dev.ts`
- Create: `packages/cli/src/commands/build.ts`
- Create: `packages/cli/src/commands/create.ts`
- Create: `packages/cli/src/generators/tauri-conf.ts`
- Create: `packages/cli/src/generators/cargo-toml.ts`

**Step 1: package.json**

```json
{
  "name": "@whale/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "whale": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "cac": "^6.7.0",
    "esbuild": "^0.24.0",
    "picocolors": "^1.1.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

**Step 2: config.ts — defineConfig + whale.config.ts 파서**

```ts
// packages/cli/src/config.ts
import type { WindowConfig } from '@whale/sdk'

export interface WhaleConfig {
  app: {
    name: string
    version: string
    identifier: string
  }
  windows: Record<string, WindowConfig & { entry: string }>
  store?: {
    persist?: boolean
    persistPath?: string
  }
  build?: {
    outDir?: string
  }
}

export function defineConfig(config: WhaleConfig): WhaleConfig {
  return config
}
```

**Step 3: tauri-conf generator**

```ts
// packages/cli/src/generators/tauri-conf.ts
import type { WhaleConfig } from '../config'

export function generateTauriConf(config: WhaleConfig): object {
  const windows = Object.entries(config.windows).map(([id, win]) => ({
    label: id,
    title: id === 'main' ? config.app.name : id,
    url: win.entry,
    width: win.width || 800,
    height: win.height || 600,
    resizable: win.resizable ?? true,
    transparent: win.transparent ?? false,
    decorations: win.decorations ?? true,
    alwaysOnTop: win.alwaysOnTop ?? false,
    skipTaskbar: win.skipTaskbar ?? false,
    visible: win.visible ?? true,
  }))

  return {
    productName: config.app.name,
    identifier: config.app.identifier,
    version: config.app.version,
    build: {
      frontendDist: '../dist',
      devUrl: 'http://localhost:5173',
    },
    app: {
      withGlobalTauri: true,
      windows,
    },
  }
}
```

**Step 4: dev command 스텁**

```ts
// packages/cli/src/commands/dev.ts
import { spawn } from 'child_process'
import path from 'path'

export async function dev(configPath: string) {
  // 1. whale.config.ts 로드
  // 2. dist/.tauri/ 에 tauri.conf.json 생성
  // 3. Vite dev server 시작
  // 4. frida-compile --watch 시작
  // 5. Tauri dev 시작
  console.log('whale dev — starting...')
}
```

**Step 5: CLI 엔트리포인트**

```ts
// packages/cli/src/index.ts
#!/usr/bin/env node
import { cac } from 'cac'
import { dev } from './commands/dev'
import { build } from './commands/build'

const cli = cac('whale')

cli.command('dev', 'Start development server')
  .action(() => dev('./whale.config.ts'))

cli.command('build', 'Build for production')
  .action(() => build('./whale.config.ts'))

cli.command('create <name>', 'Create new whale project')
  .action((name: string) => {
    console.log(`Creating ${name}...`)
  })

cli.help()
cli.version('0.1.0')
cli.parse()
```

**Step 6: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): initialize CLI with dev/build/create commands"
```

---

### Task 12: create-whale-app 스캐폴더

**Files:**
- Modify: `packages/cli/src/commands/create.ts`
- Create: `packages/cli/templates/` (템플릿 파일들)

**Step 1: 템플릿 파일 작성**

프로젝트 스캐폴딩에 필요한 파일들:
- `package.json` 템플릿
- `tsconfig.json` 템플릿
- `whale.config.ts` 템플릿
- `src/ui/windows/main.tsx` 템플릿
- `src/store/app.ts` 템플릿
- `src/script/hooks/main.ts` 템플릿
- `src/script/types.ts` 템플릿

**Step 2: create 커맨드 구현**

프로젝트 이름 받아서 디렉토리 생성 + 템플릿 복사 + `pnpm install` 실행.

**Step 3: 테스트 — 실제 create 실행해서 디렉토리 확인**

**Step 4: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): implement create-whale-app scaffolder"
```

---

## Phase 6: UI 컴포넌트

### Task 13: @whale/ui 패키지 초기화 + 기본 컴포넌트

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/src/components/Button.tsx`
- Create: `packages/ui/src/components/Text.tsx`
- Create: `packages/ui/src/components/Switch.tsx`
- Create: `packages/ui/src/components/Slider.tsx`
- Create: `packages/ui/src/layouts/Flex.tsx`
- Create: `packages/ui/src/theme/tokens.ts`

**Step 1: 패키지 초기화**

```json
{
  "name": "@whale/ui",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "solid-js": "^1.9.0"
  },
  "peerDependencies": {
    "solid-js": "^1.9.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

**Step 2: 테마 토큰**

```ts
// packages/ui/src/theme/tokens.ts
export const colors = {
  bg: '#1a1a2e',
  surface: '#16213e',
  primary: '#0f3460',
  accent: '#e94560',
  text: '#eaeaea',
  dim: '#8892b0',
  success: '#64ffda',
  warning: '#ffd700',
  error: '#ff6b6b',
}

export const spacing = {
  1: '4px',
  2: '8px',
  4: '16px',
  8: '32px',
  16: '64px',
}
```

**Step 3: 기본 컴포넌트 구현 (Button, Text, Switch, Slider, Flex)**

트레이너에 맞는 다크 테마 기본 스타일.

**Step 4: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): initialize component library with dark trainer theme"
```

---

## Phase 7: 통합 + __whale_store__ 프리앰블

### Task 14: Frida 스크립트 프리앰블 시스템

**Files:**
- Create: `packages/tauri-runtime/src/preamble.rs`
- Modify: `packages/tauri-runtime/src/commands/frida_cmd.rs`

**Step 1: 프리앰블 템플릿 구현**

Rust에서 스크립트 로드 시 `__whale_store__` 코드를 앞에 자동 삽입.
Store 초기 상태를 JSON으로 직렬화하여 `%INITIAL_STATE%` 치환.

**Step 2: frida_cmd의 load_script에 프리앰블 삽입 로직 추가**

**Step 3: 테스트 — 프리앰블이 올바르게 생성되는지 단위 테스트**

**Step 4: Commit**

```bash
git add packages/tauri-runtime/
git commit -m "feat(tauri-runtime): implement __whale_store__ preamble injection"
```

---

### Task 15: frida-compile 통합

**Files:**
- Modify: `packages/cli/src/commands/dev.ts`
- Modify: `packages/cli/src/commands/build.ts`
- Modify: `packages/cli/package.json` — frida-compile 의존성 추가

**Step 1: dev 커맨드에 frida-compile --watch 추가**

**Step 2: build 커맨드에 frida-compile 빌드 스텝 추가**

**Step 3: 테스트 — TS 스크립트가 JS로 정상 컴파일되는지 확인**

**Step 4: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): integrate frida-compile for TS script compilation"
```

---

## Phase 8: 영속성 + 마무리

### Task 16: Store 영속성 (debounced file save)

**Files:**
- Modify: `packages/tauri-runtime/src/state/store_state.rs`
- Modify: `packages/tauri-runtime/src/main.rs`

**Step 1: StoreManager에 debounced persist 추가**

500ms debounce로 변경된 store만 파일에 저장.
앱 종료 시 최종 flush.

**Step 2: main.rs setup에서 persist_path 설정 + 종료 핸들러 등록**

**Step 3: Commit**

```bash
git add packages/tauri-runtime/
git commit -m "feat(tauri-runtime): add debounced store persistence"
```

---

### Task 17: 예제 프로젝트

**Files:**
- Create: `apps/example/` — create-whale-app으로 생성한 예제

**Step 1: create-whale-app으로 예제 프로젝트 생성**

**Step 2: 메인/오버레이/설정 윈도우 예제 코드 작성**

**Step 3: whale dev로 실행 확인**

**Step 4: Commit**

```bash
git add apps/example/
git commit -m "feat: add example trainer project"
```

---

## Phase 9: 선택적 윈도우 emit 최적화

### Task 18: 윈도우별 store subscription 필터링

**Files:**
- Modify: `packages/tauri-runtime/src/commands/store_cmd.rs`
- Modify: `packages/tauri-runtime/src/state/store_state.rs`
- Modify: `packages/sdk/src/store.ts`

**Step 1: SDK에서 store 생성 시 subscribe 키 목록을 Rust에 등록**

**Step 2: Rust에서 emit 시 해당 윈도우가 관심 있는 키만 전송**

**Step 3: Commit**

```bash
git add packages/
git commit -m "perf: implement selective window emit for store changes"
```

---

## 구현 순서 요약

```
Phase 0: Task 1-2   프로젝트 부트스트랩 (monorepo + Tauri 셸)
Phase 1: Task 3-4   Store 시스템 (Rust + SDK)
Phase 2: Task 5-6   윈도우 관리 (Rust + SDK)
Phase 3: Task 7-8   Input/rdev (Rust + SDK)
Phase 4: Task 9-10  Frida 통합 (Rust + SDK)
Phase 5: Task 11-12 CLI 빌드 시스템
Phase 6: Task 13    UI 컴포넌트
Phase 7: Task 14-15 통합 (프리앰블 + frida-compile)
Phase 8: Task 16-17 영속성 + 예제
Phase 9: Task 18    성능 최적화
```

각 Phase는 독립적으로 테스트 가능. Phase 0-1이 완료되어야 나머지 Phase 진행 가능.
Phase 2-4는 병렬 진행 가능 (모두 Phase 1의 Store에 의존하지만 서로 독립적).
