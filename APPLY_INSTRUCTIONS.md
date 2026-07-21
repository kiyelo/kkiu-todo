# React v1.2.0 적용

```bash
unzip -o kkiu-react-1.2.0-v18.4.8-deep-qa.zip
cd kkiu-react-1.2.0-v18.4.8-deep-qa
pnpm install --frozen-lockfile
pnpm --dir app build
```

Supabase를 새로 적용할 경우 `supabase/schema.sql` 실행 후 `supabase/migrations/20260721_full_parity.sql`을 적용하세요. 기존 환경에는 migration만 적용합니다.
