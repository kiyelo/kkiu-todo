# Supabase 연결 준비

현재 React 0.4.0은 `localRepository`를 사용해 기기 안에 저장합니다. Supabase 프로젝트를 만든 뒤 다음 단계에서 동일한 인터페이스를 `supabaseRepository`로 교체합니다.

## 적용 순서

1. 새 Supabase 프로젝트 생성
2. SQL Editor에서 `schema.sql` 검토 후 실행
3. 프로젝트 URL과 Publishable Key를 `.env.local`에 입력
4. 이메일 또는 소셜 로그인 방식 확정
5. 기존 로컬 데이터를 로그인 계정으로 한 번만 가져오는 마이그레이션 실행

브라우저 앱에는 Publishable Key만 사용합니다. Secret Key와 데이터베이스 비밀번호는 앱 코드, GitHub 또는 `.env` 파일에 넣지 않습니다.

모든 공개 테이블은 RLS가 활성화되어 있으며 다음 범위로 분리됩니다.

- 개인 할 일: 작성한 사용자만 접근
- 끼리 할 일: 해당 끼리 구성원만 접근
- 끼리 설정: 소유자만 변경
- 프로필: 본인과 같은 끼리 구성원만 조회
