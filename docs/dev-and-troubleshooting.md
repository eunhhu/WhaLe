# 개발/디버깅 가이드

## 1) 개발 명령 흐름

`whale dev`는 내부적으로 아래 순서로 실행됩니다.

1. `whale.config.ts` 로드
2. `.whale`에 HTML/bootstrap 엔트리 생성
3. `.whale/tauri.conf.json` 생성
4. Vite dev server 시작(HMR 포함)
5. Rust 툴체인 확인
6. 가능하면 Tauri dev 실행, 아니면 frontend-only 모드로 유지

## 2) 자주 쓰는 실행 명령

루트 기준:

```bash
bun install
bun --filter whale-example-trainer dev
bun --filter whale-example-trainer build
bun test
```

frontend-only 모드:

```bash
WHALE_SKIP_TAURI=1 bun --filter whale-example-trainer dev
```

## 3) HMR이 안 보일 때

체크 순서:

1. `whale dev` 로그에서 Vite 주소가 출력되는지 확인
2. `.whale/__whale_entry_*.ts`가 생성되었는지 확인
3. 브라우저 콘솔에서 엔트리 모듈 로드 에러 확인
4. `build.devHost/devPort`와 방화벽/포트 충돌 확인

참고:

- bootstrap 코드에 `import.meta.hot.accept(...)`가 자동 생성됩니다.

## 4) DevTools 실시간 반영이 느리거나 안 될 때

체크 항목:

1. debug 빌드인지 확인 (`cfg!(debug_assertions)` 경로)
2. `__devtools__` window가 capability windows에 포함되는지 확인
3. F12 토글 핫키가 등록됐는지 확인
4. 이벤트 스트림 환경 변수 확인
   - `WHALE_DEVTOOLS_INPUT_STREAM`
   - `WHALE_DEVTOOLS_FRIDA_LOG`

설명:

- 위 env 값이 `0/false/no/off`가 아니면 기본적으로 스트림 emit가 켜집니다.

## 5) 창이 닫혀서 다시 안 열릴 때

현재 runtime 동작:

- `window_show`, `window_toggle`는 창이 없으면 config 기반으로 재생성 후 표시
- `window_hide`, `window_close`는 기존 창이 있어야 동작

따라서 앱에서 "복구 열기"는 `show/toggle`를 사용하세요.

## 6) 핫키 이벤트가 이상할 때

현재 구현은 다음을 보장합니다.

- 중복 key press 이벤트는 무시
- 조합키는 `active_hotkeys` 기반으로 press/release 전이 계산
- SDK `useHotkey`는 `phase` 기반 콜백 분기 지원

디버깅 팁:

1. DevTools Input 탭에서 `input:key-event`/`input:hotkey-triggered` 흐름 확인
2. 조합키 문자열을 정규화 규칙에 맞춰 사용 (`ctrl`, `shift`, `alt`, `meta`)
3. 동일 hotkey를 중복 등록했는지 확인

## 7) Persist 값이 재시작 후 UI에 반영되지 않을 때

정상 경로는 아래와 같습니다.

1. `createSyncStore` 생성
2. `store_get_all` 호출로 snapshot hydrate
3. patch 적용 후 reactive UI 갱신

점검 항목:

1. store 이름이 UI/Frida/설정에서 동일한지
2. `defaults` 키와 snapshot 키가 동일한지
3. 컴포넌트 마운트 시점에 store가 생성되는지
4. runtime persist toggle이 꺼져 있지 않은지

## 8) 아이콘이 기본 Tauri 아이콘으로 나올 때

체크 순서:

1. `whale.config.ts`의 `app.icon` 경로가 존재하는지
2. 없으면 `assets/icon.png`가 프로젝트/상위 워크스페이스에 존재하는지
3. `whale dev/build` 실행 시 `tauri icon` 로그가 나오는지
4. `src-tauri/icons/*` 생성 결과가 갱신됐는지

## 9) Rust 없는 개발자를 위한 안전 운영

권장 방식:

1. UI 개발은 `WHALE_SKIP_TAURI=1`으로 진행
2. 네이티브 기능 의존 코드는 `isTauriRuntime()`으로 가드
3. `safeInvoke`/`safeListen`을 사용해 런타임 부재 시 앱이 죽지 않게 유지

예시:

```ts
if (isTauriRuntime()) {
  await safeInvoke('store_set_persist_enabled', { enabled: true })
}
```
