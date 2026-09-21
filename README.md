# Lawai

pnpm + Turborepo 기반 모노레포. 마이크로 프론트엔드(React 19) + Nest TCP 마이크로서비스 백엔드.

## 구조

- apps/web (:5173) — 일반 사용자용 메인
- apps/admin (:5174) — 관리자
- services/api-gateway (:3000) — 유일한 HTTP 진입점
- services/auth-service (TCP :4001) — 인증(argon2, JWT)
- services/user-service (TCP :4002) — 계약·자문·결재·파일·문서 등 업무 도메인 전체와 DB(Prisma) 소유
- services/ai-service (TCP :4003) — AI 모델 호출(무상태). AI 기능을 쓸 때만 필요
- packages/contracts — FE/BE 공유 타입·메시지 패턴
- packages/eslint-config, packages/typescript-config — 공유 설정

## 시작

```bash
pnpm install
docker compose up -d                 # PostgreSQL
cp services/user-service/.env.example services/user-service/.env
cp services/auth-service/.env.example services/auth-service/.env
cp services/api-gateway/.env.example services/api-gateway/.env
cp services/ai-service/.env.example services/ai-service/.env
pnpm --filter @lawai/user-service prisma migrate dev   # 최초 1회 (Postgres 필요, 마이그레이션 적용 + client 생성)
pnpm dev                              # turbo 병렬 기동
```

> 주의(미확인): 서비스 코드에 `.env`를 읽는 코드(dotenv, ConfigModule, `--env-file`)가 없다.
> `nest start --watch`만으로 위 `.env`가 실제 프로세스에 로드되는지는 아직 실행으로 검증하지 않았다.
> 값이 안 읽히면 셸에서 `export` 하거나 `node --env-file` 로 실행한다. 한 명령 실행 정리는 별도 작업으로 진행 중이다.

## 인증 플로우

프론트(web) → POST /auth/signup|login → gateway → (TCP) auth-service → (TCP) user-service.
보호 라우트 GET /users/me 는 JWT 가드가 auth-service VALIDATE로 검증.

## 스크립트

- pnpm dev — 전체 개발 모드
- pnpm build — 전체 빌드
- pnpm test — 전체 테스트
- pnpm lint — 린트

## 파일 업로드 (Cloudflare R2)

P3 부터 코멘트 첨부는 Cloudflare R2 presigned URL 흐름으로 동작한다.

1. Cloudflare 대시보드 → R2 → 버킷 생성(예: `legal`).
2. "Manage R2 API Tokens" → Object Read & Write 토큰 발급.
3. `.env` 에 R2 키 5종(`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`) + `FILE_UPLOAD_SECRET` 채우기.
4. 버킷 CORS 정책: 웹 origin(`http://localhost:5173` 등) PUT/GET 허용, 헤더 `Content-Type` 허용. 예시:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://your-domain"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

키가 비어 있으면 user-service 는 disabled 모드로 동작하며 presign/confirm/download 호출은 503 으로 응답한다(코멘트 본문 흐름은 영향 없음).

## 보안

- 비밀번호 argon2id 해싱, 평문/해시 응답 노출 금지
- gateway: helmet, CORS 화이트리스트, throttler, 글로벌 ValidationPipe(whitelist)
- JWT access/refresh, 시크릿은 .env(커밋 금지). auth-service는 부팅 시 JWT 시크릿 존재를 검증한다.
