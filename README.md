# 끼우 React 1.3.8 — v18.4.8 Full Parity

HTML v18.4.8 완성 목업의 화면 구조와 상태 전이를 실제 React 컴포넌트로 이식한 출시 준비 버전입니다.

- iframe, 원본 HTML 실행, 목업 스크립트 임베드 없음
- React 상태·컴포넌트·훅 기반 구현
- 개인/끼리 할 일, 플로팅 큐, 슬롯 삽입, 완료·복원·삭제, 검색, 선택, 정렬, 담당자, 초대 코드, 관리, 백업·복원 구현
- Supabase Auth, RLS, 개인/끼리 저장소, 초대 코드 참여 RPC, 멤버 순서, 읽음 상태, 완료 이력, 사용자 설정 스키마 포함
- 390×844 기준 핵심 7상태 HTML↔React 이미지 회귀 통과
- HTML 의도 기반 핵심 통합 회귀 통과

## 로컬 실행

```bash
pnpm install --frozen-lockfile
pnpm dev
```

## 빌드

```bash
pnpm build
```

GitHub Pages 배포 경로는 `vite.config.js`의 `/kkiu-todo/`로 설정되어 있습니다. `main` 브랜치에 push하면 GitHub Actions가 `dist`를 배포합니다.

## Supabase

1. 새 프로젝트는 `supabase/schema.sql` 실행
2. 이어서 `supabase/migrations/20260721_full_parity.sql` 실행
3. GitHub 저장소 Secrets에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 등록

자세한 순서는 `supabase/README.md`를 따르세요. 브라우저에는 Publishable Key만 사용합니다.

## 검수 결과

`qa/PARITY_REPORT.md`, `qa/intent-parity-results.json`, `qa/flow-results.json`, `qa/pixel-diff.json`에 최종 결과가 있습니다.

## 안드로이드 앱

Capacitor 기반 안드로이드 빌드 방법은 [ANDROID.md](./ANDROID.md)를 참고하세요.

## 단일 소스 Android 빌드

웹과 Android는 `app/`의 동일한 React 소스를 사용합니다. Android UI를 별도로 복사하거나 수정하지 않습니다.

```bash
pnpm run build:apk
```

이 명령은 릴리스 검사, Capacitor용 웹 빌드, Android 동기화, 웹·APK 자산 해시 비교, 디버그 APK 컴파일을 순서대로 실행합니다. APK, `dist/`, Gradle 캐시는 Git에 커밋하지 않습니다.

`main` 푸시와 모든 PR에서는 `.github/workflows/android.yml`이 같은 명령을 실행하고 APK를 GitHub Actions 아티팩트로 보관합니다. 따라서 배포 가능한 작업물은 로컬 파일 대신 해당 커밋과 연결된 GitHub 아티팩트를 기준으로 관리합니다.
