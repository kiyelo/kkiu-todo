# 끼우

할 일을 원하는 순서에 끼워 넣는 모바일 우선 React 투두 앱입니다.

- `app/`: React + Supabase 앱 소스
- `kkiu4-v18-ux-fixes.html`: v18.4.8 UX 기준 목업
- `.github/workflows/deploy.yml`: GitHub Pages 자동 배포

## React 0.7.0

v18.4.8 목업을 기준으로 플로팅 큐의 위치 계산, 끼우·끼리·더보기 화면, 담당자 데이터, 검색·완료·선택·수정·정렬, 더보기 플로팅 메뉴, 데이터 백업·복원과 이동형 하단 내비게이션을 통합했습니다. Supabase 환경 변수가 없으면 로컬 저장 모드로 실행됩니다.

`main`에 반영하면 GitHub Actions가 자동 빌드·배포합니다.
