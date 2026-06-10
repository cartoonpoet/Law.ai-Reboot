# Lawai 모노레포 초기화 (MFE + Nest 마이크로서비스) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Turborepo+pnpm 모노레포를 확장해 React 19 마이크로 프론트엔드(shell/web/admin)와 Nest TCP 마이크로서비스 백엔드(api-gateway/auth-service/user-service)를 구성하고, 회원가입→로그인→JWT 보호 라우트가 E2E로 동작하는 스켈레톤을 완성한다.

**Architecture:** 빌드타임 모노레포. 프론트는 독립 Vite 앱 + 공유 패키지(`@lawai/contracts`, `@lawkit/ui`). 백엔드는 단일 HTTP 진입점 api-gateway가 TCP로 auth/user 서비스에 위임. 각 서비스는 독립 Prisma 스키마(PostgreSQL). 비밀번호는 argon2 해싱, 인증은 JWT.

**Tech Stack:** pnpm 10 / Turborepo 2 / React 19 / Vite 5 / React Router 7 / TanStack Query 5 / `@lawkit/ui` / NestJS 11 / `@nestjs/microservices`(TCP) / Prisma 6 / PostgreSQL / argon2 / `@nestjs/jwt` / class-validator / helmet / `@nestjs/throttler` / Vitest / Jest.

**Spec:** `docs/superpowers/specs/2026-06-10-monorepo-mfe-backend-init-design.md`

---

## 사전 규약 (모든 태스크 공통)

- 작업 루트: `/Users/junhoson/Documents/GitHub/Lawai`
- `Law.ai Reboot/` 폴더는 절대 건드리지 않는다.
- 모든 의존성 설치는 워크스페이스 필터로: `pnpm --filter <pkg> add <dep>`. 설치 후 항상 루트에서 `pnpm install`로 링크 정합성 확인.
- 포트: gateway HTTP `:3000`, auth TCP `:4001`, user TCP `:4002`, web `:5173`, admin `:5174`, shell `:5175`.
- 패키지 네임스페이스: 프론트/공유는 `@lawai/*`, 백엔드 서비스도 `@lawai/*`.
- 커밋은 각 태스크 끝에서. 메시지는 한국어 Conventional Commits.

## File Structure (생성/수정 맵)

```
Lawai/
├── pnpm-workspace.yaml                 [수정] services/* 추가
├── turbo.json                          [수정] test/start 태스크, dev 정리
├── docker-compose.yml                  [생성] postgres
├── .gitignore                          [수정] .env, dist, prisma generated
├── README.md                           [수정] 부팅 순서
├── packages/
│   ├── design-system/                  [삭제]
│   ├── typescript-config/nest.json     [생성] Nest용 tsconfig
│   └── contracts/                      [생성] 공유 DTO/패턴
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/index.ts
│       ├── src/patterns.ts
│       ├── src/dto/auth.dto.ts
│       ├── src/dto/user.dto.ts
│       └── src/types.ts
├── services/
│   ├── user-service/                   [생성] Nest TCP + Prisma
│   ├── auth-service/                   [생성] Nest TCP + Prisma + argon2/JWT
│   └── api-gateway/                    [생성] Nest HTTP + ClientProxy + 보안
└── apps/
    ├── admin/                          [수정] React19 정렬, @lawkit/ui로 교체
    ├── web/                            [생성] React19 + 로그인 플로우
    └── shell/                          [생성] React19 호스트 셸
```

---

## Phase 0 — 워크스페이스 준비

### Task 0.1: 워크스페이스에 services 추가 & Law.ai Reboot 제외

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `.gitignore`

- [ ] **Step 1: pnpm-workspace.yaml 수정**

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
```

- [ ] **Step 2: .gitignore 보강**

기존 내용 끝에 다음을 추가 (중복 라인은 생략):

```gitignore
# env
.env
.env.*
!.env.example

# build
dist
build

# prisma
**/generated
**/*.db

# misc
.DS_Store
Law.ai Reboot/
```

- [ ] **Step 3: 변경 확인**

Run: `cat pnpm-workspace.yaml && grep -c "Law.ai Reboot" .gitignore`
Expected: services/* 라인 보이고, grep 결과 `1`

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml .gitignore
git commit -m "chore: services 워크스페이스 추가 및 gitignore 보강"
```

### Task 0.2: 로컬 design-system 제거

**Files:**
- Delete: `packages/design-system/` (전체)

- [ ] **Step 1: 다른 곳에서 참조 여부 확인**

Run: `grep -rn "@lawai/design-system" apps services packages --include="*.ts" --include="*.tsx" --include="*.json" 2>/dev/null`
Expected: `apps/admin`만 참조 (admin은 Task 6.1에서 교체). 다른 참조 없음 확인.

- [ ] **Step 2: 디렉토리 삭제**

Run: `git rm -r packages/design-system`

- [ ] **Step 3: 재설치로 링크 정리**

Run: `pnpm install`
Expected: 에러 없이 완료 (admin이 아직 design-system을 참조하면 경고가 날 수 있음 — 다음 스텝에서 admin 의존성도 정리).

- [ ] **Step 4: admin package.json에서 design-system 제거**

`apps/admin/package.json`의 `dependencies`에서 `"@lawai/design-system": "workspace:*"` 라인을 삭제한다. (lawkit 추가는 Task 6.1)

- [ ] **Step 5: 재설치 & 확인**

Run: `pnpm install && grep -rn "@lawai/design-system" . --include="*.json" --exclude-dir=node_modules`
Expected: 매치 없음.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: 로컬 design-system 제거 (@lawkit/ui로 대체 예정)"
```

### Task 0.3: Nest용 공유 tsconfig 추가

**Files:**
- Create: `packages/typescript-config/nest.json`

- [ ] **Step 1: nest.json 작성**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2022",
    "lib": ["ES2022"],
    "declaration": false,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": false,
    "isolatedModules": false
  },
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/typescript-config/nest.json
git commit -m "chore: Nest용 공유 tsconfig 추가"
```

---

## Phase 1 — 공유 계약 패키지 `@lawai/contracts`

### Task 1.1: contracts 패키지 스캐폴드

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@lawai/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "eslint \"src/**/*.ts\"",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@lawai/typescript-config": "workspace:*",
    "typescript": "5.5.4",
    "vitest": "^2.1.8"
  }
}
```

> 참고: contracts는 빌드 없이 소스(.ts)를 직접 export한다. 백엔드(CommonJS)와 프론트(ESM) 양쪽에서 각자 번들러/ts-loader가 트랜스파일하므로 별도 dist가 필요 없다. 순수 타입/상수만 두고 런타임 의존성은 넣지 않는다.

- [ ] **Step 2: tsconfig.json 작성**

```json
{
  "extends": "@lawai/typescript-config/base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 설치**

Run: `pnpm install --filter @lawai/contracts`
Expected: 성공.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts
git commit -m "feat(contracts): 공유 계약 패키지 스캐폴드"
```

### Task 1.2: TCP 메시지 패턴 상수

**Files:**
- Create: `packages/contracts/src/patterns.ts`
- Test: `packages/contracts/src/patterns.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// packages/contracts/src/patterns.test.ts
import { describe, it, expect } from "vitest";
import { AUTH_PATTERNS, USER_PATTERNS } from "./patterns";

describe("message patterns", () => {
  it("auth 패턴은 'auth.' 프리픽스를 가진다", () => {
    expect(AUTH_PATTERNS.SIGNUP).toBe("auth.signup");
    expect(AUTH_PATTERNS.LOGIN).toBe("auth.login");
    expect(AUTH_PATTERNS.VALIDATE).toBe("auth.validate");
  });

  it("user 패턴은 'user.' 프리픽스를 가진다", () => {
    expect(USER_PATTERNS.CREATE).toBe("user.create");
    expect(USER_PATTERNS.FIND_BY_EMAIL).toBe("user.findByEmail");
    expect(USER_PATTERNS.FIND_BY_ID).toBe("user.findById");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/contracts test`
Expected: FAIL — `./patterns` 모듈 없음.

- [ ] **Step 3: 구현**

```ts
// packages/contracts/src/patterns.ts
export const AUTH_PATTERNS = {
  SIGNUP: "auth.signup",
  LOGIN: "auth.login",
  VALIDATE: "auth.validate",
} as const;

export const USER_PATTERNS = {
  CREATE: "user.create",
  FIND_BY_EMAIL: "user.findByEmail",
  FIND_BY_ID: "user.findById",
} as const;
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @lawai/contracts test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/patterns.ts packages/contracts/src/patterns.test.ts
git commit -m "feat(contracts): TCP 메시지 패턴 상수"
```

### Task 1.3: 공유 타입 & DTO

**Files:**
- Create: `packages/contracts/src/types.ts`
- Create: `packages/contracts/src/dto/auth.dto.ts`
- Create: `packages/contracts/src/dto/user.dto.ts`
- Create: `packages/contracts/src/index.ts`

> 참고: DTO는 class-validator 데코레이터를 쓰지 않는 **순수 인터페이스**로 둔다. 데코레이터 검증은 각 Nest 서비스/게이트웨이 안에서 class-validator DTO로 별도 정의(프론트에 class-validator를 끌고 오지 않기 위함). contracts는 타입 계약만 책임진다.

- [ ] **Step 1: types.ts 작성**

```ts
// packages/contracts/src/types.ts
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
}
```

- [ ] **Step 2: auth.dto.ts 작성**

```ts
// packages/contracts/src/dto/auth.dto.ts
export interface SignupRequest {
  email: string;
  name: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ValidateTokenRequest {
  token: string;
}
```

- [ ] **Step 3: user.dto.ts 작성**

```ts
// packages/contracts/src/dto/user.dto.ts
export interface CreateUserRequest {
  email: string;
  name: string;
  passwordHash: string;
}

export interface FindUserByEmailRequest {
  email: string;
}

export interface FindUserByIdRequest {
  id: string;
}

// user-service 내부 전용: 해시를 포함한 사용자 (gateway로는 절대 노출 금지)
export interface UserWithHash {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}
```

- [ ] **Step 4: index.ts 배럴 작성**

```ts
// packages/contracts/src/index.ts
export * from "./patterns";
export * from "./types";
export * from "./dto/auth.dto";
export * from "./dto/user.dto";
```

- [ ] **Step 5: 타입체크 통과 확인**

Run: `pnpm --filter @lawai/contracts typecheck`
Expected: 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src
git commit -m "feat(contracts): 공유 타입과 DTO 인터페이스"
```

---

## Phase 2 — 로컬 PostgreSQL

### Task 2.1: docker-compose로 Postgres 기동

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example` (루트, DB 접속 정보 참고용)

- [ ] **Step 1: docker-compose.yml 작성**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: lawai-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: lawai
      POSTGRES_PASSWORD: lawai_local_pw
      POSTGRES_DB: lawai
    ports:
      - "5432:5432"
    volumes:
      - lawai_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lawai -d lawai"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  lawai_pgdata:
```

- [ ] **Step 2: 루트 .env.example 작성**

```bash
# 로컬 Postgres (docker-compose)
# auth-service / user-service 가 schema 파라미터로 스키마를 분리한다
DATABASE_URL_AUTH="postgresql://lawai:lawai_local_pw@localhost:5432/lawai?schema=auth"
DATABASE_URL_USER="postgresql://lawai:lawai_local_pw@localhost:5432/lawai?schema=users"

# JWT
JWT_ACCESS_SECRET="change-me-access"
JWT_REFRESH_SECRET="change-me-refresh"
JWT_ACCESS_TTL="900s"
JWT_REFRESH_TTL="7d"
```

- [ ] **Step 3: 기동 및 헬스 확인**

Run: `docker compose up -d && sleep 3 && docker compose ps`
Expected: `lawai-postgres` 가 healthy(또는 running). Docker 미설치 환경이면 이 스텝은 실행자 환경에서 수동 확인하고 진행.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: 로컬 PostgreSQL docker-compose 및 env 예시"
```

---

## Phase 3 — user-service (Nest TCP + Prisma)

### Task 3.1: user-service 스캐폴드

**Files:**
- Create: `services/user-service/package.json`
- Create: `services/user-service/tsconfig.json`
- Create: `services/user-service/tsconfig.build.json`
- Create: `services/user-service/nest-cli.json`
- Create: `services/user-service/.env.example`
- Create: `services/user-service/src/main.ts`
- Create: `services/user-service/src/app.module.ts`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@lawai/user-service",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "dev": "nest start --watch",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "jest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@lawai/contracts": "workspace:*",
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/microservices": "^11.0.0",
    "@prisma/client": "^6.2.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@lawai/typescript-config": "workspace:*",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.0",
    "jest": "^29.7.0",
    "prisma": "^6.2.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.1",
    "typescript": "5.5.4"
  }
}
```

- [ ] **Step 2: tsconfig.json / tsconfig.build.json 작성**

```json
// services/user-service/tsconfig.json
{
  "extends": "@lawai/typescript-config/nest.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./"
  },
  "include": ["src"]
}
```

```json
// services/user-service/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

- [ ] **Step 3: nest-cli.json 작성**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4: .env.example 작성**

```bash
DATABASE_URL="postgresql://lawai:lawai_local_pw@localhost:5432/lawai?schema=users"
USER_SERVICE_PORT=4002
```

- [ ] **Step 5: app.module.ts 작성 (PrismaModule은 Task 3.2에서 채움 — 우선 빈 모듈)**

```ts
// services/user-service/src/app.module.ts
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 6: main.ts 작성 (TCP 마이크로서비스 부트스트랩)**

```ts
// services/user-service/src/main.ts
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const port = Number(process.env.USER_SERVICE_PORT ?? 4002);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: { host: "0.0.0.0", port },
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen();
  // eslint-disable-next-line no-console
  console.log(`user-service listening on TCP :${port}`);
}
bootstrap();
```

- [ ] **Step 7: 설치**

Run: `pnpm install --filter @lawai/user-service`
Expected: 성공.

- [ ] **Step 8: Commit**

```bash
git add services/user-service
git commit -m "feat(user-service): Nest TCP 마이크로서비스 스캐폴드"
```

### Task 3.2: Prisma 스키마 & PrismaService

**Files:**
- Create: `services/user-service/prisma/schema.prisma`
- Create: `services/user-service/src/prisma/prisma.service.ts`
- Create: `services/user-service/src/prisma/prisma.module.ts`
- Modify: `services/user-service/src/app.module.ts`

- [ ] **Step 1: schema.prisma 작성**

```prisma
// services/user-service/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  passwordHash String
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 2: PrismaService 작성**

```ts
// services/user-service/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 3: PrismaModule 작성**

```ts
// services/user-service/src/prisma/prisma.module.ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4: app.module.ts에 PrismaModule 연결**

```ts
// services/user-service/src/app.module.ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 5: env 설정 후 generate + migrate**

`.env`를 만들고(`cp services/user-service/.env.example services/user-service/.env`) 실행:

Run: `cd services/user-service && pnpm prisma:generate && pnpm prisma migrate dev --name init && cd ../..`
Expected: `users` 스키마에 `User` 테이블 생성, Prisma Client 생성. (Postgres 미기동이면 Task 2.1 먼저.)

- [ ] **Step 6: Commit**

```bash
git add services/user-service/prisma services/user-service/src/prisma services/user-service/src/app.module.ts
git commit -m "feat(user-service): Prisma 스키마와 PrismaService"
```

### Task 3.3: UsersService (생성/조회 로직) — TDD

**Files:**
- Create: `services/user-service/src/users/users.service.ts`
- Test: `services/user-service/src/users/users.service.spec.ts`
- Create: `services/user-service/jest.config.js`

- [ ] **Step 1: jest 설정 작성**

```js
// services/user-service/jest.config.js
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
};
```

- [ ] **Step 2: 실패 테스트 작성 (PrismaService를 목으로 주입)**

```ts
// services/user-service/src/users/users.service.spec.ts
import { Test } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";

describe("UsersService", () => {
  let service: UsersService;
  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it("create는 전달된 필드로 사용자를 만든다", async () => {
    const row = {
      id: "u1",
      email: "a@b.com",
      name: "A",
      passwordHash: "h",
      createdAt: new Date("2026-01-01"),
    };
    prismaMock.user.create.mockResolvedValue(row);

    const result = await service.create({
      email: "a@b.com",
      name: "A",
      passwordHash: "h",
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: "a@b.com", name: "A", passwordHash: "h" },
    });
    expect(result.email).toBe("a@b.com");
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("findByEmail은 해시를 포함해 반환한다 (내부용)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      name: "A",
      passwordHash: "h",
      createdAt: new Date("2026-01-01"),
    });
    const result = await service.findByEmail({ email: "a@b.com" });
    expect(result?.passwordHash).toBe("h");
  });

  it("findByEmail은 없으면 null을 반환한다", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const result = await service.findByEmail({ email: "x@y.com" });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm --filter @lawai/user-service test`
Expected: FAIL — `users.service` 없음.

- [ ] **Step 4: 구현**

```ts
// services/user-service/src/users/users.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateUserRequest,
  FindUserByEmailRequest,
  FindUserByIdRequest,
  UserWithHash,
} from "@lawai/contracts";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(req: CreateUserRequest): Promise<UserWithHash> {
    const user = await this.prisma.user.create({
      data: {
        email: req.email,
        name: req.name,
        passwordHash: req.passwordHash,
      },
    });
    return this.toWithHash(user);
  }

  async findByEmail(
    req: FindUserByEmailRequest,
  ): Promise<UserWithHash | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: req.email },
    });
    return user ? this.toWithHash(user) : null;
  }

  async findById(req: FindUserByIdRequest): Promise<UserWithHash | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.id },
    });
    return user ? this.toWithHash(user) : null;
  }

  private toWithHash(u: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: Date;
  }): UserWithHash {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash: u.passwordHash,
      createdAt: u.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm --filter @lawai/user-service test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add services/user-service/src/users/users.service.ts services/user-service/src/users/users.service.spec.ts services/user-service/jest.config.js
git commit -m "feat(user-service): UsersService 생성/조회 로직"
```

### Task 3.4: UsersController (TCP @MessagePattern)

**Files:**
- Create: `services/user-service/src/users/users.controller.ts`
- Create: `services/user-service/src/users/users.module.ts`
- Modify: `services/user-service/src/app.module.ts`

- [ ] **Step 1: UsersController 작성**

```ts
// services/user-service/src/users/users.controller.ts
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_PATTERNS } from "@lawai/contracts";
import type {
  CreateUserRequest,
  FindUserByEmailRequest,
  FindUserByIdRequest,
} from "@lawai/contracts";
import { UsersService } from "./users.service";

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @MessagePattern(USER_PATTERNS.CREATE)
  create(@Payload() req: CreateUserRequest) {
    return this.users.create(req);
  }

  @MessagePattern(USER_PATTERNS.FIND_BY_EMAIL)
  findByEmail(@Payload() req: FindUserByEmailRequest) {
    return this.users.findByEmail(req);
  }

  @MessagePattern(USER_PATTERNS.FIND_BY_ID)
  findById(@Payload() req: FindUserByIdRequest) {
    return this.users.findById(req);
  }
}
```

- [ ] **Step 2: UsersModule 작성**

```ts
// services/user-service/src/users/users.module.ts
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 3: app.module.ts에 연결**

```ts
// services/user-service/src/app.module.ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [PrismaModule, UsersModule],
})
export class AppModule {}
```

- [ ] **Step 4: 빌드 확인**

Run: `pnpm --filter @lawai/user-service build`
Expected: `dist/main.js` 생성, 타입 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add services/user-service/src
git commit -m "feat(user-service): TCP UsersController와 모듈 연결"
```

---

## Phase 4 — auth-service (Nest TCP + argon2 + JWT)

### Task 4.1: auth-service 스캐폴드

**Files:**
- Create: `services/auth-service/package.json`
- Create: `services/auth-service/tsconfig.json`
- Create: `services/auth-service/tsconfig.build.json`
- Create: `services/auth-service/nest-cli.json`
- Create: `services/auth-service/jest.config.js`
- Create: `services/auth-service/.env.example`
- Create: `services/auth-service/src/main.ts`
- Create: `services/auth-service/src/app.module.ts`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@lawai/auth-service",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "dev": "nest start --watch",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "jest"
  },
  "dependencies": {
    "@lawai/contracts": "workspace:*",
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/microservices": "^11.0.0",
    "argon2": "^0.41.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@lawai/typescript-config": "workspace:*",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.1",
    "typescript": "5.5.4"
  }
}
```

- [ ] **Step 2: tsconfig.json / tsconfig.build.json / nest-cli.json / jest.config.js**

`services/user-service`의 동일 파일들과 내용 동일하게 작성한다 (아래 그대로 복제):

```json
// services/auth-service/tsconfig.json
{
  "extends": "@lawai/typescript-config/nest.json",
  "compilerOptions": { "outDir": "./dist", "baseUrl": "./" },
  "include": ["src"]
}
```
```json
// services/auth-service/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```
```json
// services/auth-service/nest-cli.json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```
```js
// services/auth-service/jest.config.js
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  testEnvironment: "node",
};
```

- [ ] **Step 3: .env.example 작성**

```bash
AUTH_SERVICE_PORT=4001
USER_SERVICE_HOST=localhost
USER_SERVICE_PORT=4002
JWT_ACCESS_SECRET="change-me-access"
JWT_REFRESH_SECRET="change-me-refresh"
JWT_ACCESS_TTL="900s"
JWT_REFRESH_TTL="7d"
```

- [ ] **Step 4: app.module.ts 작성 (모듈은 Task 4.3에서 채움)**

```ts
// services/auth-service/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

- [ ] **Step 5: main.ts 작성**

```ts
// services/auth-service/src/main.ts
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const port = Number(process.env.AUTH_SERVICE_PORT ?? 4001);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    { transport: Transport.TCP, options: { host: "0.0.0.0", port } },
  );
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen();
  // eslint-disable-next-line no-console
  console.log(`auth-service listening on TCP :${port}`);
}
bootstrap();
```

- [ ] **Step 6: 설치**

Run: `pnpm install --filter @lawai/auth-service`
Expected: 성공 (argon2 네이티브 빌드 포함).

- [ ] **Step 7: Commit**

```bash
git add services/auth-service
git commit -m "feat(auth-service): Nest TCP 스캐폴드 (argon2/jwt 의존성)"
```

### Task 4.2: 비밀번호 해싱 유틸 — TDD

**Files:**
- Create: `services/auth-service/src/auth/password.service.ts`
- Test: `services/auth-service/src/auth/password.service.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// services/auth-service/src/auth/password.service.spec.ts
import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const svc = new PasswordService();

  it("해시는 평문과 달라야 한다", async () => {
    const hash = await svc.hash("s3cret!");
    expect(hash).not.toBe("s3cret!");
    expect(hash.startsWith("$argon2")).toBe(true);
  });

  it("올바른 비밀번호는 검증을 통과한다", async () => {
    const hash = await svc.hash("s3cret!");
    await expect(svc.verify(hash, "s3cret!")).resolves.toBe(true);
  });

  it("틀린 비밀번호는 검증에 실패한다", async () => {
    const hash = await svc.hash("s3cret!");
    await expect(svc.verify(hash, "wrong")).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/auth-service test`
Expected: FAIL — `password.service` 없음.

- [ ] **Step 3: 구현 (argon2id 사용)**

```ts
// services/auth-service/src/auth/password.service.ts
import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @lawai/auth-service test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add services/auth-service/src/auth/password.service.ts services/auth-service/src/auth/password.service.spec.ts
git commit -m "feat(auth-service): argon2 비밀번호 해싱 서비스"
```

### Task 4.3: AuthService (signup/login/validate) — TDD

**Files:**
- Create: `services/auth-service/src/auth/auth.service.ts`
- Test: `services/auth-service/src/auth/auth.service.spec.ts`

> AuthService는 user-service(TCP `ClientProxy`)와 JwtService, PasswordService에 의존한다. `ClientProxy`는 `send()`가 Observable을 반환하므로 `rxjs/firstValueFrom`로 await.

- [ ] **Step 1: 실패 테스트 작성**

```ts
// services/auth-service/src/auth/auth.service.spec.ts
import { Test } from "@nestjs/testing";
import { of } from "rxjs";
import { JwtService } from "@nestjs/jwt";
import { RpcException } from "@nestjs/microservices";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { USER_PATTERNS } from "@lawai/contracts";

describe("AuthService", () => {
  let service: AuthService;
  const userClient = { send: jest.fn() };
  const passwords = {
    hash: jest.fn(),
    verify: jest.fn(),
  };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: "USER_CLIENT", useValue: userClient },
        { provide: PasswordService, useValue: passwords },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it("signup은 해시 후 user.create를 호출하고 토큰을 발급한다", async () => {
    passwords.hash.mockResolvedValue("hashed");
    userClient.send.mockReturnValue(
      of({
        id: "u1",
        email: "a@b.com",
        name: "A",
        passwordHash: "hashed",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    jwt.signAsync.mockResolvedValue("token");

    const result = await service.signup({
      email: "a@b.com",
      name: "A",
      password: "pw",
    });

    expect(passwords.hash).toHaveBeenCalledWith("pw");
    expect(userClient.send).toHaveBeenCalledWith(USER_PATTERNS.CREATE, {
      email: "a@b.com",
      name: "A",
      passwordHash: "hashed",
    });
    expect(result.tokens.accessToken).toBe("token");
    expect(result.user).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "A",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    // 해시는 절대 반환되지 않아야 한다
    expect(JSON.stringify(result)).not.toContain("hashed");
  });

  it("login은 비밀번호 검증 성공 시 토큰을 발급한다", async () => {
    userClient.send.mockReturnValue(
      of({
        id: "u1",
        email: "a@b.com",
        name: "A",
        passwordHash: "hashed",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    passwords.verify.mockResolvedValue(true);
    jwt.signAsync.mockResolvedValue("token");

    const result = await service.login({ email: "a@b.com", password: "pw" });
    expect(passwords.verify).toHaveBeenCalledWith("hashed", "pw");
    expect(result.tokens.accessToken).toBe("token");
  });

  it("login은 사용자가 없으면 RpcException", async () => {
    userClient.send.mockReturnValue(of(null));
    await expect(
      service.login({ email: "x@y.com", password: "pw" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("login은 비밀번호가 틀리면 RpcException", async () => {
    userClient.send.mockReturnValue(
      of({
        id: "u1",
        email: "a@b.com",
        name: "A",
        passwordHash: "hashed",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    passwords.verify.mockResolvedValue(false);
    await expect(
      service.login({ email: "a@b.com", password: "bad" }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/auth-service test`
Expected: FAIL — `auth.service` 없음.

- [ ] **Step 3: 구현**

```ts
// services/auth-service/src/auth/auth.service.ts
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { JwtService } from "@nestjs/jwt";
import { firstValueFrom } from "rxjs";
import {
  USER_PATTERNS,
  type SignupRequest,
  type LoginRequest,
  type ValidateTokenRequest,
  type PublicUser,
  type AuthTokens,
  type UserWithHash,
  type JwtPayload,
} from "@lawai/contracts";
import { PasswordService } from "./password.service";

interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  async signup(req: SignupRequest): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(req.password);
    const created = await firstValueFrom(
      this.userClient.send<UserWithHash>(USER_PATTERNS.CREATE, {
        email: req.email,
        name: req.name,
        passwordHash,
      }),
    );
    return this.buildResult(created);
  }

  async login(req: LoginRequest): Promise<AuthResult> {
    const user = await firstValueFrom(
      this.userClient.send<UserWithHash | null>(USER_PATTERNS.FIND_BY_EMAIL, {
        email: req.email,
      }),
    );
    if (!user) {
      throw new RpcException({ status: 401, message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }
    const ok = await this.passwords.verify(user.passwordHash, req.password);
    if (!ok) {
      throw new RpcException({ status: 401, message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }
    return this.buildResult(user);
  }

  async validate(req: ValidateTokenRequest): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(req.token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new RpcException({ status: 401, message: "유효하지 않은 토큰" });
    }
  }

  private async buildResult(user: UserWithHash): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_TTL ?? "900s",
      }),
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_TTL ?? "7d",
      }),
    ]);
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
    return { user: publicUser, tokens: { accessToken, refreshToken } };
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @lawai/auth-service test`
Expected: PASS (passwordService 3 + authService 4 = 7 tests).

- [ ] **Step 5: Commit**

```bash
git add services/auth-service/src/auth/auth.service.ts services/auth-service/src/auth/auth.service.spec.ts
git commit -m "feat(auth-service): signup/login/validate 로직 (TCP user 위임, JWT)"
```

### Task 4.4: AuthController + AuthModule 연결

**Files:**
- Create: `services/auth-service/src/auth/auth.controller.ts`
- Create: `services/auth-service/src/auth/auth.module.ts`
- Modify: `services/auth-service/src/app.module.ts`

- [ ] **Step 1: AuthController 작성**

```ts
// services/auth-service/src/auth/auth.controller.ts
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  AUTH_PATTERNS,
  type SignupRequest,
  type LoginRequest,
  type ValidateTokenRequest,
} from "@lawai/contracts";
import { AuthService } from "./auth.service";

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.SIGNUP)
  signup(@Payload() req: SignupRequest) {
    return this.auth.signup(req);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() req: LoginRequest) {
    return this.auth.login(req);
  }

  @MessagePattern(AUTH_PATTERNS.VALIDATE)
  validate(@Payload() req: ValidateTokenRequest) {
    return this.auth.validate(req);
  }
}
```

- [ ] **Step 2: AuthModule 작성 (user-service로의 TCP ClientProxy 등록)**

```ts
// services/auth-service/src/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";

@Module({
  imports: [
    JwtModule.register({}),
    ClientsModule.register([
      {
        name: "USER_CLIENT",
        transport: Transport.TCP,
        options: {
          host: process.env.USER_SERVICE_HOST ?? "localhost",
          port: Number(process.env.USER_SERVICE_PORT ?? 4002),
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService],
})
export class AuthModule {}
```

- [ ] **Step 3: app.module.ts에 연결**

```ts
// services/auth-service/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
})
export class AppModule {}
```

- [ ] **Step 4: 빌드 확인**

Run: `pnpm --filter @lawai/auth-service build`
Expected: 타입 에러 없음, `dist/main.js` 생성.

- [ ] **Step 5: Commit**

```bash
git add services/auth-service/src
git commit -m "feat(auth-service): TCP AuthController와 모듈 연결"
```

---

## Phase 5 — api-gateway (HTTP 진입점 + 보안)

### Task 5.1: api-gateway 스캐폴드

**Files:**
- Create: `services/api-gateway/package.json`
- Create: `services/api-gateway/tsconfig.json`
- Create: `services/api-gateway/tsconfig.build.json`
- Create: `services/api-gateway/nest-cli.json`
- Create: `services/api-gateway/jest.config.js`
- Create: `services/api-gateway/.env.example`
- Create: `services/api-gateway/src/main.ts`
- Create: `services/api-gateway/src/app.module.ts`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@lawai/api-gateway",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "dev": "nest start --watch",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.config.js"
  },
  "dependencies": {
    "@lawai/contracts": "workspace:*",
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/microservices": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/throttler": "^6.4.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "helmet": "^8.0.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@lawai/typescript-config": "workspace:*",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.1",
    "typescript": "5.5.4"
  }
}
```

- [ ] **Step 2: tsconfig.json / tsconfig.build.json / nest-cli.json / jest.config.js**

user-service와 동일 패턴으로 작성:

```json
// services/api-gateway/tsconfig.json
{
  "extends": "@lawai/typescript-config/nest.json",
  "compilerOptions": { "outDir": "./dist", "baseUrl": "./" },
  "include": ["src"]
}
```
```json
// services/api-gateway/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*.spec.ts", "**/*.test.ts"]
}
```
```json
// services/api-gateway/nest-cli.json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```
```js
// services/api-gateway/jest.config.js
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  testEnvironment: "node",
};
```

- [ ] **Step 3: .env.example 작성**

```bash
GATEWAY_PORT=3000
AUTH_SERVICE_HOST=localhost
AUTH_SERVICE_PORT=4001
USER_SERVICE_HOST=localhost
USER_SERVICE_PORT=4002
JWT_ACCESS_SECRET="change-me-access"
CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://localhost:5175"
```

- [ ] **Step 4: app.module.ts 작성 (모듈은 Task 5.3에서)**

```ts
// services/api-gateway/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
  ],
})
export class AppModule {}
```

- [ ] **Step 5: main.ts 작성 (HTTP + helmet + CORS + 글로벌 파이프)**

```ts
// services/api-gateway/src/main.ts
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((o) => o.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.GATEWAY_PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`api-gateway listening on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 6: 설치**

Run: `pnpm install --filter @lawai/api-gateway`
Expected: 성공.

- [ ] **Step 7: Commit**

```bash
git add services/api-gateway
git commit -m "feat(api-gateway): Nest HTTP 스캐폴드 (helmet/cors/throttler)"
```

### Task 5.2: 검증 DTO + 클라이언트 모듈 + JWT 가드

**Files:**
- Create: `services/api-gateway/src/clients/clients.module.ts`
- Create: `services/api-gateway/src/auth/dto.ts`
- Create: `services/api-gateway/src/auth/jwt-auth.guard.ts`

- [ ] **Step 1: clients.module.ts 작성 (auth/user로의 TCP ClientProxy, 전역 export)**

```ts
// services/api-gateway/src/clients/clients.module.ts
import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";

const clients = ClientsModule.register([
  {
    name: "AUTH_CLIENT",
    transport: Transport.TCP,
    options: {
      host: process.env.AUTH_SERVICE_HOST ?? "localhost",
      port: Number(process.env.AUTH_SERVICE_PORT ?? 4001),
    },
  },
  {
    name: "USER_CLIENT",
    transport: Transport.TCP,
    options: {
      host: process.env.USER_SERVICE_HOST ?? "localhost",
      port: Number(process.env.USER_SERVICE_PORT ?? 4002),
    },
  },
]);

@Global()
@Module({
  imports: [clients],
  exports: [clients],
})
export class GatewayClientsModule {}
```

- [ ] **Step 2: 검증 DTO 작성 (class-validator)**

```ts
// services/api-gateway/src/auth/dto.ts
import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
```

- [ ] **Step 3: JWT 가드 작성 (auth-service VALIDATE로 위임)**

```ts
// services/api-gateway/src/auth/jwt-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { AUTH_PATTERNS, type JwtPayload } from "@lawai/contracts";
import type { Request } from "express";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject("AUTH_CLIENT") private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("토큰 없음");
    }
    const token = header.slice("Bearer ".length);
    try {
      const payload = await firstValueFrom(
        this.authClient.send<JwtPayload>(AUTH_PATTERNS.VALIDATE, { token }),
      );
      (req as Request & { user?: JwtPayload }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("유효하지 않은 토큰");
    }
  }
}
```

- [ ] **Step 4: 타입체크용 임시 빌드 (컨트롤러 연결 전이라 모듈 미연결, 빌드는 다음 태스크 후)**

Run: `echo "다음 태스크에서 함께 빌드"`
Expected: (스킵 가능)

- [ ] **Step 5: Commit**

```bash
git add services/api-gateway/src/clients services/api-gateway/src/auth/dto.ts services/api-gateway/src/auth/jwt-auth.guard.ts
git commit -m "feat(api-gateway): TCP 클라이언트 모듈, 검증 DTO, JWT 가드"
```

### Task 5.3: Auth/User 컨트롤러 + RPC 예외 매핑 + 모듈 연결

**Files:**
- Create: `services/api-gateway/src/common/rpc-to-http.ts`
- Create: `services/api-gateway/src/auth/auth.controller.ts`
- Create: `services/api-gateway/src/users/users.controller.ts`
- Create: `services/api-gateway/src/auth/auth.module.ts`
- Create: `services/api-gateway/src/users/users.module.ts`
- Modify: `services/api-gateway/src/app.module.ts`

- [ ] **Step 1: RPC→HTTP 예외 변환 헬퍼 작성**

```ts
// services/api-gateway/src/common/rpc-to-http.ts
import { HttpException, HttpStatus } from "@nestjs/common";
import { catchError, throwError, type OperationFunction } from "rxjs";

interface RpcError {
  status?: number;
  message?: string;
}

// TCP 서비스가 던진 RpcException 페이로드를 HTTP 예외로 변환
export function rpcToHttp<T>(): OperationFunction<T, T> {
  return catchError((err: RpcError) => {
    const status = err?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message = err?.message ?? "서비스 오류";
    return throwError(() => new HttpException(message, status));
  });
}
```

- [ ] **Step 2: auth.controller.ts 작성**

```ts
// services/api-gateway/src/auth/auth.controller.ts
import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { AUTH_PATTERNS } from "@lawai/contracts";
import { rpcToHttp } from "../common/rpc-to-http";
import { SignupDto, LoginDto } from "./dto";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject("AUTH_CLIENT") private readonly authClient: ClientProxy,
  ) {}

  @Post("signup")
  signup(@Body() dto: SignupDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.SIGNUP, dto).pipe(rpcToHttp()),
    );
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.LOGIN, dto).pipe(rpcToHttp()),
    );
  }
}
```

- [ ] **Step 3: users.controller.ts 작성 (보호 라우트 `GET /users/me`)**

```ts
// services/api-gateway/src/users/users.controller.ts
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import {
  USER_PATTERNS,
  type JwtPayload,
  type PublicUser,
  type UserWithHash,
} from "@lawai/contracts";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";

@Controller("users")
export class UsersController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() req: Request): Promise<PublicUser> {
    const payload = (req as Request & { user: JwtPayload }).user;
    const user = await firstValueFrom(
      this.userClient
        .send<UserWithHash | null>(USER_PATTERNS.FIND_BY_ID, {
          id: payload.sub,
        })
        .pipe(rpcToHttp()),
    );
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다");
    // 해시 제외하고 공개 필드만 반환
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
```

- [ ] **Step 4: 모듈 작성**

```ts
// services/api-gateway/src/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";

@Module({ controllers: [AuthController] })
export class AuthModule {}
```
```ts
// services/api-gateway/src/users/users.module.ts
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";

@Module({ controllers: [UsersController] })
export class UsersModule {}
```

- [ ] **Step 5: app.module.ts 최종 연결**

```ts
// services/api-gateway/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { GatewayClientsModule } from "./clients/clients.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    GatewayClientsModule,
    AuthModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

- [ ] **Step 6: 빌드 확인**

Run: `pnpm --filter @lawai/api-gateway build`
Expected: 타입 에러 없음.

- [ ] **Step 7: Commit**

```bash
git add services/api-gateway/src
git commit -m "feat(api-gateway): auth/users 컨트롤러, RPC→HTTP 매핑, 모듈 연결"
```

### Task 5.4: 백엔드 통합 스모크 (수동 검증 스크립트)

**Files:**
- Create: `services/README.md`

- [ ] **Step 1: 세 서비스 동시 기동 후 플로우 확인**

각각 별도 터미널(또는 `pnpm dev` 후) 기동 상태에서:

Run:
```bash
curl -s -X POST http://localhost:3000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@lawai.dev","name":"Smoke","password":"password123"}'
```
Expected: `{ "user": { "id": ..., "email":"smoke@lawai.dev", ... }, "tokens": { "accessToken": ..., "refreshToken": ... } }`. 응답에 `passwordHash` 절대 없음.

- [ ] **Step 2: 로그인 + 보호 라우트 확인**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"smoke@lawai.dev","password":"password123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).tokens.accessToken))")
curl -s http://localhost:3000/users/me -H "Authorization: Bearer $TOKEN"
```
Expected: `/users/me`가 `smoke@lawai.dev` 공개 프로필 반환. 토큰 없이 호출 시 401.

- [ ] **Step 3: services/README.md에 기동 순서 기록**

```md
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
```

- [ ] **Step 4: Commit**

```bash
git add services/README.md
git commit -m "docs(services): 백엔드 기동 순서와 엔드포인트 문서화"
```

---

## Phase 6 — 프론트엔드 앱

### Task 6.1: admin을 React 19 + @lawkit/ui로 정렬

**Files:**
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/src/main.tsx`
- Create: `apps/admin/src/App.tsx`

- [ ] **Step 1: package.json 의존성 갱신**

`apps/admin/package.json`을 아래로 교체 (React 19, lawkit, 도구 버전 정렬):

```json
{
  "name": "@lawai/admin",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5174 --clearScreen false",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.ts*\"",
    "test": "vitest run"
  },
  "dependencies": {
    "@lawai/contracts": "workspace:*",
    "@lawkit/ui": "^0.1.41",
    "@tanstack/react-query": "^5.62.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0"
  },
  "devDependencies": {
    "@lawai/eslint-config": "workspace:*",
    "@lawai/typescript-config": "workspace:*",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^8.57.0",
    "jsdom": "^25.0.1",
    "typescript": "5.5.4",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

> 주의: 기존 `@vitejs/plugin-react`가 3.x였음 → React 19 호환 위해 4.x로 상향.

- [ ] **Step 2: App.tsx 작성 (lawkit 사용 최소 화면)**

```tsx
// apps/admin/src/App.tsx
export function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Lawai Admin</h1>
      <p>관리자 콘솔 스켈레톤</p>
    </div>
  );
}
```

- [ ] **Step 3: main.tsx 교체 (design-system 제거, lawkit css import)**

```tsx
// apps/admin/src/main.tsx
import { createRoot } from "react-dom/client";
import "@lawkit/ui/style.css";
import "./style.css";
import { App } from "./App";

createRoot(document.getElementById("app")!).render(<App />);
```

- [ ] **Step 4: 설치 & 빌드 확인**

Run: `pnpm install && pnpm --filter @lawai/admin build`
Expected: 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add apps/admin
git commit -m "refactor(admin): React 19 정렬 및 @lawkit/ui 적용"
```

### Task 6.2: web 앱 스캐폴드 (Vite + React 19)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/.eslintrc.cjs`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/style.css`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@lawai/web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173 --clearScreen false",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.ts*\"",
    "test": "vitest run"
  },
  "dependencies": {
    "@lawai/contracts": "workspace:*",
    "@lawkit/ui": "^0.1.41",
    "@tanstack/react-query": "^5.62.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0"
  },
  "devDependencies": {
    "@lawai/eslint-config": "workspace:*",
    "@lawai/typescript-config": "workspace:*",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^8.57.0",
    "jsdom": "^25.0.1",
    "typescript": "5.5.4",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: index.html 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lawai</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: vite.config.ts 작성 (vitest 포함)**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

- [ ] **Step 4: tsconfig.json / .eslintrc.cjs / style.css 작성**

```json
// apps/web/tsconfig.json
{
  "extends": "@lawai/typescript-config/vite.json",
  "include": ["src"],
  "compilerOptions": { "jsx": "react-jsx", "types": ["vitest/globals"] }
}
```
```js
// apps/web/.eslintrc.cjs
module.exports = {
  root: true,
  extends: ["@lawai/eslint-config"],
  parserOptions: { project: null },
};
```
```css
/* apps/web/src/style.css */
:root { font-family: system-ui, sans-serif; }
body { margin: 0; }
```

- [ ] **Step 5: main.tsx 작성 (라우터 + QueryClient — 라우트는 Task 6.4)**

```tsx
// apps/web/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "@lawkit/ui/style.css";
import "./style.css";
import { AppRoutes } from "./routes";

const queryClient = new QueryClient();

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 6: test-setup.ts 작성**

```ts
// apps/web/src/test-setup.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 7: 설치**

Run: `pnpm install --filter @lawai/web`
Expected: 성공. (`routes` 파일은 다음 태스크에서 생성하므로 아직 빌드는 X)

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): Vite + React19 앱 스캐폴드 (router/query provider)"
```

### Task 6.3: web — API 클라이언트 & 인증 훅 — TDD

**Files:**
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/api/auth.ts`
- Test: `apps/web/src/api/auth.test.ts`

- [ ] **Step 1: 실패 테스트 작성 (fetch 목)**

```ts
// apps/web/src/api/auth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, signup } from "./auth";

describe("auth api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("login은 /auth/login으로 POST하고 토큰을 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: "u1", email: "a@b.com", name: "A", createdAt: "x" },
        tokens: { accessToken: "at", refreshToken: "rt" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await login({ email: "a@b.com", password: "password123" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(res.tokens.accessToken).toBe("at");
  });

  it("signup은 에러 응답 시 throw한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "이미 존재" }),
      }),
    );
    await expect(
      signup({ email: "a@b.com", name: "A", password: "password123" }),
    ).rejects.toThrow("이미 존재");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/web test`
Expected: FAIL — `./auth` 없음.

- [ ] **Step 3: client.ts 구현 (얇은 fetch 래퍼)**

```ts
// apps/web/src/api/client.ts
const BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}
```

- [ ] **Step 4: auth.ts 구현**

```ts
// apps/web/src/api/auth.ts
import type {
  LoginRequest,
  SignupRequest,
  PublicUser,
  AuthTokens,
} from "@lawai/contracts";
import { apiFetch } from "./client";

interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

export function login(req: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function signup(req: SignupRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function getMe(): Promise<PublicUser> {
  return apiFetch<PublicUser>("/users/me");
}
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm --filter @lawai/web test`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/api
git commit -m "feat(web): API fetch 래퍼와 인증 API"
```

### Task 6.4: web — 로그인 화면 & 보호 라우트 — TDD

**Files:**
- Create: `apps/web/src/routes.tsx`
- Create: `apps/web/src/pages/LoginPage.tsx`
- Create: `apps/web/src/pages/HomePage.tsx`
- Test: `apps/web/src/pages/LoginPage.test.tsx`

- [ ] **Step 1: 실패 테스트 작성 (로그인 폼 렌더 + 제출)**

```tsx
// apps/web/src/pages/LoginPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "./LoginPage";
import * as authApi from "../api/auth";

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("이메일/비밀번호 입력과 로그인 버튼을 렌더한다", () => {
    renderPage();
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "로그인" }),
    ).toBeInTheDocument();
  });

  it("제출하면 login API를 호출하고 토큰을 저장한다", async () => {
    const loginSpy = vi.spyOn(authApi, "login").mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "A", createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
    renderPage();
    await userEvent.type(screen.getByLabelText("이메일"), "a@b.com");
    await userEvent.type(screen.getByLabelText("비밀번호"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(loginSpy).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "password123",
    });
    expect(localStorage.getItem("accessToken")).toBe("at");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/web test`
Expected: FAIL — `./LoginPage` 없음.

- [ ] **Step 3: LoginPage.tsx 구현**

```tsx
// apps/web/src/pages/LoginPage.tsx
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login } from "../api/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      navigate("/");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 320, margin: "64px auto" }}>
      <h1>로그인</h1>
      <label htmlFor="email">이메일</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="password">비밀번호</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={mutation.isPending}>
        로그인
      </button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    </form>
  );
}
```

- [ ] **Step 4: HomePage.tsx 구현 (보호 라우트 — getMe)**

```tsx
// apps/web/src/pages/HomePage.tsx
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getMe } from "../api/auth";

export function HomePage() {
  const hasToken = !!localStorage.getItem("accessToken");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: hasToken,
    retry: false,
  });

  if (!hasToken) return <Navigate to="/login" replace />;
  if (isLoading) return <p>불러오는 중…</p>;
  if (isError) return <Navigate to="/login" replace />;

  return (
    <div style={{ padding: 24 }}>
      <h1>환영합니다, {data?.name}님</h1>
      <p>{data?.email}</p>
    </div>
  );
}
```

- [ ] **Step 5: routes.tsx 구현**

```tsx
// apps/web/src/routes.tsx
import { Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
```

- [ ] **Step 6: 통과 확인 + 빌드**

Run: `pnpm --filter @lawai/web test && pnpm --filter @lawai/web build`
Expected: 테스트 PASS, 빌드 성공.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): 로그인 화면과 보호 라우트 (TanStack Query)"
```

### Task 6.5: shell 앱 스캐폴드

**Files:**
- Create: `apps/shell/package.json`
- Create: `apps/shell/index.html`
- Create: `apps/shell/vite.config.ts`
- Create: `apps/shell/tsconfig.json`
- Create: `apps/shell/.eslintrc.cjs`
- Create: `apps/shell/src/main.tsx`
- Create: `apps/shell/src/App.tsx`
- Create: `apps/shell/src/style.css`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "@lawai/shell",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5175 --clearScreen false",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint \"src/**/*.ts*\"",
    "test": "vitest run"
  },
  "dependencies": {
    "@lawai/contracts": "workspace:*",
    "@lawkit/ui": "^0.1.41",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0"
  },
  "devDependencies": {
    "@lawai/eslint-config": "workspace:*",
    "@lawai/typescript-config": "workspace:*",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^8.57.0",
    "typescript": "5.5.4",
    "vite": "^5.4.11"
  }
}
```

- [ ] **Step 2: index.html / vite.config.ts / tsconfig.json / .eslintrc.cjs / style.css**

```html
<!-- apps/shell/index.html -->
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lawai Shell</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
```ts
// apps/shell/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
```
```json
// apps/shell/tsconfig.json
{
  "extends": "@lawai/typescript-config/vite.json",
  "include": ["src"],
  "compilerOptions": { "jsx": "react-jsx" }
}
```
```js
// apps/shell/.eslintrc.cjs
module.exports = {
  root: true,
  extends: ["@lawai/eslint-config"],
  parserOptions: { project: null },
};
```
```css
/* apps/shell/src/style.css */
:root { font-family: system-ui, sans-serif; }
body { margin: 0; }
nav { display: flex; gap: 16px; padding: 16px; border-bottom: 1px solid #eee; }
```

- [ ] **Step 3: App.tsx 작성 (공통 레이아웃/네비게이션 셸)**

```tsx
// apps/shell/src/App.tsx
export function App() {
  return (
    <div>
      <nav>
        <strong>Lawai</strong>
        <a href="http://localhost:5173">Web</a>
        <a href="http://localhost:5174">Admin</a>
      </nav>
      <main style={{ padding: 24 }}>
        <h1>Lawai Shell</h1>
        <p>공통 레이아웃/네비게이션 호스트 셸 스켈레톤</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: main.tsx 작성**

```tsx
// apps/shell/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@lawkit/ui/style.css";
import "./style.css";
import { App } from "./App";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: 설치 & 빌드 확인**

Run: `pnpm install && pnpm --filter @lawai/shell build`
Expected: 빌드 성공.

- [ ] **Step 6: Commit**

```bash
git add apps/shell
git commit -m "feat(shell): React19 호스트 셸 앱 스캐폴드"
```

---

## Phase 7 — 오케스트레이션 & 마무리

### Task 7.1: turbo 태스크 정비

**Files:**
- Modify: `turbo.json`
- Modify: `package.json` (루트)

- [ ] **Step 1: turbo.json에 test/start 태스크 추가**

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "start": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 2: 루트 package.json에 test 스크립트 추가**

`scripts`에 추가:

```json
    "test": "turbo run test"
```

- [ ] **Step 3: 전체 빌드/테스트 확인**

Run: `pnpm install && pnpm build && pnpm test`
Expected: 모든 워크스페이스 빌드 성공, 백엔드/프론트 단위 테스트 통과.

- [ ] **Step 4: Commit**

```bash
git add turbo.json package.json
git commit -m "chore: turbo test/start 태스크 및 루트 test 스크립트"
```

### Task 7.2: gateway e2e 테스트 (auth signup→me, TCP 서비스 목)

**Files:**
- Create: `services/api-gateway/test/auth.e2e-spec.ts`
- Create: `services/api-gateway/test/jest-e2e.config.js`

> e2e는 실제 TCP 서비스 대신 ClientProxy를 오버라이드해 게이트웨이 HTTP 계층(검증/가드/라우팅/직렬화)을 검증한다.

- [ ] **Step 1: jest-e2e 설정 작성**

```js
// services/api-gateway/test/jest-e2e.config.js
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".e2e-spec.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  testEnvironment: "node",
};
```

- [ ] **Step 2: e2e 테스트 작성**

```ts
// services/api-gateway/test/auth.e2e-spec.ts
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { of } from "rxjs";
import * as request from "supertest";
import { AUTH_PATTERNS, USER_PATTERNS } from "@lawai/contracts";
import { AppModule } from "../src/app.module";

describe("api-gateway (e2e)", () => {
  let app: INestApplication;

  const authClient = {
    send: jest.fn((pattern: string) => {
      if (pattern === AUTH_PATTERNS.SIGNUP) {
        return of({
          user: { id: "u1", email: "a@b.com", name: "A", createdAt: "x" },
          tokens: { accessToken: "at", refreshToken: "rt" },
        });
      }
      if (pattern === AUTH_PATTERNS.VALIDATE) {
        return of({ sub: "u1", email: "a@b.com" });
      }
      return of(null);
    }),
  };
  const userClient = {
    send: jest.fn((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_ID) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "secret-hash",
          createdAt: "x",
        });
      }
      return of(null);
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider("AUTH_CLIENT")
      .useValue(authClient)
      .overrideProvider("USER_CLIENT")
      .useValue(userClient)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/signup → 201과 토큰", () => {
    return request(app.getHttpServer())
      .post("/auth/signup")
      .send({ email: "a@b.com", name: "A", password: "password123" })
      .expect(201)
      .expect((res) => {
        expect(res.body.tokens.accessToken).toBe("at");
      });
  });

  it("POST /auth/signup → 잘못된 입력은 400", () => {
    return request(app.getHttpServer())
      .post("/auth/signup")
      .send({ email: "not-email", name: "A", password: "short" })
      .expect(400);
  });

  it("GET /users/me → 토큰 없으면 401", () => {
    return request(app.getHttpServer()).get("/users/me").expect(401);
  });

  it("GET /users/me → 유효 토큰이면 200, 해시는 노출 안 됨", () => {
    return request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", "Bearer valid")
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe("a@b.com");
        expect(JSON.stringify(res.body)).not.toContain("secret-hash");
      });
  });
});
```

- [ ] **Step 3: 실행**

Run: `pnpm --filter @lawai/api-gateway test:e2e`
Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
git add services/api-gateway/test
git commit -m "test(api-gateway): 인증 플로우 e2e (서비스 목)"
```

### Task 7.3: 루트 README 갱신

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README 전체 교체**

```md
# Lawai

pnpm + Turborepo 기반 모노레포. 마이크로 프론트엔드(React 19) + Nest TCP 마이크로서비스 백엔드.

## 구조
- `apps/shell` (:5175) — 공통 레이아웃/네비게이션 호스트
- `apps/web` (:5173) — 일반 사용자용 메인
- `apps/admin` (:5174) — 관리자
- `services/api-gateway` (:3000) — 유일한 HTTP 진입점
- `services/auth-service` (TCP :4001) — 인증(argon2, JWT)
- `services/user-service` (TCP :4002) — 사용자
- `packages/contracts` — FE/BE 공유 타입·메시지 패턴
- `packages/eslint-config`, `packages/typescript-config` — 공유 설정

## 시작
```bash
pnpm install
docker compose up -d                 # PostgreSQL
# 각 서비스 .env 준비
cp services/user-service/.env.example services/user-service/.env
cp services/auth-service/.env.example services/auth-service/.env
cp services/api-gateway/.env.example services/api-gateway/.env
# user-service 마이그레이션
pnpm --filter @lawai/user-service prisma migrate dev
# 전체 개발 모드 (turbo 병렬)
pnpm dev
```

## 인증 플로우
프론트(web) → `POST /auth/signup|login` → gateway → (TCP) auth-service → (TCP) user-service.
보호 라우트 `GET /users/me`는 JWT 가드가 auth-service VALIDATE로 검증.

## 스크립트
- `pnpm dev` — 전체 개발 모드
- `pnpm build` — 전체 빌드
- `pnpm test` — 전체 테스트
- `pnpm lint` — 린트

## 보안
- 비밀번호 argon2id 해싱, 평문/해시 응답 노출 금지
- gateway: helmet, CORS 화이트리스트, throttler, 글로벌 ValidationPipe(whitelist)
- JWT access/refresh, 시크릿은 `.env`(커밋 금지)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: 루트 README를 모노레포 구조로 갱신"
```

### Task 7.4: 최종 전체 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 클린 설치 + 빌드 + 테스트**

Run: `pnpm install && pnpm build && pnpm test && pnpm lint`
Expected: 전부 성공.

- [ ] **Step 2: E2E 수동 플로우 (Postgres + 3서비스 + web 기동)**

Run: docker compose up → `pnpm dev` → 브라우저 `http://localhost:5173/login`에서 회원가입(별도 도구/`/login`은 로그인만이므로 curl로 signup 후) → 로그인 → `/`에서 `환영합니다` 확인.
Expected: 로그인 후 보호 라우트에서 사용자 정보 표시. 토큰 없이 `/` 접근 시 `/login`으로 리다이렉트.

- [ ] **Step 3: 보안 스모크**

Run: signup/login 응답 및 `/users/me` 응답에 `passwordHash`가 없는지 grep으로 확인.
Expected: 어떤 응답에도 해시/평문 비밀번호 없음.

---

## Self-Review 결과 (작성자 체크)

- **Spec 커버리지:** 구조(Task 0,3,4,5,6) / MFE 독립앱(6.2,6.5) / admin React19(6.1) / TCP 마이크로서비스(3,4,5) / api-gateway 진입점(5) / DB+Prisma 서비스별 스키마(2,3.2,4) / contracts(1) / 보안 argon2·JWT·ValidationPipe·helmet·throttler(4.2,4.3,5.1,5.2) / 샘플 인증 플로우 E2E(5.4,7.2,7.4) / docker-compose(2) / turbo dev(7.1) / README(7.3) — 모든 스펙 항목 대응 태스크 존재.
- **Placeholder 스캔:** 코드 스텝마다 실제 코드 포함. "적절히 처리" 류 없음.
- **타입 일관성:** `@lawai/contracts`의 `PublicUser/AuthTokens/UserWithHash/JwtPayload`와 패턴 상수(`AUTH_PATTERNS/USER_PATTERNS`)를 모든 서비스/프론트에서 동일 이름으로 사용. gateway는 `UserWithHash` 수신 후 공개 필드만 추려 `PublicUser` 반환(해시 차단) — 일관됨.
- **범위:** 단일 스켈레톤+인증 플로우로 한정. RBAC/CRUD/브로커 등은 스펙의 "범위 밖"과 일치하게 제외.
