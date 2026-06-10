# Lawai 모노레포 초기화: 마이크로 프론트엔드 + Nest 마이크로서비스 백엔드

- 날짜: 2026-06-10
- 상태: 승인됨 (구현 계획 대기)
- 범위: 스켈레톤 + 샘플 인증 플로우 (E2E 동작)

## 1. 목표

기존 Turborepo + pnpm 워크스페이스 위에 빌드타임 모노레포 방식의 마이크로 프론트엔드(독립 앱 + 공유 패키지)와 Nest.js TCP 마이크로서비스 백엔드를 구성한다. React 19 기준으로 정렬하고, 회원가입/로그인/JWT 인증이 프론트→gateway→service까지 한 줄로 동작하는 스켈레톤을 완성한다. `Law.ai Reboot/` 폴더는 작업 대상에서 제외한다.

## 2. 핵심 결정 사항

| 항목 | 결정 |
|---|---|
| MFE 방식 | 독립 앱 + 공유 패키지 (빌드타임 모노레포) |
| 프론트 앱 | `shell`, `web`, `admin`(기존) |
| 백엔드 | 마이크로서비스 (여러 Nest 앱) |
| 통신 | TCP (Nest 기본 `@nestjs/microservices`) |
| 초기 서비스 | `api-gateway`(HTTP), `auth-service`, `user-service` |
| DB / ORM | PostgreSQL + Prisma (서비스별 독립 스키마) |
| 디자인 시스템 | 로컬 `packages/design-system` 제거, `@lawkit/ui`(npm) 각 앱에서 직접 사용 |
| React | 19 (admin의 18.2 deps 포함 전부 정렬) |
| 완료 기준 | 스켈레톤 + 샘플 인증 플로우 |

## 3. 디렉토리 구조

```
Lawai/
├── apps/
│   ├── shell/            # 호스트 컨테이너 (레이아웃/인증 셸/네비게이션)
│   ├── web/              # 일반 사용자용 메인 (React 19 + Vite)
│   └── admin/            # 관리자 (기존 → React 19 정렬)
├── services/             # 신규: 백엔드
│   ├── api-gateway/      # 유일한 HTTP 진입점 (Nest)
│   ├── auth-service/     # TCP 마이크로서비스 (Nest) + Prisma
│   └── user-service/     # TCP 마이크로서비스 (Nest) + Prisma
├── packages/
│   ├── eslint-config/    # 기존
│   ├── typescript-config/# 기존
│   └── contracts/        # 신규: FE/BE 공유 타입 + TCP 메시지 패턴 + DTO
├── docker-compose.yml    # 신규: PostgreSQL (로컬 dev)
├── pnpm-workspace.yaml   # apps/* services/* packages/* 로 확장
└── turbo.json
```

`packages/design-system`은 제거한다 (`@lawkit/ui`가 React 19 호환 + 디자인 토큰 포함이라 중복).

## 4. 프론트엔드 스택 (3개 앱 공통)

- React **19** + Vite 5
- 라우팅: React Router v7
- 데이터 패칭: TanStack Query + 얇은 fetch 래퍼 (gateway 호출)
- 스타일: `@lawkit/ui` 직접 의존 + `@lawkit/ui/style.css` import
- 상태관리: 없음 (필요 시 zustand 추가, YAGNI)
- 포트: web `:5173`, admin `:5174`, shell `:5175`

`shell`은 공통 레이아웃/네비게이션/인증 셸을 담당하는 호스트 앱. 빌드타임 모노레포이므로 런타임 연합(Module Federation)은 사용하지 않는다.

## 5. 백엔드 토폴로지

```
[web/admin/shell]  ──HTTP──▶  [api-gateway :3000]  ──TCP──▶  [auth-service :4001]
                                     │              ──TCP──▶  [user-service :4002]
                                     └ 유일한 공개 진입점              │
                                                          각자 Prisma ▶ PostgreSQL
```

- **api-gateway**: 유일한 HTTP 서버. REST 컨트롤러가 들어온 요청을 `ClientProxy`(TCP)로 해당 서비스에 위임. JWT 검증 가드, 글로벌 `ValidationPipe`, CORS, helmet, rate-limit(throttler).
- **auth-service / user-service**: `@MessagePattern`으로 TCP 요청만 수신 (외부 HTTP 노출 없음). 각자 독립 Prisma 스키마.

### Prisma 구성

- 서비스별 독립 스키마: `services/auth-service/prisma/`, `services/user-service/prisma/`
- 같은 Postgres 인스턴스, 스키마 분리 (필요 시 DB 분리로 확장)
- 로컬은 docker-compose Postgres

## 6. 보안 기본기

- 비밀번호: **argon2** 해싱. 평문 저장/로깅 절대 금지.
- JWT: 짧은 수명 access 토큰 + refresh 토큰. 시크릿은 `.env`(커밋 금지), `.env.example` 제공.
- 입력 검증: `class-validator` DTO + 글로벌 `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`).
- 응답 직렬화 시 password/hash 필드 제외.
- gateway에 helmet + throttler(brute-force 방어), 서비스 내부 에러 메시지 누수 방지.

## 7. 공유 계약 `@lawai/contracts`

- TCP 메시지 패턴 상수: 예) `AUTH_PATTERNS.LOGIN = 'auth.login'`, `USER_PATTERNS.GET_ME = 'user.getMe'`
- 공유 DTO/타입: `LoginDto`, `SignupDto`, `UserDto`, `AuthTokens`
- gateway·service·프론트가 동일 타입 import → 계약 불일치 방지

## 8. 로컬 개발 / 오케스트레이션

- `docker-compose.yml`: PostgreSQL (services 컨테이너화는 추후)
- `turbo.json`의 `dev` 태스크 확장 → `pnpm dev`로 gateway/services/FE 동시 실행
- 포트 규칙: gateway `:3000`, auth TCP `:4001`, user TCP `:4002`, web `:5173`, admin `:5174`, shell `:5175`
- 각 서비스 `.env.example` 제공, 루트 README에 부팅 순서 문서화

## 9. 샘플 인증 플로우 (E2E 동작 목표 = 완료 기준)

1. shell 또는 web의 로그인 화면에서 `POST /auth/signup`, `POST /auth/login` → gateway
2. gateway → auth-service(TCP): argon2 해싱, user-service에 사용자 생성/조회 위임, JWT 발급
3. gateway → 프론트로 토큰 반환, 프론트는 TanStack Query로 `GET /users/me` (JWT 가드 통과 확인)
4. 이 한 줄 플로우가 끝까지 동작하면 스켈레톤 완료

## 10. 테스트

- 백엔드: 각 서비스 핵심 유닛 테스트(해싱·검증·토큰), gateway↔auth e2e 1개
- 프론트: 스모크 테스트(앱 렌더 + 로그인 폼)
- TDD로 진행, 전부 `turbo run test`로 묶음

## 11. 범위 밖 (YAGNI)

- Module Federation 런타임 연합
- 사용자 CRUD 전체, 권한(RBAC) 시스템
- 메시지 브로커(Redis/Kafka), gRPC
- 서비스 컨테이너화/배포 파이프라인
- zustand 등 클라이언트 상태관리 라이브러리
