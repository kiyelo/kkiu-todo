# Exact Parity 0.8.0 적용

1. 이 ZIP 안 `kkiu-todo-main`의 파일을 로컬 저장소 폴더에 복사해 기존 파일을 바꿉니다.
2. 저장소 폴더에서 명령 프롬프트를 열고 실행합니다.

```bash
git add -A
git commit -m "fix: ship exact v18.4.8 parity host"
git fetch origin
git push --force-with-lease origin main
```

3. GitHub Actions의 Pages 배포가 초록색인지 확인합니다.
