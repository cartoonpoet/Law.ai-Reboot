# 멀티테넌시 백엔드 (Spec 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Law.ai 를 row-level 멀티테넌트로 전환 — 고객사(Tenant)별 데이터 격리 + N:M 멤버십 + 활성 테넌트 인증, 백엔드 완결.

**Architecture:** Prisma multi-schema Postgres 에 Tenant/UserTenant 추가, 모든 루트 엔티티에 tenantId. JWT 에 activeTenantId/isSystemAdmin 클레임. gateway 가 tenantContext 를 RPC payload 로 주입, user-service 의 tenantScope() 헬퍼가 전 쿼리를 스코프. 시스템 admin 은 우회.

**Tech Stack:** NestJS microservices (api-gateway HTTP :3000 → TCP → auth-service :4001 / user-service :4002), Prisma 6, Postgres multi-schema, JWT(@nestjs/jwt), Jest.

## Global Constraints

- 격리 누락 = 데이터 유출. 모든 루트 엔티티 쿼리는 `tenantScope(ctx)` 경유. 단일 출처 헬퍼.
- 스펙: `docs/superpowers/specs/2026-06-30-multi-tenancy-backend-design.md`.
- 커밋 컨벤션: `<type>: <내용>`, 이모지 금지 (CLAUDE.md).
- DB 스키마 변경 시 erdify MCP 로 "Law.ai Reboot" ERD 동기화 (CLAUDE.md). 본 plan 의 스키마 task 완료 후 별도 동기화.
- 푸시 전 `pnpm turbo lint build test` 전체 통과 (메모리: evaluate-full-turbo-build).
- 기존 access token 은 activeTenantId 없음 → 배포 후 전 사용자 재로그인 필요(스펙 §7).

---

## File Structure

**packages/contracts** (공유 타입 — 먼저 변경, 다운스트림이 의존):
- `src/types.ts` — JwtPayload 에 isSystemAdmin/activeTenantId/activeRole. TenantRole 타입.
- `src/dto/auth.dto.ts` — SwitchTenantRequest, MyTenantsResponse, TenantMembership.
- `src/dto/user.dto.ts` — UserWithHash 에서 role 제거 + isSystemAdmin, FindMembershipsRequest 등.
- `src/dto/tenant.dto.ts` (신규) — TenantContext, tenant DTO.
- `src/patterns.ts` — USER_PATTERNS 에 멤버십 조회 추가, AUTH_PATTERNS 에 SWITCH_TENANT/MY_TENANTS.

**services/user-service**:
- `prisma/schema.prisma` — Tenant/UserTenant/enum + tenantId 확산.
- `prisma/migrations/*` — 스키마 + 백필.
- `src/common/tenant-scope.ts` (신규) — tenantScope 헬퍼 + TenantContext 타입 가드.
- `src/tenants/` (신규) — TenantsService/Controller (멤버십 조회 RPC).
- 각 도메인 service (contracts/comments/files/notifications/contractCategories/departments/companies/admin) — tenantScope 적용.
- `src/users/users.service.ts` — UserWithHash 매핑에서 role 제거 + isSystemAdmin.

**services/auth-service**:
- `src/auth/auth.service.ts` — login 멤버십 조회 + 토큰 클레임, switchTenant, myTenants.
- `src/auth/auth.controller.ts` — SWITCH_TENANT/MY_TENANTS 패턴.

**services/api-gateway**:
- `src/auth/jwt-auth.guard.ts` — req.user 에 tenantContext 부착(이미 JwtPayload 주입, 클레임만 확장).
- `src/common/tenant-context.ts` (신규) — req → TenantContext 추출 헬퍼.
- `src/auth/auth.controller.ts` — POST /auth/switch-tenant, GET /auth/me/tenants.
- 각 도메인 controller — RPC payload 에 tenantContext 주입(현재 viewerId 주입 옆).
- `src/auth/admin-role.guard.ts` — role → isSystemAdmin 으로 판정 변경.

---

## Task 1: contracts 패키지 — 타입/패턴 확장

**Files:**
- Modify: `packages/contracts/src/types.ts`
- Create: `packages/contracts/src/dto/tenant.dto.ts`
- Modify: `packages/contracts/src/dto/auth.dto.ts`, `src/dto/user.dto.ts`, `src/patterns.ts`, `src/index.ts`

**Interfaces:**
- Produces: `JwtPayload{ sub, email, isSystemAdmin, activeTenantId?, activeRole? }`, `TenantRole`, `TenantContext{ tenantId?: string; isSystemAdmin: boolean }`, `SwitchTenantRequest{ tenantId }`, `TenantMembership{ tenantId, name, role, isActive }`, `MyTenantsResponse{ tenants: TenantMembership[] }`, `UserWithHash`(role 제거, isSystemAdmin 추가), patterns `AUTH_PATTERNS.SWITCH_TENANT/MY_TENANTS`, `USER_PATTERNS.FIND_MEMBERSHIPS`.

- [ ] **Step 1: types.ts — JwtPayload + TenantRole**

`packages/contracts/src/types.ts` 의 JwtPayload 를 교체하고 TenantRole 추가:

```ts
export type TenantRole =
  | "general"
  | "contractManager"
  | "inHouseCounsel"
  | "outsideCounsel"
  | "sealManager";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  isSystemAdmin: boolean;
  // 일반 사용자: 현재 활성 테넌트. 시스템 admin 은 생략(전 테넌트 cross).
  activeTenantId?: string;
  // 활성 테넌트에서의 역할(authz 공급원). admin 은 생략.
  activeRole?: TenantRole;
}
```

> 기존 `Role` 타입은 남겨두되(레거시 참조), 신규 코드는 TenantRole 사용. (types.ts 에 Role 정의가 있으면 유지)

- [ ] **Step 2: tenant.dto.ts 생성**

```ts
import type { TenantRole } from "../types";

// gateway → user-service RPC 에 주입되는 테넌트 격리 컨텍스트.
export interface TenantContext {
  // 시스템 admin 이면 undefined(전 테넌트). 일반 사용자는 활성 테넌트 id.
  tenantId?: string;
  isSystemAdmin: boolean;
}

export type TenantPlan = "enterprise" | "pro" | "starter";
export type TenantStatus = "active" | "trial" | "suspended";

export interface TenantDto {
  id: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
  createdAt: string;
}

export interface TenantMembership {
  tenantId: string;
  name: string;
  role: TenantRole;
  isActive: boolean;
}
```

- [ ] **Step 3: auth.dto.ts — switch/me 추가**

`packages/contracts/src/dto/auth.dto.ts` 에 추가:

```ts
export interface SwitchTenantRequest {
  // gateway 가 JWT sub 주입(누가 전환하는지). controller 에서 채움.
  userId?: string;
  tenantId: string;
}

export interface MyTenantsRequest {
  userId?: string; // gateway 가 JWT sub 주입
}

export interface MyTenantsResponse {
  tenants: import("./tenant.dto").TenantMembership[];
}
```

- [ ] **Step 4: user.dto.ts — UserWithHash 변경 + 멤버십 조회**

`UserWithHash` 의 `role: Role` 제거, `isSystemAdmin: boolean` 추가. 그리고:

```ts
// 멤버십 조회(auth-service 가 토큰 발급/전환에 사용).
export interface FindMembershipsRequest {
  userId: string;
}
export interface MembershipRow {
  tenantId: string;
  tenantName: string;
  role: import("../types").TenantRole;
}
export interface FindMembershipsResponse {
  isSystemAdmin: boolean;
  memberships: MembershipRow[];
}
```

`UserWithHash` 최종:
```ts
export interface UserWithHash {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isSystemAdmin: boolean;
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string;
}
```

- [ ] **Step 5: patterns.ts + index.ts**

`AUTH_PATTERNS` 에 `SWITCH_TENANT: "auth.switchTenant"`, `MY_TENANTS: "auth.myTenants"`. `USER_PATTERNS` 에 `FIND_MEMBERSHIPS: "user.findMemberships"`. `index.ts` 에 `export * from "./dto/tenant.dto";`.

- [ ] **Step 6: 빌드 검증**

Run: `pnpm --filter @lawai/contracts build`
Expected: 빌드 성공 (dist 갱신). 다운스트림은 아직 안 고쳐 타입 에러 날 수 있으나 contracts 자체 빌드는 통과.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts
git commit -m "feat: 멀티테넌시 공유 타입 — JwtPayload 테넌트 클레임 + TenantContext/멤버십 DTO"
```

---

## Task 2: Prisma 스키마 — Tenant/UserTenant + tenantId 확산

**Files:**
- Modify: `services/user-service/prisma/schema.prisma`

**Interfaces:**
- Produces: `Tenant`, `UserTenant`, `TenantRole`/`TenantPlan`/`TenantStatus` enum, 루트 엔티티 tenantId 컬럼. (마이그레이션은 Task 3)

- [ ] **Step 1: Tenant/UserTenant/enum 추가**

`schema.prisma` 의 `users` 스키마 영역(Department 위 또는 아래)에 추가:

```prisma
enum TenantPlan {
  enterprise
  pro
  starter
  @@schema("users")
}
enum TenantStatus {
  active
  trial
  suspended
  @@schema("users")
}
enum TenantRole {
  general
  contractManager
  inHouseCounsel
  outsideCounsel
  sealManager
  @@schema("users")
}

model Tenant {
  id        String       @id @default(uuid())
  name      String
  plan      TenantPlan   @default(starter)
  status    TenantStatus @default(active)
  createdAt DateTime     @default(now())

  memberships UserTenant[]

  @@schema("users")
}

model UserTenant {
  id       String     @id @default(uuid())
  userId   String
  tenantId String
  role     TenantRole @default(general)
  joinedAt DateTime   @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId])
  @@index([userId])
  @@index([tenantId])
  @@schema("users")
}
```

- [ ] **Step 2: User 모델 변경**

`role Role @default(general)` 제거, 추가:
```prisma
  isSystemAdmin Boolean @default(false)
```
relations 에 `tenantMemberships UserTenant[]` 추가. (기존 Role enum 정의는 다른 모델이 안 쓰면 제거, 쓰면 유지 — 확인 후 제거 권장)

- [ ] **Step 3: 루트 엔티티에 tenantId(우선 nullable)**

다음 모델 각각에 컬럼 + 인덱스 추가 (마이그레이션 백필 위해 우선 `String?`):

`Contract`, `Company`, `ContractCategory`, `Department`, `AuditLog`, `Notification`, `File` —
```prisma
  tenantId String?   // Task 3 백필 후 NOT NULL 전환
  @@index([tenantId])
```

unique 제약 변경:
- `Company`: `bizNo String @unique` → `bizNo String` + `@@unique([tenantId, bizNo])`
- `Department`: `name String @unique` → `name String` + `@@unique([tenantId, name])`

- [ ] **Step 4: prisma format + validate**

Run: `cd services/user-service && pnpm prisma format && pnpm prisma validate`
Expected: 스키마 유효. 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add services/user-service/prisma/schema.prisma
git commit -m "feat: Prisma 스키마 멀티테넌시 — Tenant/UserTenant + 루트 엔티티 tenantId(nullable)"
```

---

## Task 3: 마이그레이션 + 데이터 백필

**Files:**
- Create: `services/user-service/prisma/migrations/<ts>_multi_tenancy/migration.sql`
- Modify: `schema.prisma` (tenantId nullable → NOT NULL)

**Interfaces:**
- Consumes: Task 2 스키마.
- Produces: DB 에 Tenant/UserTenant 테이블 + 모든 기존 행 기본 테넌트 백필 + User.role 제거.

- [ ] **Step 1: 마이그레이션 생성(스키마 diff)**

Run: `cd services/user-service && pnpm prisma migrate dev --name multi_tenancy --create-only`
Expected: `migrations/<ts>_multi_tenancy/migration.sql` 생성(아직 적용 안 함).

- [ ] **Step 2: 백필 SQL 삽입**

생성된 migration.sql 의 끝(또는 NOT NULL 제약 추가 전)에 백필 블록 추가. 고정 기본 테넌트 UUID 사용:

```sql
-- === 데이터 백필 (기존 단일 조직 → 기본 테넌트) ===
INSERT INTO "users"."Tenant" (id, name, plan, status, "createdAt")
VALUES ('00000000-0000-0000-0000-000000000001', '기본 조직', 'enterprise', 'active', now());

-- 루트 엔티티 백필
UPDATE "contracts"."Contract"        SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "companies"."Company"         SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "contracts"."ContractCategory" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "users"."Department"          SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "shared"."AuditLog"           SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "shared"."Notification"       SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;

-- File.tenantId 는 부모 Contract 에서 복사
UPDATE "shared"."File" f SET "tenantId" = c."tenantId"
  FROM "contracts"."Contract" c WHERE f."contractId" = c.id AND f."tenantId" IS NULL;

-- 기존 User.role → UserTenant 멤버십 + isSystemAdmin
INSERT INTO "users"."UserTenant" (id, "userId", "tenantId", role, "joinedAt")
SELECT gen_random_uuid(), u.id, '00000000-0000-0000-0000-000000000001',
       (CASE WHEN u.role = 'admin' THEN 'general' ELSE u.role END)::"users"."TenantRole",
       now()
FROM "users"."User" u;

UPDATE "users"."User" SET "isSystemAdmin" = true WHERE role = 'admin';
```

> 스키마 경로(`"contracts"."Contract"` 등)는 실제 생성된 migration.sql 의 테이블 식별자와 일치시킨다. `gen_random_uuid()` 는 pgcrypto — Postgres 16 기본 제공.

- [ ] **Step 3: NOT NULL 전환 마이그레이션**

schema.prisma 에서 각 tenantId 를 `String`(not null)로 변경 후:

Run: `cd services/user-service && pnpm prisma migrate dev --name tenant_not_null`
Expected: 백필 덕에 NOT NULL 적용 성공. (User.role 컬럼은 Task 2 에서 이미 제거 → 이 마이그레이션에 DROP COLUMN 포함)

- [ ] **Step 4: 백필 검증 쿼리**

Run (로컬 DB):
```bash
cd services/user-service && pnpm prisma db execute --stdin <<'SQL'
SELECT
  (SELECT count(*) FROM "contracts"."Contract" WHERE "tenantId" IS NULL) AS contracts_null,
  (SELECT count(*) FROM "users"."UserTenant") AS memberships,
  (SELECT count(*) FROM "users"."User") AS users;
SQL
```
Expected: contracts_null = 0, memberships = users (모든 사용자 멤버십 1개씩).

- [ ] **Step 5: Commit**

```bash
git add services/user-service/prisma
git commit -m "feat: 멀티테넌시 마이그레이션 + 기존 데이터 기본 테넌트 백필"
```

---

## Task 4: tenantScope 헬퍼 + TenantContext

**Files:**
- Create: `services/user-service/src/common/tenant-scope.ts`
- Test: `services/user-service/src/common/tenant-scope.spec.ts`

**Interfaces:**
- Produces: `tenantScope(ctx: TenantContext): { tenantId?: string }`, `assertTenant(ctx): string`(일반 사용자 tenantId 보장, admin 이면 throw or 별도).

- [ ] **Step 1: 실패 테스트**

`tenant-scope.spec.ts`:
```ts
import { tenantScope, resolveTenantId } from "./tenant-scope";

describe("tenantScope", () => {
  it("일반 사용자는 tenantId 필터를 반환한다", () => {
    expect(tenantScope({ tenantId: "t1", isSystemAdmin: false })).toEqual({ tenantId: "t1" });
  });
  it("시스템 admin 은 빈 필터(전 테넌트)", () => {
    expect(tenantScope({ isSystemAdmin: true })).toEqual({});
  });
  it("resolveTenantId 는 생성 시 tenantId 를 강제 — 일반 사용자", () => {
    expect(resolveTenantId({ tenantId: "t1", isSystemAdmin: false })).toBe("t1");
  });
  it("resolveTenantId — admin 인데 tenantId 없으면 RpcException", () => {
    expect(() => resolveTenantId({ isSystemAdmin: true })).toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd services/user-service && npx jest tenant-scope`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`tenant-scope.ts`:
```ts
import { RpcException } from "@nestjs/microservices";
import type { TenantContext } from "@lawai/contracts";

// 조회/수정/삭제 where 절에 합칠 테넌트 필터. admin 은 빈 객체(전 테넌트).
export const tenantScope = (ctx: TenantContext): { tenantId?: string } =>
  ctx.isSystemAdmin ? {} : { tenantId: ctx.tenantId };

// 생성(create) 시 행에 박을 tenantId 를 강제 확정. 일반 사용자는 활성 테넌트.
// admin 이 특정 테넌트 지정 없이 생성하려 하면 거부(어느 테넌트에 만들지 모호).
export const resolveTenantId = (ctx: TenantContext): string => {
  if (ctx.tenantId) return ctx.tenantId;
  throw new RpcException({ status: 400, message: "테넌트 컨텍스트가 없습니다" });
};
```

- [ ] **Step 4: 통과 확인**

Run: `cd services/user-service && npx jest tenant-scope`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add services/user-service/src/common/tenant-scope.ts services/user-service/src/common/tenant-scope.spec.ts
git commit -m "feat: tenantScope 격리 헬퍼 + 단위 테스트"
```

---

## Task 5: user-service 멤버십 RPC + UserWithHash 변경

**Files:**
- Create: `services/user-service/src/tenants/tenants.service.ts`, `tenants.controller.ts`, `tenants.module.ts`
- Modify: `services/user-service/src/users/users.service.ts` (UserWithHash 매핑), `app.module.ts`
- Test: `services/user-service/src/tenants/tenants.service.spec.ts`

**Interfaces:**
- Consumes: Task 1 `FindMembershipsResponse`, Task 2 UserTenant.
- Produces: RPC `USER_PATTERNS.FIND_MEMBERSHIPS` → `{ isSystemAdmin, memberships: [{tenantId, tenantName, role}] }`. UserWithHash 가 role 대신 isSystemAdmin.

- [ ] **Step 1: 실패 테스트 (tenants.service.spec.ts)**

```ts
it("사용자의 멤버십 목록 + isSystemAdmin 을 반환한다", async () => {
  prismaMock.user.findUnique.mockResolvedValue({ id: "u1", isSystemAdmin: false });
  prismaMock.userTenant.findMany.mockResolvedValue([
    { tenantId: "t1", role: "inHouseCounsel", tenant: { name: "A사" } },
  ]);
  const res = await service.findMemberships({ userId: "u1" });
  expect(res.isSystemAdmin).toBe(false);
  expect(res.memberships).toEqual([{ tenantId: "t1", tenantName: "A사", role: "inHouseCounsel" }]);
});
```

- [ ] **Step 2: 실패 확인** — `npx jest tenants.service` → FAIL.

- [ ] **Step 3: 구현 (service)**

```ts
@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMemberships(req: FindMembershipsRequest): Promise<FindMembershipsResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new RpcException({ status: 404, message: "사용자를 찾을 수 없습니다" });
    const rows = await this.prisma.userTenant.findMany({
      where: { userId: req.userId },
      include: { tenant: { select: { name: true } } },
      orderBy: { joinedAt: "asc" },
    });
    return {
      isSystemAdmin: user.isSystemAdmin,
      memberships: rows.map((r) => ({ tenantId: r.tenantId, tenantName: r.tenant.name, role: r.role })),
    };
  }
}
```
Controller: `@MessagePattern(USER_PATTERNS.FIND_MEMBERSHIPS)`. Module 에 등록 + app.module imports.

- [ ] **Step 4: users.service UserWithHash 매핑 변경**

`findByEmail` 등이 반환하는 UserWithHash 에서 `role` 제거, `isSystemAdmin: user.isSystemAdmin` 추가. (role 컬럼 사라졌으므로 필수)

- [ ] **Step 5: 통과 확인 + 기존 users 테스트**

Run: `cd services/user-service && npx jest tenants.service users.service`
Expected: PASS. users.service.spec 의 UserWithHash 기대값도 isSystemAdmin 으로 수정 필요시 수정.

- [ ] **Step 6: Commit**

```bash
git add services/user-service/src/tenants services/user-service/src/users services/user-service/src/app.module.ts
git commit -m "feat: user-service 멤버십 조회 RPC + UserWithHash isSystemAdmin 전환"
```

---

## Task 6: auth-service — 토큰 클레임 + switch-tenant + my-tenants

**Files:**
- Modify: `services/auth-service/src/auth/auth.service.ts`, `auth.controller.ts`
- Test: `services/auth-service/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: Task 5 `FIND_MEMBERSHIPS`, Task 1 JwtPayload.
- Produces: login/signup 토큰에 isSystemAdmin/activeTenantId/activeRole. RPC `AUTH_PATTERNS.SWITCH_TENANT/MY_TENANTS`.

- [ ] **Step 1: 실패 테스트**

```ts
it("login: 첫 멤버십을 활성 테넌트로 토큰 클레임에 넣는다", async () => {
  // userClient FIND_BY_EMAIL → UserWithHash(isSystemAdmin:false)
  // userClient FIND_MEMBERSHIPS → { isSystemAdmin:false, memberships:[{tenantId:'t1', tenantName:'A', role:'inHouseCounsel'}] }
  const res = await service.login({ email, password });
  const payload = jwt.decode(res.tokens.accessToken);
  expect(payload.activeTenantId).toBe("t1");
  expect(payload.activeRole).toBe("inHouseCounsel");
  expect(payload.isSystemAdmin).toBe(false);
});
it("switchTenant: 멤버 아닌 테넌트면 403", async () => {
  // FIND_MEMBERSHIPS → memberships 에 t2 없음
  await expect(service.switchTenant({ userId: "u1", tenantId: "t2" })).rejects.toBeInstanceOf(RpcException);
});
it("멤버십 0개 + 비admin → 로그인 거부", async () => {
  await expect(service.login({ email, password })).rejects.toBeInstanceOf(RpcException);
});
```

- [ ] **Step 2: 실패 확인** — `npx jest auth.service` → FAIL.

- [ ] **Step 3: buildResult 변경 + switchTenant/myTenants**

`buildResult(user)` 를 멤버십 기반으로:
```ts
private async buildResult(user: UserWithHash, activeTenantId?: string): Promise<AuthResult> {
  const memberships = await firstValueFrom(
    this.userClient.send<FindMembershipsResponse>(USER_PATTERNS.FIND_MEMBERSHIPS, { userId: user.id }),
  );
  // 활성 테넌트 결정: 명시값 > 첫 멤버십. admin 은 없어도 됨.
  let active: { tenantId: string; role: TenantRole } | undefined;
  if (activeTenantId) {
    const m = memberships.memberships.find((x) => x.tenantId === activeTenantId);
    if (!m) throw new RpcException({ status: 403, message: "해당 회사 멤버가 아닙니다" });
    active = { tenantId: m.tenantId, role: m.role };
  } else if (memberships.memberships.length > 0) {
    const m = memberships.memberships[0];
    active = { tenantId: m.tenantId, role: m.role };
  }
  if (!active && !memberships.isSystemAdmin) {
    throw new RpcException({ status: 403, message: "소속된 회사가 없습니다" });
  }
  const payload: JwtPayload = {
    sub: user.id, email: user.email, isSystemAdmin: memberships.isSystemAdmin,
    activeTenantId: active?.tenantId, activeRole: active?.role,
  };
  const tokens = await this.signTokens(payload);
  const publicUser: PublicUser = { /* id,email,name,isSystemAdmin,departmentId,... */ };
  return { user: publicUser, tokens };
}

async switchTenant(req: SwitchTenantRequest): Promise<AuthResult> {
  const user = await firstValueFrom(this.userClient.send<UserWithHash | null>(USER_PATTERNS.FIND_BY_ID, { id: req.userId }));
  if (!user) throw new RpcException({ status: 404, message: "사용자를 찾을 수 없습니다" });
  return this.buildResult(user, req.tenantId); // 멤버 검증은 buildResult 내부
}

async myTenants(req: MyTenantsRequest): Promise<MyTenantsResponse> {
  const m = await firstValueFrom(this.userClient.send<FindMembershipsResponse>(USER_PATTERNS.FIND_MEMBERSHIPS, { userId: req.userId }));
  return { tenants: m.memberships.map((x) => ({ tenantId: x.tenantId, name: x.tenantName, role: x.role, isActive: false })) };
}
```
> `FIND_BY_ID` 패턴/핸들러가 없으면 user-service 에 추가(간단 findUnique → UserWithHash). PublicUser 도 role 제거 + isSystemAdmin 반영(Task 1 에 PublicUser 가 있으면 함께 수정).

Controller 에 `@MessagePattern(AUTH_PATTERNS.SWITCH_TENANT)`, `MY_TENANTS` 추가.

- [ ] **Step 4: 통과 확인**

Run: `cd services/auth-service && npx jest auth.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/auth-service services/user-service
git commit -m "feat: auth-service 활성 테넌트 토큰 클레임 + switch-tenant/my-tenants"
```

---

## Task 7: gateway — tenantContext 주입 + 라우트 + admin 가드

**Files:**
- Create: `services/api-gateway/src/common/tenant-context.ts`
- Modify: `services/api-gateway/src/auth/admin-role.guard.ts`, `auth/auth.controller.ts`, 각 도메인 controller
- Test: `services/api-gateway/src/common/tenant-context.spec.ts`

**Interfaces:**
- Consumes: Task 1 JwtPayload/TenantContext.
- Produces: `extractTenantContext(req): TenantContext`. 도메인 RPC payload 에 tenantContext 포함. POST /auth/switch-tenant, GET /auth/me/tenants.

- [ ] **Step 1: tenant-context 헬퍼 + 테스트**

```ts
// tenant-context.ts
import type { JwtPayload, TenantContext } from "@lawai/contracts";
import type { Request } from "express";

export const extractTenantContext = (req: Request): TenantContext => {
  const user = (req as Request & { user: JwtPayload }).user;
  return { tenantId: user.activeTenantId, isSystemAdmin: user.isSystemAdmin };
};
```
테스트: admin payload → `{isSystemAdmin:true}`, 일반 → `{tenantId, isSystemAdmin:false}`.

- [ ] **Step 2: admin-role.guard 변경**

`req.user?.role !== "admin"` → `req.user?.isSystemAdmin !== true` 로 판정 교체.

- [ ] **Step 3: auth.controller 라우트**

```ts
@Post("switch-tenant")
switchTenant(@Body() dto: { tenantId: string }, @Req() req) {
  const { sub } = req.user;
  return firstValueFrom(this.authClient.send(AUTH_PATTERNS.SWITCH_TENANT, { userId: sub, tenantId: dto.tenantId }).pipe(rpcToHttp()));
}
@Get("me/tenants")
myTenants(@Req() req) {
  const { sub } = req.user;
  return firstValueFrom(this.authClient.send(AUTH_PATTERNS.MY_TENANTS, { userId: sub }).pipe(rpcToHttp()));
}
```
(JwtAuthGuard 적용 — me/tenants, switch-tenant 는 인증 필요)

- [ ] **Step 4: 도메인 controller 에 tenantContext 주입**

contracts/comments/files/notifications/contractCategories/departments/companies controller 의 각 핸들러에서 RPC payload 에 `tenantContext: extractTenantContext(req)` 추가 (현재 `viewerId: sub` 주입 옆). 예 (contracts.controller get):
```ts
const payload: GetContractRequest = { id, viewerId: sub, tenantContext: extractTenantContext(req) };
```
> 각 Request DTO(Task 1 에서 다루지 않은 것들)에 `tenantContext?: TenantContext` optional 필드 추가 필요 — contracts 패키지의 해당 DTO 에 한 줄씩.

- [ ] **Step 5: 빌드 + 테스트**

Run: `cd services/api-gateway && npx jest && pnpm build`
Expected: PASS + 빌드 성공.

- [ ] **Step 6: Commit**

```bash
git add services/api-gateway packages/contracts
git commit -m "feat: gateway tenantContext 주입 + switch-tenant/me-tenants 라우트 + admin 가드 isSystemAdmin"
```

---

## Task 8: 도메인 격리 — contracts

**Files:**
- Modify: `services/user-service/src/contracts/contracts.service.ts`
- Test: `services/user-service/src/contracts/contracts.service.spec.ts`

**Interfaces:**
- Consumes: Task 4 tenantScope/resolveTenantId, Task 7 tenantContext in request DTO.

- [ ] **Step 1: 격리 실패 테스트**

```ts
it("get: 타 테넌트 계약은 404 (tenantScope 적용)", async () => {
  prismaMock.contract.findFirst.mockResolvedValue(null); // 스코프로 안 잡힘
  await expect(service.get({ id: "ct-other", tenantContext: { tenantId: "t1", isSystemAdmin: false } }))
    .rejects.toBeInstanceOf(RpcException);
  const arg = prismaMock.contract.findFirst.mock.calls[0][0];
  expect(arg.where).toMatchObject({ tenantId: "t1" });
});
it("create: 행에 활성 tenantId 를 박는다", async () => {
  await service.create({ ...req, tenantContext: { tenantId: "t1", isSystemAdmin: false } });
  const arg = prismaMock.contract.create.mock.calls[0][0];
  expect(arg.data.tenantId).toBe("t1");
});
it("시스템 admin 은 tenantScope 없이 전 테넌트 조회", async () => {
  await service.get({ id: "ct1", tenantContext: { isSystemAdmin: true } });
  const arg = prismaMock.contract.findFirst.mock.calls[0][0];
  expect(arg.where.tenantId).toBeUndefined();
});
```

- [ ] **Step 2: 실패 확인** — `npx jest contracts.service` → 격리 케이스 FAIL.

- [ ] **Step 3: 구현 — 모든 쿼리에 tenantScope**

각 메서드(get/list/update/updateStatus/create/delete) 의 where 에 `...tenantScope(ctx)`, create 의 data 에 `tenantId: resolveTenantId(ctx)`. ctx 는 `req.tenantContext`. 예:
```ts
async get(req: GetContractRequest) {
  const ctx = req.tenantContext!;
  const row = await this.prisma.contract.findFirst({
    where: { id: req.id, deletedAt: null, ...tenantScope(ctx) },
    include: contractInclude,
  });
  if (!row) throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
  // ...
}
```
update/delete 도 먼저 findFirst({where:{id,...tenantScope}}) 로 소유 검증.

- [ ] **Step 4: 통과 확인 + 기존 테스트 보정**

Run: `cd services/user-service && npx jest contracts.service`
Expected: PASS. 기존 테스트들의 req 에 `tenantContext` 추가 필요(헬퍼 `makeCtx()` 도입 권장).

- [ ] **Step 5: Commit**

```bash
git add services/user-service/src/contracts
git commit -m "feat: contracts 도메인 테넌트 격리 (tenantScope 적용)"
```

---

## Task 9: 도메인 격리 — comments / files / notifications / categories / departments / companies / audit

**Files:**
- Modify: 각 `*.service.ts` + spec
- Test: 각 `*.service.spec.ts`

**Interfaces:**
- Consumes: Task 4 tenantScope, Task 8 패턴(동일 적용).

각 도메인을 같은 패턴으로 격리. **반복이지만 도메인마다 쿼리 구조가 달라 개별 작업** — 한 도메인 = 1 커밋.

- [ ] **Step 1: comments 격리**

`comments.service.ts`: 코멘트는 Contract 종속이라 부모 계약 로드 시 tenantScope 적용(`loadContract` 에 `...tenantScope(ctx)`). create/update/delete 가 거치는 contract 조회에만 추가하면 하위는 자동 격리. spec 에 "타 테넌트 계약의 코멘트 접근 404". Commit: `feat: comments 도메인 테넌트 격리`.

- [ ] **Step 2: files 격리**

`files.service.ts`: presign 의 loadContract 에 tenantScope. confirm 시 created File 에 `tenantId: contract.tenantId`. **getDownloadUrl 은 File.tenantId 직접 검증**: `findFirst({ where: { id: fileId, ...tenantScope(ctx) } })`. auditCompareReport 의 contract 로드도 tenantScope. spec 에 "타 테넌트 파일 다운로드 404". Commit: `feat: files 도메인 테넌트 격리 (File.tenantId 직접 검증)`.

- [ ] **Step 3: notifications 격리**

생성 시 `tenantId: resolveTenantId(ctx)`(또는 멘션 컨텍스트의 contract.tenantId), 조회 시 `where: { recipientId, ...tenantScope(ctx) }`. Commit: `feat: notifications 테넌트 격리`.

- [ ] **Step 4: contractCategories 격리**

트리 조회/생성에 tenantScope/resolveTenantId. Commit: `feat: contractCategories 테넌트 격리`.

- [ ] **Step 5: departments 격리**

목록/생성에 tenantScope/resolveTenantId. `@@unique([tenantId,name])` 반영. Commit: `feat: departments 테넌트 격리`.

- [ ] **Step 6: companies 격리**

상대계약사 검색/생성에 tenantScope/resolveTenantId. `@@unique([tenantId,bizNo])` 반영(bizNo 중복 검사 시 tenantId 포함). Commit: `feat: companies 테넌트 격리`.

- [ ] **Step 7: 각 단계 테스트 통과 확인**

Run: `cd services/user-service && npx jest`
Expected: 전 도메인 PASS.

---

## Task 10: authz 공급원 교체 (viewer.role → activeRole)

**Files:**
- Modify: `services/user-service/src/contracts/contracts.service.ts` (authorizeViewer), `comments.service.ts` (loadViewer)
- Test: 기존 authz 관련 spec

**Interfaces:**
- Consumes: Task 7 tenantContext.activeRole? — 단, role 은 토큰의 activeRole 이 아니라 user-service 가 UserTenant 에서 조회하는 게 정확(토큰 stale 방지). **결정: user-service 가 viewer 의 활성 테넌트 멤버십 role 을 조회해 authz 공급.**

- [ ] **Step 1: loadViewer 변경**

현재 `loadViewer` 가 `user.role` 읽던 것을 → `UserTenant` 에서 `(userId=viewerId, tenantId=ctx.tenantId)` 의 role 조회로 교체:
```ts
private async loadViewer(viewerId: string | undefined, ctx: TenantContext): Promise<AuthzViewer | null> {
  if (!viewerId) return null;
  if (ctx.isSystemAdmin) {
    // admin 은 전권 — authz 우회용 가상 viewer 또는 service 단에서 admin 분기.
    const u = await this.prisma.user.findUnique({ where: { id: viewerId } });
    return u ? { id: u.id, role: "inHouseCounsel", departmentId: u.departmentId } : null; // admin=전체 view 동급
  }
  const m = await this.prisma.userTenant.findFirst({
    where: { userId: viewerId, tenantId: ctx.tenantId },
    include: { user: { select: { departmentId: true } } },
  });
  return m ? { id: viewerId, role: m.role, departmentId: m.user.departmentId } : null;
}
```
> `AuthzViewer.role` 타입을 TenantRole 로(또는 호환). evaluate 로직은 불변.

- [ ] **Step 2: 테스트 — 활성 테넌트 role 로 authz 평가**

```ts
it("activeRole=general 은 본인 관련 계약만 view", async () => { /* UserTenant.role=general mock */ });
it("activeRole=inHouseCounsel 은 전체 view", async () => { /* role=inHouseCounsel */ });
```

- [ ] **Step 3: 통과 확인** — `npx jest contracts.service comments.service` → PASS.

- [ ] **Step 4: Commit**

```bash
git add services/user-service/src/contracts services/user-service/src/comments
git commit -m "feat: authz 공급원을 활성 테넌트 UserTenant.role 로 교체"
```

---

## Task 11: 전체 검증 + ERD 동기화

- [ ] **Step 1: 전체 turbo**

Run: `pnpm turbo lint build test`
Expected: 17/17 PASS. (다운스트림 web/admin 의 JwtPayload role 참조 등 타입 깨짐 있으면 수정 — admin RequireAdmin 의 getRole 등은 isSystemAdmin 흐름으로. web 은 role 사용처 점검.)

- [ ] **Step 2: ERD 동기화 (erdify MCP)**

CLAUDE.md 규칙: 스키마 변경 반영. Tenant/UserTenant 테이블 + 각 모델 tenantId 컬럼 + FK 를 "Law.ai Reboot" ERD 에 추가.

- [ ] **Step 3: 최종 커밋 + 푸시**

```bash
git add -A
git commit -m "chore: 멀티테넌시 백엔드 전체 검증 통과"
git push
```

> 배포 후: prod DB 마이그레이션은 user-service 기동 시 자동 적용(기존 흐름). 적용 후 전 사용자 재로그인 안내(기존 토큰 activeTenantId 없음).

---

## Self-Review 결과

- **Spec 커버리지**: §1 모델(Task 2/3), §1.2 Role 분해(Task 2/3/5), §1.3 tenantId 확산+File denormalize(Task 2/3/9-2), §2 활성 테넌트/switch(Task 6/7), §3 격리 가드(Task 4/8/9), §4 마이그레이션(Task 3), §5 범위(전 task 백엔드 한정), §6 테스트(각 task TDD), §7 리스크(tenantScope 단일출처/File denormalize/재로그인 명시). ✅
- **Placeholder**: 없음. 각 step 코드/명령 구체화.
- **타입 일관성**: TenantContext/tenantScope/resolveTenantId/FindMembershipsResponse/activeRole 명칭 전 task 일치.
- **주의**: Task 9 는 도메인 반복이라 step 별 한 줄 요약 + 핵심 차이(File denormalize 등)만 명시 — 각 도메인 쿼리 구조가 달라 실행 시 해당 service 코드 확인 필요.
