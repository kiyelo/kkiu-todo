# 끼우 안드로이드 앱 빌드 가이드 (Capacitor)

이 저장소는 Capacitor로 안드로이드 앱을 만들 준비가 되어 있습니다.

- `capacitor.config.json` — 앱 ID(`app.kkiu.todo`)·앱 이름(끼우)·webDir(`dist`) 설정 완료
- `vite.config.js` — `CAPACITOR_BUILD=1`이면 상대 경로(`./`)로 빌드 (GitHub Pages용 `/kkiu-todo/` 베이스와 분리)
- `package.json` — `build:android`, `android:add`, `android:open` 스크립트 추가

> Capacitor 패키지는 재현 가능한 빌드를 위해 `package.json`과 `pnpm-lock.yaml`에 정확한 버전으로 고정합니다.

## 사전 준비물

- Node.js 22+, pnpm 10+
- Android Studio (최신 안정버전) + Android SDK 36+
- JDK 17

## 1) 의존성 설치

```bash
pnpm install --frozen-lockfile
```

## 2) 앱용 웹 빌드 (상대 경로 베이스)

```bash
pnpm build:android:web
```

결과물은 `dist/`에 생성되며 `capacitor.config.json`의 `webDir`가 이미 `dist`를 가리킵니다.

## 3) 안드로이드 프로젝트 생성 (최초 1회)

```bash
npx cap add android
```

## 4) 동기화·실행

```bash
npx cap sync android   # 웹 빌드 변경 때마다
npx cap open android   # Android Studio에서 열기 → Run 또는 Build > Generate Signed App Bundle/APK
```

Android 프로젝트를 추가한 이후에는 `pnpm build:android` 한 번으로 웹 빌드와 Android 동기화를 수행합니다.

전체 출시 단계와 정책 체크리스트는 [ANDROID_RELEASE_PLAN.md](./ANDROID_RELEASE_PLAN.md)를 참고하세요.

## Supabase 로그인 관련 메모

- `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 넣고 빌드해야 앱에서도 로그인이 동작합니다 (`envDir: '..'`).
- 이메일 매직링크/OAuth를 앱에서 쓰려면 Supabase Auth의 Redirect URLs에 앱 딜링크(예: `https://kiyelo.github.io/kkiu-todo/` 또는 커스텀 스킴)를 등록하세요.
- 초대 딜링크(`?join=CODE`)는 앱 내 WebView에서도 동일하게 동작하며, 외부 링크를 앱으로 연결하려면 Android App Links 설정이 추가로 필요합니다.

## 대안: TWA (Trusted Web Activity)

이미 GitHub Pages에 PWA(`manifest.webmanifest`)가 배포되어 있으므로, 네이티브 기능이 필요 없다면
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)으로 TWA 패키징도 가능합니다:

```bash
npx @bubblewrap/cli init --manifest https://kiyelo.github.io/kkiu-todo/manifest.webmanifest
npx @bubblewrap/cli build
```

TWA는 오프라인 지원·스토어 심사 측면에서 Capacitor보다 제약이 있으니, 기본 경로는 Capacitor를 권장합니다.
