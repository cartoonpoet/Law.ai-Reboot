# 백엔드 서비스

기동 순서: Postgres → user-service → auth-service → api-gateway

```bash
docker compose up -d              # postgres
pnpm --filter @lawai/user-service dev
pnpm --filter @lawai/auth-service dev
pnpm --filter @lawai/api-gateway dev
```

또는 루트에서 `pnpm dev` (turbo가 전부 병렬 기동).

## 엔드포인트

- POST /auth/signup  { email, name, password }
- POST /auth/login   { email, password }
- GET  /users/me     (Authorization: Bearer <accessToken>)
