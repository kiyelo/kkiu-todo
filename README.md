# 끼우 React 1.1.0 — v18.4.8 Full Parity

HTML v18.4.8 완성 목업의 화면 구조와 상태 전이를 실제 React 컴포넌트로 이식한 출시 준비 버전입니다.

- iframe, 원본 HTML 실행, 목업 스크립트 임베드 없음
- React 상태·컴포넌트·훅 기반 구현
- 개인/끼리 할 일, 플로팅 큐, 슬롯 삽입, 완료·복원·삭제, 검색, 선택, 정렬, 담당자, 초대 코드, 관리, 백업·복원 구현
- Supabase Auth, RLS, 개인/끼리 저장소, 초대 코드 참여 RPC, 멤버 순서, 읽음 상태, 완료 이력, 사용자 설정 스키마 포함
- 390×844 기준 핵심 7상태 HTML↔React 이미지 회귀 통과
- 자동 기능 회귀 29개 시나리오 통과

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

`qa/PARITY_REPORT.md`, `qa/flow-results.json`, `qa/pixel-diff.json`에 최종 결과가 있습니다.

## v1.2.0 QA 상태
HTML v18.4.8을 제품 사양으로 삼아 기존 29개 회귀, 20개 심층 상호작용, 7개 인증 플로우를 모두 통과했습니다. 상세 결과는 `qa/PARITY_REPORT.md`를 확인하세요.
