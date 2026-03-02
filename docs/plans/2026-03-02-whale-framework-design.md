# WhaLe Framework Design

> Node/TS 기반 종합 트레이너 프레임워크. Tauri + frida-rust + rdev를 내부에 사용하되, 사용자에게는 순수 SolidJS + TypeScript API만 노출.

## 1. 아키텍처

### 단일 프로세스 구조

```
┌─────────────────────────────────────────────────────┐
│                  Tauri 단일 프로세스                   │
│                                                       │
│  ┌─────────────────────────────────────────────┐     │
│  │           WebView (SolidJS)                  │     │
│  │                                              │     │
│  │  사용자 TS 코드 (앱 로직 + UI)                │     │
│  │  @whale/sdk 훅 → Tauri invoke/events         │     │
│  └──────────────────┬──────────────────────────┘     │
│                     │ Tauri IPC                        │
│  ┌──────────────────▼──────────────────────────┐     │
│  │           Rust 백엔드                         │     │
│  │                                               │     │
│  │  ┌─────────────┐  ┌──────────────────────┐   │     │
│  │  │ rdev crate  │  │ frida-rust crate     │   │     │
│  │  │ • 핫키 등록  │  │ • DeviceManager      │   │     │
│  │  │ • 입력 시뮬  │  │ • Session            │   │     │
│  │  └─────────────┘  │ • Script             │   │     │
│  │                    └──────────────────────┘   │     │
│  │                                               │     │
│  │  StoreManager (상태 동기화 + 영속성)            │     │
│  │  WindowManager (멀티윈도우 관리)                │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 설계 결정 사유

| 결정 | 대안 | 이유 |
|------|------|------|
| Tauri 단일 프로세스 | Node sidecar 구조 | IPC 홉 5→2로 감소, 프로세스 1개로 단순화 |
| frida-rust | frida-node | Node sidecar 제거, in-process 호출로 레이턴시 ~0 |
| rdev crate 직접 통합 | rdev-node 바인딩 | Tauri Rust 백엔드에서 직접 호출, 추가 바인딩 불필요 |
| SolidJS Hook API | 네임스페이스 객체 (whale.window.*) | DX 최적화, SolidJS 반응성 시스템과 자연스러운 통합 |
| src-tauri 숨김 | 사용자 프로젝트에 노출 | 사용자가 Rust를 전혀 몰라도 됨, Electron 수준의 DX |

### 타겟 플랫폼

- Android (USB/에뮬레이터)
- iOS (USB, jailbroken)
- Windows 데스크톱 프로세스
- Frida가 지원하는 모든 플랫폼

## 2. 패키지 구조 (Monorepo)

```
whale/
├── packages/
│   ├── sdk/                     # @whale/sdk — SolidJS Hook 기반 API
│   │   ├── src/
│   │   │   ├── hooks/
│   │   │   │   ├── useWindow.ts        # 윈도우 제어 훅
│   │   │   │   ├── useCurrentWindow.ts # 현재 윈도우 제어
│   │   │   │   ├── useDevice.ts        # Frida 디바이스 연결
│   │   │   │   ├── useDevices.ts       # 디바이스 목록 (반응형)
│   │   │   │   ├── useSession.ts       # Frida 세션 관리
│   │   │   │   ├── useHotkey.ts        # 글로벌 핫키
│   │   │   │   └── useSimulate.ts      # 입력 시뮬레이션
│   │   │   ├── store.ts                # createSyncStore()
│   │   │   ├── events.ts              # 이벤트 시스템
│   │   │   └── index.ts               # public exports
│   │   └── package.json
│   │
│   ├── ui/                      # @whale/ui — SolidJS 컴포넌트
│   │   ├── src/
│   │   │   ├── components/         # Button, Switch, Slider, Text 등
│   │   │   ├── layouts/            # Flex, Grid, Stack
│   │   │   ├── theme/              # 트레이너용 기본 테마
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── cli/                     # @whale/cli — whale dev/build/create
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── dev.ts          # Vite + frida-compile watch + Tauri dev
│   │   │   │   ├── build.ts        # 전체 빌드 파이프라인
│   │   │   │   └── create.ts       # create-whale-app 스캐폴딩
│   │   │   ├── generators/
│   │   │   │   ├── tauri-conf.ts   # whale.config.ts → tauri.conf.json
│   │   │   │   └── cargo-toml.ts   # Cargo.toml 생성
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── tauri-runtime/           # @whale/tauri-runtime (Rust 코드)
│       ├── src/
│       │   ├── main.rs
│       │   ├── commands/
│       │   │   ├── frida_cmd.rs       # frida-rust 래핑 커맨드
│       │   │   ├── input_cmd.rs       # rdev 래핑 커맨드
│       │   │   ├── window_cmd.rs      # 멀티윈도우 관리
│       │   │   ├── store_cmd.rs       # store CRUD + 영속성
│       │   │   └── mod.rs
│       │   ├── state/
│       │   │   ├── store_state.rs     # SyncStore Rust 측 관리
│       │   │   ├── frida_state.rs     # DeviceManager, Sessions
│       │   │   └── input_state.rs     # 핫키 등록 상태
│       │   └── bridge.rs              # Frida 메시지 → store 자동 업데이트
│       ├── Cargo.toml                 # frida-rust, rdev, tauri
│       └── templates/
│           └── tauri.conf.template.json
│
└── package.json                 # workspace root
```

## 3. 사용자 프로젝트 구조

`create-whale-app`이 생성하는 구조:

```
my-trainer/
├── src/
│   ├── ui/                      # SolidJS UI 코드
│   │   ├── windows/
│   │   │   ├── main.tsx            # 메인 트레이너 UI
│   │   │   ├── overlay.tsx         # 게임 오버레이 (투명)
│   │   │   └── settings.tsx        # 설정 창
│   │   └── components/
│   │       └── DevicePanel.tsx
│   │
│   ├── script/                  # Frida 스크립트 (TS)
│   │   ├── hooks/
│   │   │   ├── main.ts
│   │   │   └── currency.ts
│   │   └── types.ts                # store 인터페이스 (UI와 공유)
│   │
│   └── store/                   # 동기화 Store 정의
│       └── trainer.ts
│
├── whale.config.ts              # 앱/윈도우 설정
├── package.json
└── tsconfig.json
```

**사용자 프로젝트에 src-tauri 없음.** `@whale/cli`가 빌드 시 dist/에 자동 생성.

## 4. API 설계

### 4.1 SolidJS Hook API (@whale/sdk)

```ts
// ─── Window ───
useWindow(id: string): {
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

useCurrentWindow(): {
  ...useWindow 동일
  id: string
}

// ─── Frida ───
useDevice(filter?: { type?: 'usb' | 'local' | 'remote', id?: string }): {
  device: Accessor<Device | null>
  status: Accessor<'searching' | 'connected' | 'disconnected'>
  spawn(bundleId: string, opts?: SpawnOptions): Promise<Session>
  attach(pid: number): Promise<Session>
}

useSession(session: Session): {
  status: Accessor<'attached' | 'detached'>
  loadScript(code: string): Promise<Script>
  loadScriptFile(path: string): Promise<Script>
  detach(): void
}

useDevices(): {
  devices: Accessor<Device[]>
  refresh(): void
}

// ─── Input ───
useHotkey(keys: string[], callback: () => void): {
  enabled: Accessor<boolean>
  setEnabled(value: boolean): void
  unregister(): void
}

useSimulate(): {
  keyPress(key: string): void
  keyDown(key: string): void
  keyUp(key: string): void
  mouseClick(x: number, y: number): void
  mouseMove(x: number, y: number): void
}

// ─── Store ───
createSyncStore<T>(name: string, defaults: T): SyncStore<T>
```

### 4.2 whale.config.ts

```ts
import { defineConfig } from '@whale/cli'

export default defineConfig({
  app: {
    name: 'My Trainer',
    version: '1.0.0',
    identifier: 'com.mytrainer.app',
  },
  windows: {
    main: {
      entry: './src/ui/windows/main.tsx',
      width: 600,
      height: 450,
      resizable: true,
      alwaysOnTop: true,
    },
    overlay: {
      entry: './src/ui/windows/overlay.tsx',
      width: 300,
      height: 200,
      transparent: true,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      position: { x: 0, y: 0 },
      clickThrough: true,
    },
    settings: {
      entry: './src/ui/windows/settings.tsx',
      width: 400,
      height: 300,
      visible: false,
    },
  },
  store: {
    persist: true,
    persistPath: 'data.json',
  },
})
```

## 5. Store 동기화 시스템

### 동기화 흐름

```
┌──────────────────────────────────────────────────────┐
│  WebView (SolidJS)                                    │
│  trainerStore.setGodMode(true)                        │
│       │                                               │
│       ▼ invoke('store:set')                           │
└───────┬───────────────────────────────────────────────┘
        │
┌───────▼───────────────────────────────────────────────┐
│  Rust StoreManager                                     │
│  1. HashMap 업데이트                                    │
│  2. emit('store:changed', diff) → 관심 윈도우만          │
│  3. script.post_message({config: patch}) → Frida       │
│  4. 영속성 저장 (500ms debounce)                        │
│                                                        │
│  ◄── Frida on_message 수신 시:                          │
│  5. store 업데이트 → emit → 전체 윈도우                   │
└───────────────────────────────────────────────────────┘
        │
┌───────▼───────────────────────────────────────────────┐
│  Frida 스크립트 (타겟 프로세스 내부)                      │
│                                                        │
│  __whale_store__.godMode  // 즉시 읽기 (0ns)            │
│  __whale_store__.set('hp', val)  // batch send (16ms)  │
└────────────────────────────────────────────────────────┘
```

### 경로별 레이턴시

| 경로 | 홉수 | 레이턴시 | 빈도 |
|------|:----:|:-------:|------|
| Frida 스크립트 내부 store 읽기 | 0 | ~0ns | 매우 높음 (매 후킹) |
| UI 설정 → Rust → Frida post_message | 2 | ~1-2ms | 낮음 (사용자 조작) |
| Frida → Rust → 윈도우 emit | 2 | ~1-2ms | 중간 (모니터링) |
| 윈도우 간 store 동기화 | 1 | ~0.5ms | 낮음 |
| 영속성 저장 | 1 | ~1-5ms | 낮음 (debounced) |

### __whale_store__ 자동 inject 구현

라이브러리가 Frida 스크립트 앞에 자동으로 prepend:

```js
const __whale_store__ = (() => {
  const _data = %INITIAL_STATE%;
  const _dirty = new Set();
  let _timer = null;

  const _flush = () => {
    if (_dirty.size === 0) return;
    const patch = {};
    for (const k of _dirty) patch[k] = _data[k];
    _dirty.clear();
    _timer = null;
    send({ __whale: true, store: '%STORE_NAME%', patch });
  };

  recv('config', (msg) => {
    Object.assign(_data, msg.payload);
  });

  return new Proxy(_data, {
    get(target, key) {
      if (key === 'set') {
        return (k, v) => {
          target[k] = v;
          _dirty.add(k);
          if (!_timer) _timer = setTimeout(_flush, 16);
        };
      }
      return target[key];
    },
  });
})();
```

## 6. 성능 최적화

### 적용된 최적화

| 최적화 | 대상 | 효과 |
|--------|------|------|
| Frida send() throttle + batch | 스크립트 → Rust | 16ms 간격, 변경 키만 전송. IPC 폭발 방지 |
| 선택적 윈도우 emit | Rust → WebView | 관심 키 subscribe한 윈도우에만 전송 |
| 영속성 debounce | Rust → 파일 | 500ms debounce, dirty store만 저장 |
| in-process frida-rust | Frida 호출 | Node sidecar 제거, IPC 홉 5→2 |

### Rust 측 선택적 emit

```rust
fn on_store_patch(&self, store_name: &str, patch: HashMap<String, Value>) {
    self.stores.get_mut(store_name).merge(patch.clone());

    for (window_id, window) in &self.windows {
        let relevant: HashMap<_, _> = patch.iter()
            .filter(|(k, _)| window.subscribed_keys.contains(k))
            .collect();

        if !relevant.is_empty() {
            window.emit("store:changed", &relevant);
        }
    }
}
```

## 7. Script 빌드 파이프라인

```
src/script/**/*.ts
    │
    ▼ frida-compile (TS → JS)
    │ @types/frida-gum 타입 지원
    │
    ▼ __whale_store__ 프리앰블 삽입
    │
    ▼ 최종 JS → frida-rust가 인젝션
```

### 타입 공유

```
src/script/types.ts  ←── store 인터페이스 정의 (단일 소스)
    │
    ├── src/store/trainer.ts     createSyncStore<TrainerStore>(...)
    └── src/script/hooks/*.ts    declare const __whale_store__: TrainerStore
```

## 8. 빌드 시스템

### src-tauri 숨김

사용자 프로젝트에 Rust 코드 없음. `@whale/cli`가 빌드 시 처리:

```
whale dev:
  1. whale.config.ts 읽기
  2. dist/.tauri/ 에 tauri.conf.json + Cargo.toml 생성
  3. Vite dev server 시작 (UI)
  4. frida-compile --watch 시작 (스크립트)
  5. Tauri dev 시작 (Rust 백엔드 + WebView)

whale build:
  1. frida-compile (스크립트 번들)
  2. Vite build (UI 번들)
  3. whale.config.ts → tauri.conf.json
  4. Tauri build (최종 바이너리: dmg/exe/AppImage)
```

## 9. 에러 처리

```
Rust 에러 → Tauri invoke Result<T, E> → SDK에서 typed Error 변환

Frida 관련:
  DeviceNotFoundError     — 디바이스 미발견
  SpawnFailedError        — 권한 부족, 앱 없음
  ScriptError             — Frida JS 구문 오류
  SessionDetachedError    — 세션 비정상 종료

Input 관련:
  HotkeyConflictError     — 이미 등록된 단축키
  PermissionError         — 접근성 권한 필요 (macOS)

Window 관련:
  WindowNotFoundError     — 존재하지 않는 윈도우 ID
  WindowCreateError       — 윈도우 생성 실패
```

## 10. 사용자 코드 예시 (최종)

### store 정의

```ts
// src/store/trainer.ts
import type { TrainerStore } from '../script/types'
import { createSyncStore } from '@whale/sdk'

export const trainerStore = createSyncStore<TrainerStore>('trainer', {
  godMode: false,
  speedHack: 1.0,
  moneyMultiplier: 1,
  money: 0,
  hp: 0,
})
```

### 메인 윈도우

```tsx
// src/ui/windows/main.tsx
import { useWindow, useDevice, useSession, useHotkey } from '@whale/sdk'
import { Button, Flex, Text, Switch } from '@whale/ui'
import { trainerStore } from '../../store/trainer'

function Main() {
  const overlay = useWindow('overlay')
  const settings = useWindow('settings')
  const device = useDevice({ type: 'usb' })

  useHotkey(['ctrl', 'f1'], () => {
    trainerStore.setGodMode(!trainerStore.godMode)
  })

  useHotkey(['ctrl', 'f2'], overlay.toggle)

  const connect = async () => {
    const session = await device.spawn('com.target.app')
    await useSession(session).loadScriptFile('hooks/main.ts')
  }

  return (
    <Flex direction="column" gap={8} p={16}>
      <Text size="xl" weight="bold">My Trainer</Text>
      <Text color="dim">Device: {device.status()}</Text>
      <Text>HP: {trainerStore.hp} | Money: {trainerStore.money}</Text>

      <Switch
        checked={trainerStore.godMode}
        onChange={trainerStore.setGodMode}
        label="God Mode"
      />

      <Flex gap={4}>
        <Button onClick={connect}>Connect</Button>
        <Button onClick={overlay.toggle} variant="outline">Overlay</Button>
        <Button onClick={settings.show} variant="ghost">Settings</Button>
      </Flex>
    </Flex>
  )
}

export default Main
```

### 오버레이 윈도우

```tsx
// src/ui/windows/overlay.tsx
import { useCurrentWindow } from '@whale/sdk'
import { Text, Flex } from '@whale/ui'
import { trainerStore } from '../../store/trainer'

function Overlay() {
  const self = useCurrentWindow()

  return (
    <Flex direction="column" gap={4} p={8} onClick={self.hide}>
      <Text color="lime" size="sm">HP: {trainerStore.hp}</Text>
      <Text color="gold" size="sm">Money: {trainerStore.money}</Text>
      {trainerStore.godMode && <Text color="red" size="sm">GOD MODE</Text>}
    </Flex>
  )
}

export default Overlay
```

### Frida 스크립트 (TypeScript)

```ts
// src/script/hooks/main.ts
import { TrainerStore } from '../types'

declare const __whale_store__: TrainerStore

Java.perform(() => {
  const Game = Java.use('com.target.app.GameManager')

  Game.getHP.implementation = function () {
    const real = this.getHP()
    __whale_store__.set('hp', real)
    if (__whale_store__.godMode) return this.getMaxHP()
    return real
  }

  Game.getMoney.implementation = function () {
    const real = this.getMoney()
    __whale_store__.set('money', real)
    return real * __whale_store__.moneyMultiplier
  }

  Game.getSpeed.implementation = function () {
    return this.getSpeed() * __whale_store__.speedHack
  }
})
```

### Store 타입

```ts
// src/script/types.ts
export interface TrainerStore {
  godMode: boolean
  speedHack: number
  moneyMultiplier: number
  money: number
  hp: number
  set<K extends keyof TrainerStore>(key: K, value: TrainerStore[K]): void
}
```

## 11. 배포

### 라이브러리 배포 (npm)

- `@whale/sdk` — SolidJS Hook API
- `@whale/ui` — 컴포넌트 라이브러리
- `@whale/cli` — CLI (dev/build/create)
- `@whale/tauri-runtime` — prebuilt Rust 바이너리 (플랫폼별)

### 사용자 앱 배포

`whale build` → Tauri 번들 (dmg/exe/AppImage)
