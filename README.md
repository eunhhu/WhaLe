# WhaLe

WhaLe는 **Tauri + SolidJS + Frida** 기반 트레이너 앱 프레임워크입니다.

핵심은 다음 3가지를 쉽게 만드는 것입니다.
- 멀티 윈도우 앱(main/overlay/settings)
- UI ↔ Rust ↔ Frida 스토어 동기화
- dev/build/create 자동화 CLI

---

## 1분 시작 (신규 프로젝트)

### 요구 사항
- `Node.js 20+`
- `npm` (또는 `bun`)
- Rust는 선택 사항 (없어도 frontend-only 개발 가능)

### 생성
```bash
npx @whale1/cli create my-whale-app
cd my-whale-app
npm install
```

### 개발 실행
```bash
npm run dev
```

### Rust 없이 UI만 개발
```bash
WHALE_SKIP_TAURI=1 npm run dev
```

이 모드에서는 HMR/UI 개발은 가능하고, Tauri 네이티브 기능(윈도우 제어/글로벌 입력/Frida IPC)은 비활성입니다.

### 빌드
```bash
# frontend + tauri bundle
npm run build

# frontend only
WHALE_SKIP_TAURI=1 npm run build
```

---

## 생성되는 starter 구성

```txt
my-whale-app/
  assets/icon.png
  whale.config.ts
  src/
    ui/windows/main.tsx
    store/app.ts
    script/main.ts
```

- 기본 앱 아이콘은 `assets/icon.png`
- 앱명/윈도우 타이틀/식별자는 `whale.config.ts`에서 설정
- `frida.scripts`에 등록한 스크립트는 attach 시 자동 로드됨 (별도 `session.ts` 불필요)

---

## CLI 명령

- `whale create <name>`: 새 프로젝트 생성
- `whale dev`: 개발 서버 + Tauri dev
- `whale build`: 프로덕션 빌드
- `whale config:generate [out]`: tauri config 생성
- `whale clean [--all]`: `.whale`, `src-tauri/target` 정리 (`--all`은 `node_modules` 포함)

---

## 런타임 안전 처리 (권장)

Rust/Tauri가 없는 환경도 고려해서 네이티브 호출은 가드하세요.

```ts
import { isTauriRuntime, safeInvoke } from '@whale1/sdk'

if (isTauriRuntime()) {
  await safeInvoke('store_set_persist_enabled', { enabled: true })
}
```

---

## 이 저장소에서 개발하기 (프레임워크 기여)

### 설치
```bash
bun install
```

### example 앱 실행
```bash
bun --filter whale-example-trainer dev
```

### example 앱을 frontend-only로 실행
```bash
WHALE_SKIP_TAURI=1 bun --filter whale-example-trainer dev
```

### 테스트/빌드
```bash
bun test
bun run build
```

---

## 문서

- [문서 인덱스](./docs/README.md)
- [아키텍처](./docs/architecture.md)
- [SDK API](./docs/api/sdk.md)
- [설정 가이드](./docs/config.md)
- [개발/디버깅 가이드](./docs/dev-and-troubleshooting.md)

## 라이선스

MIT
