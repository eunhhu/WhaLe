# Example App Full Rework Design

**Date**: 2026-03-04
**Scope**: `apps/example/` full rework + `packages/cli/templates/app/` minimal starter

## Problem

현재 example 앱은 quick start 템플릿과 동일한 코드이며, Frida 연결 흐름이 끊겨있다.

- `setupTrainerSession()`이 디바이스 연결만 하고 프로세스 선택 → attach → 스크립트 로드 흐름이 없음
- 하드코딩된 값: `device.spawn('com.tencent.xin')`, `device.attach(12345)`
- 프로세스 선택 UI 없음 (콘솔 출력만)
- 세션 상태를 사용자가 알 수 없음
- 치트 컨트롤이 연결 여부와 무관하게 항상 활성화

## Design

### 연결 상태 머신

```
idle → searching → connected → attached → scripted
                      ↓            ↓          ↓
                  (error) ←── (error) ←── (error)
```

| Phase | 의미 | UI |
|-------|------|----|
| `idle` | 초기 상태 | 아무것도 안 함 |
| `searching` | 디바이스 탐색 중 | 스피너 |
| `connected` | USB 디바이스 연결됨 | 프로세스 목록 표시 |
| `attached` | 프로세스에 attach 완료 | PID 표시, 스크립트 로드 대기 |
| `scripted` | 스크립트 로드 완료 | 치트 패널 활성화 |

에러 발생 시 현재 phase 유지 + error 시그널에 메시지.
Detach 시 `idle`로 복귀.

### 파일 구조

```
apps/example/src/
├── frida/
│   └── session.ts              # 상태 머신 + 전체 연결 로직
├── store/
│   └── trainer.ts              # 유지 (변경 없음)
├── script/
│   ├── main.ts                 # 보강: 구체적 예시 + send() 로깅
│   ├── whale-store.d.ts        # 유지
│   └── tsconfig.json           # 유지
├── ui/
│   ├── windows/
│   │   ├── main.tsx            # 재작성: step-by-step + 치트 패널
│   │   ├── overlay.tsx         # 개선: 연결 상태 반영
│   │   └── settings.tsx        # 개선: 디바이스 타입 설정
│   └── components/
│       ├── ConnectionStatus.tsx # 신규: 4단계 스텝 표시
│       └── ProcessList.tsx      # 신규: 프로세스 검색/선택
└── whale.config.ts              # 유지
```

### TrainerSession 인터페이스

```typescript
interface TrainerSession {
  phase: Accessor<Phase>
  device: Accessor<Device | null>
  processes: Accessor<Process[]>
  session: Accessor<Session | null>
  error: Accessor<string | null>

  refresh(): Promise<void>
  searchProcesses(query: string): Process[]
  spawnAndAttach(bundleId: string): Promise<void>
  attachToProcess(pid: number): Promise<void>
  loadScripts(): Promise<void>
  detach(): void
}
```

### Main 윈도우 레이아웃

```
┌─────────────────────────────────────┐
│  Example Trainer     [Settings][F3] │
├─────────────────────────────────────┤
│  CONNECTION                         │
│  ● Device   iPhone 14 Pro       ✔  │
│  ● Process  com.game.app        ✔  │
│  ● Session  PID 1234            ✔  │
│  ● Script   trainer.ts          ✔  │
├─────────────────────────────────────┤
│  CHEATS                             │
│  God Mode        [ON]       [===]  │
│  Infinite Ammo   [OFF]      [===]  │
│  No Recoil       [OFF]      [===]  │
├─────────────────────────────────────┤
│  ADJUSTMENTS                        │
│  Speed  1.0x  ──────●──────        │
│  FOV    90    ──────●──────        │
├─────────────────────────────────────┤
│  [Toggle Overlay F3]  [Detach]     │
└─────────────────────────────────────┘
```

연결 섹션: 현재 phase의 스텝만 인터랙티브.
- `searching`: 스피너 + "Searching for USB device..."
- `connected`: 프로세스 검색 Input + 스크롤 가능한 리스트 + Attach/Spawn 버튼
- `attached`: "Load Scripts" 버튼
- `scripted`: 체크 표시, 치트 패널 활성화

치트/슬라이더: `scripted` 아닌 상태에서는 disabled + 투명도 0.5.

### Safe Handling

**Tauri 없을 때 (WHALE_SKIP_TAURI=1)**:
- 연결 섹션: "Tauri runtime required for Frida" 메시지 표시
- 치트 패널: 스토어 동기화는 로컬에서 동작 (멀티윈도우 간 동기화는 안 되지만 단일 윈도우 내에서 반응)
- 핫키: 비활성 안내
- 오버레이/세팅: 윈도우 API 불가 안내

**Frida 연결 실패 시**:
- phase 유지 + error 시그널에 구체적 메시지 (e.g., "USB device not found. Connect device and tap Refresh")
- 재시도 가능 (Refresh 버튼)
- UI 크래시 없음

**세션 중 detach 발생 시**:
- `frida:session-detached` 이벤트 감지
- phase를 `connected`로 복귀
- 치트 패널 자동 비활성화
- "Session detached" 에러 메시지

### Overlay 개선

- 연결 상태 배지: `scripted`=ACTIVE(green), `attached`=LOADING, 나머지=DISCONNECTED(dim)
- 디바이스명 표시
- 미연결 시 "Connect in main window" 안내

### Settings 개선

- 디바이스 타입 선택 (USB/Local/Remote) — 추후 session.ts에서 읽어서 필터 변경
- 영속성 토글 유지
- 리셋 유지
- About 섹션 (버전 정보)

### Frida 스크립트 보강

```typescript
// send()로 UI에 로그 전송하는 패턴
// __whale_store__ 읽기/쓰기 패턴
// Module.findExportByName 안전 처리
// Interceptor 패턴 예시 (null guard 포함)
```

### 템플릿 (Minimal Starter)

example과 완전 분리. 단일 윈도우 + 카운터 예제:

```
src/
├── store/app.ts            # { count: 0 }
├── script/main.ts          # 빈 스크립트 + 가이드 주석
├── ui/windows/main.tsx     # 카운터 + 연결 버튼 (간단)
└── frida/session.ts        # 최소 디바이스 연결
```

## Scope 외

- `packages/sdk/` — 변경 없음
- `packages/ui/` — 변경 없음
- `packages/cli/src/` — 변경 없음 (create.ts 로직 유지, 템플릿 내용만 교체)
- `packages/tauri-runtime/` — 변경 없음
