# UI 고급화 + Clean Command + rdev Fix 디자인

**Date:** 2026-03-02
**Approach:** CSS Variables + Inline Style (zero-dependency, SolidJS only)

## 1. CLI `clean` Command

### API
```
whale clean        # .whale/ + src-tauri/target/ 정리
whale clean --all  # 위 + node_modules/ 까지 정리
```

### 삭제 대상
- `.whale/` — generated HTML entries, dist, tauri.conf
- `src-tauri/target/` — Rust 빌드 캐시
- `node_modules/` — `--all` 플래그 시

### 구현
- 새 파일: `packages/cli/src/commands/clean.ts`
- 수정: `packages/cli/src/index.ts` — clean command 등록
- Node.js `fs.rm(path, { recursive: true })` 사용
- picocolors로 결과 출력, 삭제 대상 없으면 "Already clean"

## 2. `@whale/ui` 테마 시스템 개선

### CSS 변수 기반 테마
- `theme/tokens.ts` — 하드코딩 값을 `var(--whale-*)` CSS 변수 참조로 전환
- `theme/themes.ts` — 실제 값 정의 (darkTheme, 확장 가능)
- `theme/global-styles.ts` — 글로벌 reset + 기본 스타일

### ThemeProvider 컴포넌트
- CSS 변수를 root div에 주입
- 글로벌 reset 스타일 적용
- 다크/라이트 테마 전환 가능한 구조

### 새 컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| Card | 콘텐츠 그룹핑 (surface 배경 + border + radius) |
| Input | 텍스트 입력 필드 |
| Badge | 상태 표시 라벨 (ON/OFF, Active 등) |
| Separator | 수평/수직 구분선 |
| Tooltip | 호버 시 설명 표시 |
| IconButton | 아이콘 전용 버튼 |

### 기존 컴포넌트 개선
- **Button**: hover/active 상태, disabled 스타일, loading 상태
- **Switch**: 부드러운 애니메이션, 라벨 통합
- **Slider**: 커스텀 thumb/track 스타일링
- **Text**: `xs`, `xl`, `2xl` 사이즈 추가

## 3. Example App 리뉴얼

### main.tsx
- Card로 섹션 래핑
- Badge로 상태 표시 (ON/OFF)
- Separator로 구분
- ThemeProvider 적용

### overlay.tsx
- Card + Badge 활용, 세련된 HUD 스타일

### settings.tsx
- Card 섹션 분리, Input 활용 가능 구조

## 4. rdev Fork 교체

### 문제
`rdev = "0.5"` (crates.io)는 macOS에서 Tauri와 함께 사용 시 키보드 이벤트에서 크래시.

### 해결
```toml
# before
rdev = "0.5"

# after
rdev = { git = "https://github.com/fufesou/rdev" }
```

API 호환 — `input_state.rs`, `input_cmd.rs` 코드 변경 없음.

### 참고
- https://github.com/tauri-apps/tauri/discussions/7839
- https://github.com/tauri-apps/tauri/issues/14770
