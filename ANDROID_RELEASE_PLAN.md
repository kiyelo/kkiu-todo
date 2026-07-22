# 끼우 Android 출시 계획

기준일: 2026-07-22
현재 기준: React 1.4.0, Vite, Supabase, PWA, Capacitor 설정 파일만 존재

## 방향

웹과 Android를 같은 React 코드로 유지하는 Capacitor 8 경로를 사용합니다. 첫 출시 목표는 “웹 기능을 그대로 감싼 앱”이 아니라 로그인·초대·뒤로가기·키보드·오프라인 오류까지 Android에서 자연스럽게 동작하는 안정판입니다.

2026년 8월 31일부터 Google Play에 제출하는 신규 앱과 업데이트는 Android 16(API 36) 이상을 대상으로 해야 하므로 처음부터 API 36을 출시 기준으로 잡습니다. Capacitor 8의 Android 지원 하한은 API 24입니다.

## 0단계 — 웹 안정화와 데이터 정합성

완료 조건:

- `TESTING.md`의 웹 통합 테스트를 통과
- 담당자별로 복제되는 단일 `assignee_id` 할 일을 Supabase에 영구 저장하고 RLS·순서·알림 정합성까지 검증
- 로그인·초대·완료·백업의 치명적 데이터 손실 문제 0건
- 약관·개인정보 문구를 실제 수집 데이터와 일치시킴
- 인앱 계정 삭제와 외부 계정 삭제 요청 페이지 설계 완료

이 단계가 끝나기 전에는 Play Console 비공개 테스트 빌드를 배포하지 않습니다.

## 1단계 — 네이티브 프로젝트 기반

- Capacitor 패키지를 정확한 버전으로 고정하고 lockfile 유지
- Windows에서도 동작하는 Android 빌드 명령 사용
- `android/` 프로젝트 생성 후 `compileSdk`·`targetSdk`를 API 36 기준으로 확인
- 패키지 ID `app.kkiu.todo`를 Play Console 생성 전에 최종 확정
- 앱 이름, 버전 코드, 아이콘, 적응형 아이콘, 스플래시, 테마 색상 적용
- 디버그 APK를 에뮬레이터와 실제 기기에서 실행

출시 게이트: 깨끗한 체크아웃에서 웹 빌드 → Capacitor sync → Android debug build가 한 번에 성공해야 합니다.

## 2단계 — Android 동작 완성

- 시스템 뒤로가기: 모달 닫기 → 앱 내부 이동 → 종료 확인
- 키보드와 safe area: 작은 화면·큰 글자·가로 모드 점검
- 앱 생명주기: 백그라운드 복귀, 세션 만료, 네트워크 재연결
- 공유 기능: 초대 코드와 링크를 Android 공유 시트로 전달
- App Links: HTTPS 도메인, `assetlinks.json`, 인증서 SHA-256, intent filter 구성
- Capacitor App API로 이메일 인증·비밀번호 재설정·초대 링크 수신
- Supabase Redirect URL과 Android 링크 경로를 일치시킴

GitHub Pages 하위 경로만으로 App Links를 운영할 수 있는지 먼저 검증하고, 불안정하면 `kkiu.app` 같은 소유 도메인을 출시 도메인으로 사용합니다.

## 3단계 — 반복 가능한 QA

- 핵심 데이터 로직 단위 테스트
- Playwright 웹 회귀 테스트: 로그인 전 로컬 모드, 개인 할 일, 검색, 완료, 백업
- Supabase 테스트 프로젝트 통합 테스트: 두 계정 초대·RLS·동시 수정·다중 담당자
- Android 기기 테스트: API 24, 30, 34, 36과 삼성 실기기 최소 1대
- 접근성: TalkBack, 글자 확대, 대비, 48dp 터치 영역
- 크래시·ANR 수집 도구는 개인정보 고지와 Data safety 항목을 검토한 뒤 결정

출시 게이트: P0/P1 결함 0건, 자동 검증 통과, 주요 수동 시나리오 통과.

## 4단계 — Play Console 준비

- Google Play 개발자 계정 및 신원 인증
- Play App Signing 사용, 업로드 키를 저장소 밖에서 안전하게 보관
- AAB 생성, 내부 테스트 트랙 업로드
- 앱 이름·짧은 설명·상세 설명·아이콘·스크린샷·기능 그래픽 준비
- 개인정보처리방침 공개 URL, 계정 삭제 요청 공개 URL 준비
- Data safety, 콘텐츠 등급, 광고 포함 여부, 대상 연령, 앱 접근 권한 작성
- 이메일·할 일·그룹 데이터와 Supabase SDK의 전송/보관 내용을 실제 동작에 맞춰 신고

계정을 앱에서 만들 수 있으므로 계정 삭제는 앱 내부 경로와 외부 웹 경로가 모두 필요합니다. 단순 로그아웃이나 계정 비활성화만으로는 출시 요건을 충족하지 않습니다.

## 5단계 — 테스트 트랙과 출시

1. 내부 테스트: 개발자와 가까운 테스터로 설치·업데이트·로그인 확인
2. 비공개 테스트: 실제 사용 흐름과 기기 다양성 검증
3. 신규 개인 개발자 계정에 해당하면 최소 12명이 14일 연속 opt-in 상태를 유지
4. 테스트 피드백과 수정 내역을 기록한 뒤 프로덕션 액세스 신청
5. 첫 프로덕션은 단계적 출시로 시작하고 크래시·ANR·로그인 실패를 관찰

## 추천 순서

당장 진행할 일은 다음 세 가지입니다.

1. 사용자가 웹 `v1.4.0`을 직접 테스트하며 UX·기능 결함을 지시
2. Codex가 다중 담당자 저장 모델과 계정 삭제 요건을 먼저 해결
3. 앱 ID와 출시 도메인을 확정한 뒤 `android/` 프로젝트를 생성

## 공식 기준

- Capacitor Android: https://capacitorjs.com/docs/android
- Capacitor App Links: https://capacitorjs.com/docs/guides/deep-links
- Google Play API 36 요구사항: https://developer.android.com/google/play/requirements/target-sdk
- 신규 개인 계정 테스트 요건: https://support.google.com/googleplay/android-developer/answer/14151465
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- 계정 삭제 요건: https://support.google.com/googleplay/android-developer/answer/13327111
