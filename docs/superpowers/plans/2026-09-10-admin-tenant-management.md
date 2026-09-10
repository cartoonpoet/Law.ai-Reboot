# Admin 회사별 관리 (Spec 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** admin 콘솔에 고객사 목록/상세 화면과 요금제·상태 변경을 추가하고, suspended 테넌트의 로그인·전환을 차단하며, Tenant.trialEndsAt 을 도입한다.

**Architecture:** 기존 admin 체계(gateway `/admin/*` + AdminRoleGuard → `ADMIN_PATTERNS` RPC → user-service `admin.service`)를 그대로 확장. suspended 효력은 user-service findMemberships 응답에 tenantStatus 를 추가해 auth-service buildResult 가 검사. 프론트는 apps/admin 의 기존 패턴(inline CSSProperties + lawkit + react-query) 사용.

**Tech Stack:** NestJS(마이크로서비스 RPC) + Prisma + jest / React 19 + react-query + @lawkit/ui (admin 앱은 vanilla-extract 강제 없음 — web 전용 컨벤션).

**Spec:** `docs/superpowers/specs/2026-09-10-admin-tenant-management-design.md`

## Global Constraints

- 커밋: `<type>: <내용>`, 이모지 금지.
- 웹(apps/web) 변경 없음. AuditAction enum 확장 없음(기존 `update` 값 사용).
- DB 스키마 변경은 Task 2 의 `Tenant.trialEndsAt DateTime?` 하나뿐 — 변경 후 **erdify MCP 로 "Law.ai Reboot" ERD 동기화 필수**(CLAUDE.md).
- 진행 중 계약 = `status NOT IN (signed, fulfilling, closed)` && `deletedAt: null`. 체결 완료 = `status IN (signed, fulfilling, closed)` && `deletedAt: null`.
- suspended 403 메시지(정확히): `"이용이 정지된 회사입니다. 관리자에게 문의하세요."`
- 테스트: user-service/auth-service 는 `npx jest <파일명>` (해당 서비스 디렉토리), 최종 `pnpm turbo lint build test`.
- admin 프론트는 테스트 인프라 없음 — `pnpm --filter @lawai/admin build` 로 타입 검증.

---

### Task 1: contracts 패키지 확장

**Files:**
- Modify: `packages/contracts/src/patterns.ts` (ADMIN_PATTERNS)
- Modify: `packages/contracts/src/dto/admin.dto.ts`
- Modify: `packages/contracts/src/dto/user.dto.ts` (MembershipRow)

**Interfaces:**
- Consumes: 기존 `TenantPlan`/`TenantStatus`(tenant.dto), `TenantRole`(types), `AdminAuditEntry`(admin.dto).
- Produces: `ADMIN_PATTERNS.LIST_TENANTS|GET_TENANT|UPDATE_TENANT`, `AdminTenantListItem`, `AdminTenantListResponse`, `AdminTenantDetailResponse`, `AdminTenantUpdateRequest`, `MembershipRow.tenantStatus`. Task 3~8 이 사용.

- [ ] **Step 1: patterns.ts — ADMIN_PATTERNS 에 3개 추가**

```ts
export const ADMIN_PATTERNS = {
  // 어드민 대시보드 — 계약/사용자/파일/최근 비교보고서 다운로드 카운트.
  GET_STATS: "admin.getStats",
  // 최근 감사 로그(actor 이름 포함). limit 로 페이지네이션.
  GET_AUDIT: "admin.getAudit",
  // 고객사 목록 + 전체 KPI (Spec 3).
  LIST_TENANTS: "admin.listTenants",
  // 고객사 상세 집계 (Spec 3).
  GET_TENANT: "admin.getTenant",
  // 고객사 요금제/상태/체험판만료 변경 + 감사 기록 (Spec 3).
  UPDATE_TENANT: "admin.updateTenant",
} as const;
```

- [ ] **Step 2: admin.dto.ts — 테넌트 관리 DTO 추가** (파일 끝에 append)

```ts
// ─── Spec 3: 고객사 관리 ─────────────────────────────────────────────

export interface AdminTenantListItem {
  id: string;
  name: string;
  plan: import("./tenant.dto").TenantPlan;
  status: import("./tenant.dto").TenantStatus;
  trialEndsAt: string | null; // status=trial 일 때 체험판 만료 ISO. 아니면 null
  createdAt: string;
  memberCount: number;
  contractCount: number; // deletedAt null 기준
  lastActivityAt: string | null; // 해당 테넌트 AuditLog 최신 at
}

export interface AdminTenantListResponse {
  tenants: AdminTenantListItem[];
  totals: { tenants: number; users: number; contracts: number; trials: number };
}

export interface AdminTenantDetailRequest {
  tenantId: string;
}

export interface AdminTenantDetailResponse {
  tenant: AdminTenantListItem;
  stats: {
    memberCount: number;
    activeContracts: number; // signed 이전 상태(진행 중)
    signedContracts: number; // signed/fulfilling/closed
    storageBytes: number; // storageKey != null 파일 size 합
  };
  roleBreakdown: { role: import("../types").TenantRole; count: number }[];
  recentAudit: AdminAuditEntry[]; // 최근 10건, 이 테넌트만
}

export interface AdminTenantUpdateRequest {
  tenantId?: string; // gateway 가 path param 으로 주입
  plan?: import("./tenant.dto").TenantPlan;
  status?: import("./tenant.dto").TenantStatus;
  trialEndsAt?: string | null; // trial 전환 시 설정, null 로 해제
}
```

- [ ] **Step 3: user.dto.ts — MembershipRow 에 tenantStatus 추가**

```ts
export interface MembershipRow {
  tenantId: string;
  tenantName: string;
  role: import("../types").TenantRole;
  // 테넌트 상태 — auth-service 가 suspended 로그인/전환 차단에 사용 (Spec 3).
  tenantStatus: import("./tenant.dto").TenantStatus;
}
```

- [ ] **Step 4: 빌드 검증**

Run: `pnpm --filter @lawai/contracts build`
Expected: 성공. (user-service 의 findMemberships 가 아직 tenantStatus 를 안 채워 다운스트림 빌드가 깨지는 건 Task 3 에서 해소 — 이 시점엔 contracts 만 빌드.)

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src
git commit -m "feat: 고객사 관리 계약 추가 (admin tenant DTO/패턴 + MembershipRow.tenantStatus)"
```

---

### Task 2: Prisma `Tenant.trialEndsAt` + 마이그레이션 + ERD 동기화

**Files:**
- Modify: `services/user-service/prisma/schema.prisma` (model Tenant, 37행 부근)
- Create: `services/user-service/prisma/migrations/20260910000000_add_tenant_trial_ends_at/migration.sql`

**Interfaces:**
- Produces: `Tenant.trialEndsAt: DateTime?` — Task 5 가 읽고 씀.

- [ ] **Step 1: schema.prisma — Tenant 에 컬럼 추가**

```prisma
model Tenant {
  id          String       @id @default(uuid())
  name        String
  plan        TenantPlan   @default(starter)
  status      TenantStatus @default(active)
  // status=trial 일 때 체험판 만료 시각. active/suspended 면 null 권장(앱 레벨 관리, DB 강제 없음).
  trialEndsAt DateTime?
  createdAt   DateTime     @default(now())

  memberships UserTenant[]

  @@schema("users")
}
```

- [ ] **Step 2: prisma format + validate**

Run: `cd services/user-service && npx prisma format && npx prisma validate`
Expected: 성공.

- [ ] **Step 3: 마이그레이션 SQL 생성** (기존 컨벤션대로 수기 SQL — 로컬 DB 기동 불필요)

`services/user-service/prisma/migrations/20260910000000_add_tenant_trial_ends_at/migration.sql`:

```sql
-- Tenant 체험판 만료 시각 (Spec 3). 기존 행은 NULL 유지(기본 테넌트는 active).
ALTER TABLE "users"."Tenant" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
```

- [ ] **Step 4: prisma generate**

Run: `cd services/user-service && npx prisma generate`
Expected: 성공 (클라이언트 타입에 trialEndsAt 반영).

- [ ] **Step 5: ERD 동기화 — erdify MCP**

CLAUDE.md 규칙: erdify MCP 도구로 **"Law.ai Reboot" ERD** 의 Tenant 테이블에 `trialEndsAt TIMESTAMP NULL` 컬럼을 추가한다. MCP 미로드면 실행자를 재시작해 연결 후 수행. (도구 사용이 불가한 환경이면 이 스텝을 보류로 보고하고 진행 — 최종 보고에 명시.)

- [ ] **Step 6: Commit**

```bash
git add services/user-service/prisma
git commit -m "feat: Tenant.trialEndsAt 컬럼 추가 (체험판 만료 시각)"
```

---

### Task 3: user-service findMemberships → tenantStatus 채움

**Files:**
- Modify: `services/user-service/src/tenants/tenants.service.ts`
- Test: `services/user-service/src/tenants/tenants.service.spec.ts` (기존 테스트 수정)

**Interfaces:**
- Consumes: Task 1 `MembershipRow.tenantStatus`, Task 2 스키마.
- Produces: findMemberships 응답 rows 에 `tenantStatus` — Task 4 가 사용.

- [ ] **Step 1: 실패 테스트 — 기존 spec 의 mock/기대값에 tenantStatus 반영**

`tenants.service.spec.ts` 의 첫 테스트를 다음으로 교체(mock 의 `tenant` 에 status 추가, 기대값에 tenantStatus 추가):

```ts
it("사용자의 멤버십 목록 + isSystemAdmin 을 반환한다", async () => {
  prismaMock.user.findUnique.mockResolvedValue({ id: "u1", isSystemAdmin: false });
  prismaMock.userTenant.findMany.mockResolvedValue([
    { tenantId: "t1", role: "inHouseCounsel", tenant: { name: "A사", status: "active" } },
  ]);
  const res = await service.findMemberships({ userId: "u1" });
  expect(res.isSystemAdmin).toBe(false);
  expect(res.memberships).toEqual([
    { tenantId: "t1", tenantName: "A사", role: "inHouseCounsel", tenantStatus: "active" },
  ]);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd services/user-service && npx jest tenants.service`
Expected: FAIL (tenantStatus 미포함).

- [ ] **Step 3: 구현** — tenants.service.ts 의 findMemberships 수정

```ts
const rows = await this.prisma.userTenant.findMany({
  where: { userId: req.userId },
  include: { tenant: { select: { name: true, status: true } } },
  orderBy: { joinedAt: "asc" },
});
return {
  isSystemAdmin: user.isSystemAdmin,
  memberships: rows.map((r) => ({
    tenantId: r.tenantId,
    tenantName: r.tenant.name,
    role: r.role,
    tenantStatus: r.tenant.status,
  })),
};
```

- [ ] **Step 4: 통과 확인**

Run: `cd services/user-service && npx jest tenants.service`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add services/user-service/src/tenants
git commit -m "feat: findMemberships 응답에 tenantStatus 포함"
```

---

### Task 4: auth-service — suspended 로그인·전환 차단

**Files:**
- Modify: `services/auth-service/src/auth/auth.service.ts` (buildResult)
- Test: `services/auth-service/src/auth/auth.service.spec.ts` (케이스 추가 + 기존 mock 에 tenantStatus 보강)

**Interfaces:**
- Consumes: Task 3 의 `tenantStatus`.
- Produces: 로그인/switch-tenant 의 suspended 403. 이후 task 의존 없음.

- [ ] **Step 1: 기존 mock 데이터 보강**

auth.service.spec.ts 에서 `FIND_MEMBERSHIPS` 가 반환하는 모든 memberships 항목에 `tenantStatus: "active"` 를 추가한다(타입 오류 방지·동작 불변). 예: `{ tenantId: "t1", tenantName: "A사", role: "general", tenantStatus: "active" }`.

- [ ] **Step 2: 실패 테스트 추가** (describe 말미에)

```ts
// ─── suspended 차단 (Spec 3) ──────────────────────────────────────────

const suspendedUser = {
  id: "u9", email: "s@b.com", name: "S", passwordHash: "hashed",
  isSystemAdmin: false, departmentId: null, departmentName: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

it("모든 멤버십이 suspended 면 로그인이 403으로 거부된다", async () => {
  passwords.verify.mockResolvedValue(true);
  userClient.send.mockImplementation((pattern: string) => {
    if (pattern === USER_PATTERNS.FIND_BY_EMAIL) return of(suspendedUser);
    if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
      return of({
        isSystemAdmin: false,
        memberships: [
          { tenantId: "t1", tenantName: "정지사", role: "general", tenantStatus: "suspended" },
        ],
      });
    }
    return of(null);
  });
  await expect(
    service.login({ email: "s@b.com", password: "pw" }),
  ).rejects.toMatchObject({
    error: expect.objectContaining({ message: "이용이 정지된 회사입니다. 관리자에게 문의하세요." }),
  });
});

it("suspended 와 active 가 섞이면 active 쪽을 활성 테넌트로 선택한다", async () => {
  passwords.verify.mockResolvedValue(true);
  userClient.send.mockImplementation((pattern: string) => {
    if (pattern === USER_PATTERNS.FIND_BY_EMAIL) return of(suspendedUser);
    if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
      return of({
        isSystemAdmin: false,
        memberships: [
          { tenantId: "t1", tenantName: "정지사", role: "general", tenantStatus: "suspended" },
          { tenantId: "t2", tenantName: "정상사", role: "general", tenantStatus: "active" },
        ],
      });
    }
    return of(null);
  });
  jwtMock.signAsync.mockResolvedValue("token");

  await service.login({ email: "s@b.com", password: "pw" });

  // 첫 signAsync 호출의 payload 에 activeTenantId=t2 (suspended t1 건너뜀)
  expect(jwtMock.signAsync.mock.calls[0][0]).toMatchObject({ activeTenantId: "t2" });
});

it("suspended 테넌트로 switch-tenant 하면 403", async () => {
  userClient.send.mockImplementation((pattern: string) => {
    if (pattern === USER_PATTERNS.FIND_BY_ID) return of(suspendedUser);
    if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
      return of({
        isSystemAdmin: false,
        memberships: [
          { tenantId: "t1", tenantName: "정지사", role: "general", tenantStatus: "suspended" },
          { tenantId: "t2", tenantName: "정상사", role: "general", tenantStatus: "active" },
        ],
      });
    }
    return of(null);
  });
  await expect(
    service.switchTenant({ userId: "u9", tenantId: "t1" }),
  ).rejects.toBeInstanceOf(RpcException);
});
```

> RpcException 의 메시지 접근 형태가 기존 spec 과 다르면(예: `rejects.toBeInstanceOf(RpcException)` 만 쓰는 스타일) 기존 스타일을 따르되, 첫 테스트는 메시지까지 검증한다(`(e.getError() as { message: string }).message` 패턴 등 — 기존 spec 의 403 검증 방식을 그대로 복제).

- [ ] **Step 3: 실패 확인**

Run: `cd services/auth-service && npx jest auth.service`
Expected: 신규 3개 FAIL.

- [ ] **Step 4: buildResult 구현 변경**

```ts
const SUSPENDED_MESSAGE = "이용이 정지된 회사입니다. 관리자에게 문의하세요.";

let active: { tenantId: string; role: TenantRole } | undefined;

if (activeTenantId) {
  const m = memberships.memberships.find((x) => x.tenantId === activeTenantId);
  if (!m) {
    throw new RpcException({ status: 403, message: "해당 회사 멤버가 아닙니다" });
  }
  if (m.tenantStatus === "suspended") {
    throw new RpcException({ status: 403, message: SUSPENDED_MESSAGE });
  }
  active = { tenantId: m.tenantId, role: m.role };
} else {
  // 로그인: suspended 가 아닌 첫 멤버십을 활성으로. 전부 suspended 면 403.
  const m = memberships.memberships.find((x) => x.tenantStatus !== "suspended");
  if (m) {
    active = { tenantId: m.tenantId, role: m.role };
  } else if (memberships.memberships.length > 0 && !memberships.isSystemAdmin && !allowEmpty) {
    throw new RpcException({ status: 403, message: SUSPENDED_MESSAGE });
  }
}
```

(이후의 `if (!active && !memberships.isSystemAdmin && !allowEmpty)` "소속된 회사가 없습니다" 분기는 그대로 유지 — 멤버십 0개 케이스 담당.)

- [ ] **Step 5: 통과 확인 (전체 auth spec 회귀 포함)**

Run: `cd services/auth-service && npx jest`
Expected: 전체 PASS.

- [ ] **Step 6: Commit**

```bash
git add services/auth-service/src/auth
git commit -m "feat: suspended 테넌트 로그인·전환 차단"
```

---

### Task 5: user-service admin — listTenants / getTenant / updateTenant

**Files:**
- Modify: `services/user-service/src/admin/admin.service.ts`
- Modify: `services/user-service/src/admin/admin.controller.ts`
- Test: `services/user-service/src/admin/admin.service.spec.ts` (신규)

**Interfaces:**
- Consumes: Task 1 DTO/패턴, Task 2 trialEndsAt.
- Produces: `listTenants(): Promise<AdminTenantListResponse>`, `getTenant(tenantId): Promise<AdminTenantDetailResponse>`, `updateTenant(req: AdminTenantUpdateRequest & { actorId: string }): Promise<AdminTenantListItem>` — Task 6 gateway 가 호출.

- [ ] **Step 1: 실패 테스트 작성** — `admin.service.spec.ts` (tenants.service.spec 의 prismaMock 패턴)

```ts
import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AdminService — tenants (Spec 3)", () => {
  let service: AdminService;
  const prismaMock = {
    tenant: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    userTenant: { groupBy: jest.fn(), count: jest.fn() },
    contract: { groupBy: jest.fn(), count: jest.fn() },
    auditLog: { groupBy: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    user: { count: jest.fn(), findMany: jest.fn() },
    file: { aggregate: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(AdminService);
  });

  const t1 = {
    id: "t1", name: "A상사", plan: "enterprise", status: "active",
    trialEndsAt: null, createdAt: new Date("2026-07-03T00:00:00Z"),
  };
  const t2 = {
    id: "t2", name: "C엔터", plan: "starter", status: "trial",
    trialEndsAt: new Date("2026-09-22T00:00:00Z"), createdAt: new Date("2026-09-01T00:00:00Z"),
  };

  it("listTenants 는 회사별 멤버/계약/최근활동을 머지하고 totals 를 채운다", async () => {
    prismaMock.tenant.findMany.mockResolvedValue([t1, t2]);
    prismaMock.userTenant.groupBy.mockResolvedValue([
      { tenantId: "t1", _count: { _all: 28 } },
      { tenantId: "t2", _count: { _all: 5 } },
    ]);
    prismaMock.contract.groupBy.mockResolvedValue([{ tenantId: "t1", _count: { _all: 201 } }]);
    prismaMock.auditLog.groupBy.mockResolvedValue([
      { tenantId: "t1", _max: { at: new Date("2026-09-10T05:00:00Z") } },
    ]);
    prismaMock.user.count.mockResolvedValue(33);
    prismaMock.contract.count.mockResolvedValue(201);

    const res = await service.listTenants();

    expect(res.tenants).toHaveLength(2);
    const a = res.tenants.find((x) => x.id === "t1")!;
    expect(a).toMatchObject({
      memberCount: 28, contractCount: 201,
      lastActivityAt: "2026-09-10T05:00:00.000Z", trialEndsAt: null,
    });
    const c = res.tenants.find((x) => x.id === "t2")!;
    expect(c).toMatchObject({ memberCount: 5, contractCount: 0, lastActivityAt: null, trialEndsAt: "2026-09-22T00:00:00.000Z" });
    expect(res.totals).toEqual({ tenants: 2, users: 33, contracts: 201, trials: 1 });
  });

  it("getTenant 은 진행중/체결 분류·역할 구성·최근 활동을 반환한다", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(t1);
    prismaMock.userTenant.count.mockResolvedValue(28);
    prismaMock.contract.count
      .mockResolvedValueOnce(42)   // activeContracts
      .mockResolvedValueOnce(159); // signedContracts
    prismaMock.file.aggregate.mockResolvedValue({ _sum: { size: 1800000 } });
    prismaMock.userTenant.groupBy.mockResolvedValue([
      { role: "general", _count: { _all: 18 } },
      { role: "inHouseCounsel", _count: { _all: 3 } },
    ]);
    prismaMock.auditLog.findMany.mockResolvedValue([
      { id: "a1", action: "update", actorId: "u1", targetType: "Contract", targetId: "c1", detail: null, at: new Date("2026-09-10T05:00:00Z") },
    ]);
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1", name: "김지원" }]);
    prismaMock.userTenant.count.mockResolvedValue(28);

    const res = await service.getTenant("t1");

    expect(res.stats).toEqual({
      memberCount: 28, activeContracts: 42, signedContracts: 159, storageBytes: 1800000,
    });
    expect(res.roleBreakdown).toEqual([
      { role: "general", count: 18 },
      { role: "inHouseCounsel", count: 3 },
    ]);
    expect(res.recentAudit[0]).toMatchObject({ id: "a1", actorName: "김지원" });
    // 진행중/체결 where 절 검증
    expect(prismaMock.contract.count).toHaveBeenNthCalledWith(1, {
      where: { tenantId: "t1", deletedAt: null, status: { notIn: ["signed", "fulfilling", "closed"] } },
    });
    expect(prismaMock.contract.count).toHaveBeenNthCalledWith(2, {
      where: { tenantId: "t1", deletedAt: null, status: { in: ["signed", "fulfilling", "closed"] } },
    });
  });

  it("getTenant 은 없는 id 면 404 RpcException", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);
    await expect(service.getTenant("nope")).rejects.toBeInstanceOf(RpcException);
  });

  it("updateTenant 은 변경 후 AuditLog(update/Tenant) 를 기록한다", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(t1);
    prismaMock.tenant.update.mockResolvedValue({ ...t1, status: "suspended" });
    prismaMock.userTenant.count.mockResolvedValue(28);
    prismaMock.contract.count.mockResolvedValue(201);
    prismaMock.auditLog.findMany.mockResolvedValue([]);

    const res = await service.updateTenant({ tenantId: "t1", status: "suspended", actorId: "admin1" });

    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "suspended" },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "update", actorId: "admin1", targetType: "Tenant", targetId: "t1", tenantId: "t1",
        detail: expect.objectContaining({ before: expect.objectContaining({ status: "active" }), after: expect.objectContaining({ status: "suspended" }) }),
      }),
    });
    expect(res.status).toBe("suspended");
  });

  it("updateTenant 은 없는 id 면 404 RpcException", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);
    await expect(service.updateTenant({ tenantId: "nope", plan: "pro", actorId: "admin1" })).rejects.toBeInstanceOf(RpcException);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd services/user-service && npx jest admin.service`
Expected: FAIL (메서드 없음).

- [ ] **Step 3: 구현** — admin.service.ts 에 추가

```ts
// 파일 상단 import 에 추가:
// import { RpcException } from "@nestjs/microservices";
// import type { AdminTenantDetailResponse, AdminTenantListItem, AdminTenantListResponse, AdminTenantUpdateRequest } from "@lawai/contracts";

const SIGNED_STATUSES = ["signed", "fulfilling", "closed"] as const;
const TENANT_AUDIT_LIMIT = 10;

// 클래스 내부에 추가:

/** 고객사 목록 + 전체 KPI — groupBy 4종 병렬 후 메모리 머지(테넌트 수십 규모 전제). */
async listTenants(): Promise<AdminTenantListResponse> {
  const [tenants, memberGroups, contractGroups, activityGroups, userTotal, contractTotal] =
    await Promise.all([
      this.prisma.tenant.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.userTenant.groupBy({ by: ["tenantId"], _count: { _all: true } }),
      this.prisma.contract.groupBy({ by: ["tenantId"], where: { deletedAt: null }, _count: { _all: true } }),
      this.prisma.auditLog.groupBy({ by: ["tenantId"], _max: { at: true } }),
      this.prisma.user.count(),
      this.prisma.contract.count({ where: { deletedAt: null } }),
    ]);

  const memberBy = new Map(memberGroups.map((g) => [g.tenantId, g._count._all]));
  const contractBy = new Map(contractGroups.map((g) => [g.tenantId, g._count._all]));
  const activityBy = new Map(activityGroups.map((g) => [g.tenantId, g._max.at]));

  const items: AdminTenantListItem[] = tenants.map((t) => this.toTenantItem(t, {
    memberCount: memberBy.get(t.id) ?? 0,
    contractCount: contractBy.get(t.id) ?? 0,
    lastActivityAt: activityBy.get(t.id)?.toISOString() ?? null,
  }));

  return {
    tenants: items,
    totals: {
      tenants: tenants.length,
      users: userTotal,
      contracts: contractTotal,
      trials: tenants.filter((t) => t.status === "trial").length,
    },
  };
}

/** 고객사 상세 — KPI/역할 구성/최근 활동(이 테넌트만). */
async getTenant(tenantId: string): Promise<AdminTenantDetailResponse> {
  const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new RpcException({ status: 404, message: "고객사를 찾을 수 없습니다" });

  const [memberCount, activeContracts, signedContracts, fileAgg, roleGroups, auditRows] =
    await Promise.all([
      this.prisma.userTenant.count({ where: { tenantId } }),
      this.prisma.contract.count({
        where: { tenantId, deletedAt: null, status: { notIn: [...SIGNED_STATUSES] } },
      }),
      this.prisma.contract.count({
        where: { tenantId, deletedAt: null, status: { in: [...SIGNED_STATUSES] } },
      }),
      this.prisma.file.aggregate({
        where: { tenantId, storageKey: { not: null } },
        _sum: { size: true },
      }),
      this.prisma.userTenant.groupBy({ by: ["role"], where: { tenantId }, _count: { _all: true } }),
      this.prisma.auditLog.findMany({
        where: { tenantId },
        take: TENANT_AUDIT_LIMIT,
        orderBy: { at: "desc" },
      }),
    ]);

  const recentAudit = await this.attachActorNames(auditRows);
  const contractCount = activeContracts + signedContracts;

  return {
    tenant: this.toTenantItem(tenant, {
      memberCount,
      contractCount,
      lastActivityAt: auditRows[0]?.at.toISOString() ?? null,
    }),
    stats: {
      memberCount,
      activeContracts,
      signedContracts,
      storageBytes: fileAgg._sum.size ?? 0,
    },
    roleBreakdown: roleGroups.map((g) => ({ role: g.role, count: g._count._all })),
    recentAudit,
  };
}

/** 요금제/상태/체험판만료 변경 + 감사 기록(action=update, targetType=Tenant). */
async updateTenant(
  req: AdminTenantUpdateRequest & { actorId: string },
): Promise<AdminTenantListItem> {
  const { tenantId, actorId, ...changes } = req;
  if (!tenantId) throw new RpcException({ status: 400, message: "tenantId가 필요합니다" });
  const before = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!before) throw new RpcException({ status: 404, message: "고객사를 찾을 수 없습니다" });

  const data: { plan?: typeof before.plan; status?: typeof before.status; trialEndsAt?: Date | null } = {};
  if (changes.plan !== undefined) data.plan = changes.plan;
  if (changes.status !== undefined) data.status = changes.status;
  if (changes.trialEndsAt !== undefined) {
    data.trialEndsAt = changes.trialEndsAt === null ? null : new Date(changes.trialEndsAt);
  }

  const updated = await this.prisma.tenant.update({ where: { id: tenantId }, data });

  await this.prisma.auditLog.create({
    data: {
      action: "update",
      actorId,
      targetType: "Tenant",
      targetId: tenantId,
      tenantId,
      detail: {
        before: { plan: before.plan, status: before.status, trialEndsAt: before.trialEndsAt?.toISOString() ?? null },
        after: { plan: updated.plan, status: updated.status, trialEndsAt: updated.trialEndsAt?.toISOString() ?? null },
      },
    },
  });

  const [memberCount, contractCount] = await Promise.all([
    this.prisma.userTenant.count({ where: { tenantId } }),
    this.prisma.contract.count({ where: { tenantId, deletedAt: null } }),
  ]);
  const lastAudit = await this.prisma.auditLog.findMany({
    where: { tenantId }, take: 1, orderBy: { at: "desc" },
  });
  return this.toTenantItem(updated, {
    memberCount, contractCount,
    lastActivityAt: lastAudit[0]?.at.toISOString() ?? null,
  });
}

/** Tenant 행 + 집계값 → DTO 매핑(단일 출처). */
private toTenantItem(
  t: { id: string; name: string; plan: AdminTenantListItem["plan"]; status: AdminTenantListItem["status"]; trialEndsAt: Date | null; createdAt: Date },
  agg: { memberCount: number; contractCount: number; lastActivityAt: string | null },
): AdminTenantListItem {
  return {
    id: t.id, name: t.name, plan: t.plan, status: t.status,
    trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    ...agg,
  };
}

/** AuditLog rows 에 actorName 배치 조인 — getRecentAudit 와 공유하는 헬퍼로 추출. */
private async attachActorNames(
  rows: { id: string; action: string; actorId: string; targetType: string; targetId: string; detail: unknown; at: Date }[],
): Promise<AdminAuditEntry[]> {
  const actorIds = Array.from(new Set(rows.map((r) => r.actorId)));
  const users = actorIds.length > 0
    ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return rows.map((r) => ({
    id: r.id, action: r.action, actorId: r.actorId,
    actorName: nameById.get(r.actorId) ?? null,
    targetType: r.targetType, targetId: r.targetId,
    detail: r.detail as Prisma.JsonValue,
    at: r.at.toISOString(),
  }));
}
```

기존 `getRecentAudit` 의 조인 블록을 `attachActorNames` 호출로 교체(중복 제거):

```ts
async getRecentAudit(limitInput?: number): Promise<AdminAuditListResponse> {
  const limit = Math.min(Math.max(1, limitInput ?? AUDIT_DEFAULT_LIMIT), AUDIT_MAX_LIMIT);
  const rows = await this.prisma.auditLog.findMany({ take: limit, orderBy: { at: "desc" } });
  return { items: await this.attachActorNames(rows) };
}
```

- [ ] **Step 4: controller 에 MessagePattern 3개 추가** — admin.controller.ts

```ts
// import 에 AdminTenantDetailRequest, AdminTenantDetailResponse, AdminTenantListResponse, AdminTenantListItem, AdminTenantUpdateRequest 추가

@MessagePattern(ADMIN_PATTERNS.LIST_TENANTS)
listTenants(): Promise<AdminTenantListResponse> {
  return this.admin.listTenants();
}

@MessagePattern(ADMIN_PATTERNS.GET_TENANT)
getTenant(@Payload() req: AdminTenantDetailRequest): Promise<AdminTenantDetailResponse> {
  return this.admin.getTenant(req.tenantId);
}

@MessagePattern(ADMIN_PATTERNS.UPDATE_TENANT)
updateTenant(
  @Payload() req: AdminTenantUpdateRequest & { actorId: string },
): Promise<AdminTenantListItem> {
  return this.admin.updateTenant(req);
}
```

- [ ] **Step 5: 통과 확인 (기존 admin getStats/getAudit 회귀 포함)**

Run: `cd services/user-service && npx jest admin`
Expected: PASS (신규 5 + 기존).

- [ ] **Step 6: Commit**

```bash
git add services/user-service/src/admin
git commit -m "feat: admin 고객사 목록/상세/변경 RPC 추가"
```

---

### Task 6: gateway — /admin/tenants 엔드포인트 3개

**Files:**
- Modify: `services/api-gateway/src/admin/admin.controller.ts`

**Interfaces:**
- Consumes: Task 1 패턴/DTO, Task 5 RPC.
- Produces: `GET /admin/tenants`, `GET /admin/tenants/:id`, `PATCH /admin/tenants/:id` — Task 7~8 프론트가 호출.

- [ ] **Step 1: 컨트롤러에 3개 엔드포인트 추가** (기존 getStats/getAudit 아래)

```ts
// import 에 Body, Param, Patch (@nestjs/common), Req (@nestjs/common), type Request (express)
// contracts import 에 AdminTenantDetailResponse, AdminTenantListItem, AdminTenantListResponse, AdminTenantUpdateRequest, type JwtPayload 추가

@ApiOperation({ summary: "고객사 목록 + 전체 KPI" })
@Get("tenants")
listTenants(): Promise<AdminTenantListResponse> {
  return firstValueFrom(
    this.userClient.send<AdminTenantListResponse>(ADMIN_PATTERNS.LIST_TENANTS, {}).pipe(rpcToHttp()),
  );
}

@ApiOperation({ summary: "고객사 상세 집계" })
@Get("tenants/:id")
getTenant(@Param("id") id: string): Promise<AdminTenantDetailResponse> {
  return firstValueFrom(
    this.userClient.send<AdminTenantDetailResponse>(ADMIN_PATTERNS.GET_TENANT, { tenantId: id }).pipe(rpcToHttp()),
  );
}

@ApiOperation({ summary: "고객사 요금제/상태/체험판만료 변경" })
@Patch("tenants/:id")
updateTenant(
  @Param("id") id: string,
  @Body() dto: Pick<AdminTenantUpdateRequest, "plan" | "status" | "trialEndsAt">,
  @Req() req: Request,
): Promise<AdminTenantListItem> {
  const { sub } = (req as Request & { user: JwtPayload }).user;
  const payload: AdminTenantUpdateRequest & { actorId: string } = {
    tenantId: id, actorId: sub,
    plan: dto.plan, status: dto.status, trialEndsAt: dto.trialEndsAt,
  };
  return firstValueFrom(
    this.userClient.send<AdminTenantListItem>(ADMIN_PATTERNS.UPDATE_TENANT, payload).pipe(rpcToHttp()),
  );
}
```

> 주의: NestJS 라우팅은 선언 순서가 중요하지 않지만(`tenants` vs `tenants/:id` 는 경로 길이가 달라 충돌 없음) `@Get("tenants")` 를 `@Get("tenants/:id")` 보다 위에 둔다.

- [ ] **Step 2: 빌드 검증**

Run: `pnpm --filter @lawai/api-gateway build && pnpm --filter @lawai/api-gateway test`
Expected: 빌드 성공 + 기존 테스트 PASS (gateway 컨트롤러는 thin passthrough — 기존 admin 엔드포인트와 동일하게 전용 spec 없음).

- [ ] **Step 3: Commit**

```bash
git add services/api-gateway/src/admin
git commit -m "feat: gateway /admin/tenants 엔드포인트 추가"
```

---

### Task 7: admin 프론트 — API 모듈 + 네비 라우팅 + 고객사 목록 페이지

**Files:**
- Create: `apps/admin/src/api/adminTenants.ts`
- Modify: `apps/admin/src/components/AdminShell.tsx` (NAV 항목에 path + 클릭 이동)
- Create: `apps/admin/src/pages/tenants/TenantListPage.tsx`
- Modify: `apps/admin/src/App.tsx` (route 추가)

**Interfaces:**
- Consumes: Task 6 엔드포인트, contracts DTO.
- Produces: `listAdminTenants()/getAdminTenant(id)/updateAdminTenant(id, body)`, `<TenantListPage />`, 라우트 `/tenants` — Task 8 이 상세 라우트/이동을 잇는다.

- [ ] **Step 1: api/adminTenants.ts**

```ts
import type {
  AdminTenantDetailResponse,
  AdminTenantListItem,
  AdminTenantListResponse,
  AdminTenantUpdateRequest,
} from "@lawai/contracts";
import { apiFetch } from "./client";

export const listAdminTenants = (): Promise<AdminTenantListResponse> =>
  apiFetch<AdminTenantListResponse>("/admin/tenants");

export const getAdminTenant = (id: string): Promise<AdminTenantDetailResponse> =>
  apiFetch<AdminTenantDetailResponse>(`/admin/tenants/${id}`);

export const updateAdminTenant = (
  id: string,
  body: Pick<AdminTenantUpdateRequest, "plan" | "status" | "trialEndsAt">,
): Promise<AdminTenantListItem> =>
  apiFetch<AdminTenantListItem>(`/admin/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
```

- [ ] **Step 2: AdminShell NAV 라우팅화**

`NavItem` 에 `path?: string` 추가, "개요" 섹션 아래에 "고객사" 추가, 클릭 시 이동·현재 경로로 active 계산:

```ts
interface NavItem {
  icon: "home" | "users" | "fileText" | "folder" | "tag" | "shield" | "monitor" | "briefcase";
  label: string;
  path?: string; // 있으면 클릭 이동 + 현재 경로 매칭으로 active
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "개요",
    items: [
      { icon: "home", label: "대시보드", path: "/" },
      { icon: "briefcase", label: "고객사", path: "/tenants" },
    ],
  },
  // ...기존 "관리"/"감사" 섹션 그대로 (path 없음 = 표시 전용)
];
```

렌더부: `useNavigate`/`useLocation` 사용, path 있는 항목은 클릭 가능 + active 계산(`path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)`), 없는 항목은 기존처럼 div:

```tsx
const navigate = useNavigate();
const location = useLocation();
// items.map 안:
<div
  key={item.label}
  onClick={item.path ? () => navigate(item.path!) : undefined}
  style={{
    ...(isNavActive(item, location.pathname) ? navItemActive : navItemBase),
    ...(item.path ? { cursor: "pointer" } : {}),
  }}
>
```

기존 `active?: boolean` 필드와 `대시보드` 의 `active: true` 는 제거(경로 기반으로 대체). `isNavActive` 는 파일 상단 헬퍼:

```ts
const isNavActive = (item: NavItem, pathname: string) =>
  item.path !== undefined &&
  (item.path === "/" ? pathname === "/" : pathname.startsWith(item.path));
```

> lawkit Icon 에 "briefcase" 가 없으면(빌드 에러) "users" 대신 다른 가용 아이콘("building" 등)을 `node_modules/@lawkit/ui/CLAUDE.md` 의 IconName 목록에서 골라 쓴다.

- [ ] **Step 3: TenantListPage 구현** — 시안 `admin-tenant-mockup.html` ② 화면. AdminShell 로 감싸고, DashboardPage 의 스타일 상수 패턴(React.CSSProperties + lawkit themeVars) 을 따른다.

```tsx
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Icon, Spinner } from "@lawkit/ui";
import { themeVars } from "@lawkit/ui";
import type { AdminTenantListItem } from "@lawai/contracts";
import { AdminShell } from "../../components/AdminShell";
import { listAdminTenants } from "../../api/adminTenants";

const PLAN_LABELS = { enterprise: "Enterprise", pro: "Pro", starter: "Starter" } as const;
const STATUS_LABELS = { active: "사용 중", trial: "체험판", suspended: "정지" } as const;

const kpiGrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16,
};
const kpiCard: React.CSSProperties = {
  background: themeVars.color.surface, border: `1px solid ${themeVars.color.border}`,
  borderRadius: 8, padding: "14px 16px",
};
const kpiLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: themeVars.color.textSecondary };
const kpiValue: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: themeVars.color.textHeading, marginTop: 4 };
const tableWrap: React.CSSProperties = {
  background: themeVars.color.surface, border: `1px solid ${themeVars.color.border}`, borderRadius: 8, overflow: "hidden",
};
const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700,
  color: themeVars.color.textSecondary, borderBottom: `1px solid ${themeVars.color.border}`,
};
const td: React.CSSProperties = { padding: "11px 14px", borderBottom: `1px solid ${themeVars.color.borderSubtle ?? themeVars.color.border}`, fontSize: 12.5 };

// 남은 일수(D-day). 만료 지났으면 "만료됨".
const getTrialDday = (trialEndsAt: string | null): string | null => {
  if (!trialEndsAt) return null;
  const days = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
  return days <= 0 ? "만료됨" : `${days}일 남음`;
};

const formatRelative = (iso: string | null): string => {
  if (!iso) return "-";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`;
  return `${Math.floor(diffMin / 1440)}일 전`;
};

export function TenantListPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["adminTenants"], queryFn: listAdminTenants });

  if (query.isLoading) {
    return (
      <AdminShell breadcrumbLabel="고객사">
        <Spinner label="불러오는 중..." />
      </AdminShell>
    );
  }
  const data = query.data;
  if (!data) {
    return (
      <AdminShell breadcrumbLabel="고객사">
        <div style={{ color: themeVars.color.textSecondary }}>고객사 목록을 불러오지 못했습니다.</div>
      </AdminShell>
    );
  }

  const nearestTrial = data.tenants
    .filter((t) => t.status === "trial" && t.trialEndsAt)
    .sort((a, b) => a.trialEndsAt!.localeCompare(b.trialEndsAt!))[0];

  return (
    <AdminShell breadcrumbLabel="고객사">
      <div style={kpiGrid}>
        <div style={kpiCard}><div style={kpiLabel}>전체 고객사</div><div style={kpiValue}>{data.totals.tenants}</div></div>
        <div style={kpiCard}><div style={kpiLabel}>전체 사용자</div><div style={kpiValue}>{data.totals.users}</div></div>
        <div style={kpiCard}><div style={kpiLabel}>전체 계약</div><div style={kpiValue}>{data.totals.contracts}</div></div>
        <div style={kpiCard}>
          <div style={kpiLabel}>체험판(전환 대기)</div>
          <div style={kpiValue}>{data.totals.trials}</div>
          {nearestTrial ? (
            <div style={{ fontSize: 11, color: themeVars.color.textSecondary, marginTop: 2 }}>
              {nearestTrial.name} · {getTrialDday(nearestTrial.trialEndsAt)}
            </div>
          ) : null}
        </div>
      </div>

      <div style={tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>회사</th><th style={th}>요금제</th><th style={th}>상태</th>
              <th style={th}>멤버</th><th style={th}>계약</th><th style={th}>최근 활동</th><th style={th} />
            </tr>
          </thead>
          <tbody>
            {data.tenants.map((t: AdminTenantListItem) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tenants/${t.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td style={td}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, color: themeVars.color.textHeading }}>
                    <Avatar initials={t.name.charAt(0)} size="sm" color="primary" />
                    {t.name}
                  </span>
                </td>
                <td style={td}>{PLAN_LABELS[t.plan]}</td>
                <td style={td}>
                  {STATUS_LABELS[t.status]}
                  {t.status === "trial" && t.trialEndsAt ? ` · ${getTrialDday(t.trialEndsAt)}` : ""}
                </td>
                <td style={td}>{t.memberCount}</td>
                <td style={td}>{t.contractCount}</td>
                <td style={td}>{formatRelative(t.lastActivityAt)}</td>
                <td style={td}><Icon name="chevronRight" size="sm" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
```

> themeVars 색상 키·Icon 이름("chevronRight" 등)이 실제와 다르면 `node_modules/@lawkit/ui/CLAUDE.md` 와 DashboardPage 의 사용례를 기준으로 맞춘다(빌드가 잡아줌). 상태 필터 드롭다운은 스펙상 목록 화면 요소지만 회사 수가 적은 초기라 **이번 구현에서 생략** — 스펙 §4 의 "상태 필터"는 회사 30+ 시 후속(YAGNI, 스펙 대비 의도적 축소로 커밋 메시지에 명시하지 않고 plan 에만 기록).

- [ ] **Step 4: App.tsx 라우트 추가**

```tsx
import { TenantListPage } from "./pages/tenants/TenantListPage";
// <Routes> 안, "/" 라우트 아래:
<Route
  path="/tenants"
  element={
    <RequireAdmin>
      <TenantListPage />
    </RequireAdmin>
  }
/>
```

- [ ] **Step 5: 빌드 검증**

Run: `pnpm --filter @lawai/admin build`
Expected: 성공(타입 검증 겸용).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src
git commit -m "feat: admin 고객사 목록 페이지 + 네비 라우팅"
```

---

### Task 8: admin 프론트 — 고객사 상세 페이지 (변경 다이얼로그 포함)

**Files:**
- Create: `apps/admin/src/pages/tenants/TenantDetailPage.tsx`
- Modify: `apps/admin/src/App.tsx` (route 추가)

**Interfaces:**
- Consumes: Task 7 의 `getAdminTenant`/`updateAdminTenant`, Task 7 스타일 패턴.
- Produces: 라우트 `/tenants/:id`. 이후 task 의존 없음.

- [ ] **Step 1: TenantDetailPage 구현** — 시안 ③ 화면. 요금제 변경(Dropdown)·상태 변경(정지/해제/체험판+만료일)은 lawkit Modal 로 확인 후 PATCH → 쿼리 invalidate.

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, Button, Dropdown, Icon, Input, Modal, Spinner, themeVars } from "@lawkit/ui";
import type { TenantPlan } from "@lawai/contracts";
import { AdminShell } from "../../components/AdminShell";
import { getAdminTenant, updateAdminTenant } from "../../api/adminTenants";
import { getTenantRoleLabelAdmin } from "./tenantLabels";

// 파일 분리 없이 이 파일 안에 두면 SRP 위반이 아니므로(상세 화면 전용) 아래 상수/헬퍼는 이 파일 상단에 둔다.
const PLAN_LABELS = { enterprise: "Enterprise", pro: "Pro", starter: "Starter" } as const;
const STATUS_LABELS = { active: "사용 중", trial: "체험판", suspended: "정지" } as const;
const DEFAULT_TRIAL_DAYS = 30;

const formatBytes = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}GB`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}KB`;
  return `${n}B`;
};

export function TenantDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["adminTenant", id], queryFn: () => getAdminTenant(id) });

  const [openDialog, setOpenDialog] = useState<"plan" | "status" | null>(null);
  const [planDraft, setPlanDraft] = useState<TenantPlan | null>(null);
  const [statusDraft, setStatusDraft] = useState<"active" | "trial" | "suspended" | null>(null);
  const [trialEndsDraft, setTrialEndsDraft] = useState("");

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof updateAdminTenant>[1]) => updateAdminTenant(id, body),
    onSuccess: () => {
      setOpenDialog(null);
      void queryClient.invalidateQueries({ queryKey: ["adminTenant", id] });
      void queryClient.invalidateQueries({ queryKey: ["adminTenants"] });
    },
  });

  if (query.isLoading) {
    return (
      <AdminShell breadcrumbLabel="고객사">
        <Spinner label="불러오는 중..." />
      </AdminShell>
    );
  }
  const data = query.data;
  if (!data) {
    return (
      <AdminShell breadcrumbLabel="고객사">
        <div style={{ color: themeVars.color.textSecondary }}>고객사를 찾을 수 없습니다.</div>
      </AdminShell>
    );
  }
  const { tenant, stats, roleBreakdown, recentAudit } = data;
  const maxRoleCount = Math.max(1, ...roleBreakdown.map((r) => r.count));

  const handleOpenStatusDialog = () => {
    setStatusDraft(tenant.status === "suspended" ? "active" : "suspended");
    setTrialEndsDraft(
      new Date(Date.now() + DEFAULT_TRIAL_DAYS * 86_400_000).toISOString().slice(0, 10),
    );
    setOpenDialog("status");
  };

  const handleSubmitStatus = () => {
    if (!statusDraft) return;
    mutation.mutate({
      status: statusDraft,
      trialEndsAt: statusDraft === "trial" ? new Date(`${trialEndsDraft}T23:59:59Z`).toISOString() : null,
    });
  };

  return (
    <AdminShell breadcrumbLabel={`고객사 / ${tenant.name}`}>
      <button
        onClick={() => navigate("/tenants")}
        style={{ background: "none", border: "none", cursor: "pointer", color: themeVars.color.primary, fontWeight: 700, fontSize: 12.5, padding: 0, marginBottom: 8 }}
      >
        ‹ 고객사 목록
      </button>

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Avatar initials={tenant.name.charAt(0)} size="md" color="primary" />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: themeVars.color.textHeading }}>{tenant.name}</div>
          <div style={{ fontSize: 12, color: themeVars.color.textSecondary }}>
            가입 {new Date(tenant.createdAt).toLocaleDateString("ko-KR")} · {PLAN_LABELS[tenant.plan]} · {STATUS_LABELS[tenant.status]}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button intent="secondary" onClick={() => { setPlanDraft(tenant.plan); setOpenDialog("plan"); }}>요금제 변경</Button>
        <Button intent={tenant.status === "suspended" ? "primary" : "danger"} onClick={handleOpenStatusDialog}>
          {tenant.status === "suspended" ? "정지 해제" : "이용 정지"}
        </Button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          ["멤버", String(stats.memberCount)],
          ["진행 중 계약", String(stats.activeContracts)],
          ["체결 완료", String(stats.signedContracts)],
          ["저장 용량", formatBytes(stats.storageBytes)],
        ].map(([label, value]) => (
          <div key={label} style={{ background: themeVars.color.surface, border: `1px solid ${themeVars.color.border}`, borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: themeVars.color.textSecondary }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: themeVars.color.textHeading, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        {/* 역할별 멤버 구성 */}
        <div style={{ background: themeVars.color.surface, border: `1px solid ${themeVars.color.border}`, borderRadius: 8 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${themeVars.color.border}`, fontSize: 13.5, fontWeight: 700, color: themeVars.color.textHeading }}>역할별 멤버 구성</div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {roleBreakdown.length === 0 ? (
              <div style={{ fontSize: 12, color: themeVars.color.textSecondary }}>멤버가 없습니다.</div>
            ) : (
              roleBreakdown.map((r) => (
                <div key={r.role} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                  <span style={{ width: 92, color: themeVars.color.textSecondary, fontWeight: 600, flexShrink: 0 }}>{getTenantRoleLabelAdmin(r.role)}</span>
                  <div style={{ flex: 1, height: 14, background: themeVars.color.surfaceSubtle ?? "#f1f4f9", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(r.count / maxRoleCount) * 100}%`, background: themeVars.color.primary, borderRadius: 99 }} />
                  </div>
                  <span style={{ width: 34, textAlign: "right", fontWeight: 700, color: themeVars.color.textHeading }}>{r.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 최근 활동 */}
        <div style={{ background: themeVars.color.surface, border: `1px solid ${themeVars.color.border}`, borderRadius: 8 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${themeVars.color.border}`, fontSize: 13.5, fontWeight: 700, color: themeVars.color.textHeading }}>최근 활동 (이 회사만)</div>
          {recentAudit.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: themeVars.color.textSecondary }}>최근 활동이 없습니다.</div>
          ) : (
            recentAudit.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${themeVars.color.border}`, fontSize: 12, alignItems: "baseline" }}>
                <span style={{ color: themeVars.color.textSecondary, width: 90, flexShrink: 0 }}>
                  {new Date(a.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>{a.actorName ?? a.actorId} — {a.action} {a.targetType}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 요금제 변경 다이얼로그 */}
      {openDialog === "plan" ? (
        <Modal
          title="요금제 변경"
          onClose={() => setOpenDialog(null)}
          footer={
            <>
              <Button intent="secondary" onClick={() => setOpenDialog(null)}>취소</Button>
              <Button intent="primary" disabled={mutation.isPending || !planDraft} onClick={() => planDraft && mutation.mutate({ plan: planDraft })}>변경</Button>
            </>
          }
        >
          <Dropdown
            options={[
              { value: "starter", label: "Starter" },
              { value: "pro", label: "Pro" },
              { value: "enterprise", label: "Enterprise" },
            ]}
            value={planDraft ?? tenant.plan}
            onChange={(v) => setPlanDraft(v as TenantPlan)}
          />
        </Modal>
      ) : null}

      {/* 상태 변경 다이얼로그 */}
      {openDialog === "status" ? (
        <Modal
          title="상태 변경"
          onClose={() => setOpenDialog(null)}
          footer={
            <>
              <Button intent="secondary" onClick={() => setOpenDialog(null)}>취소</Button>
              <Button intent="primary" disabled={mutation.isPending} onClick={handleSubmitStatus}>적용</Button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Dropdown
              options={[
                { value: "active", label: "사용 중", description: "정상 이용" },
                { value: "trial", label: "체험판", description: "만료일까지 무료 이용" },
                { value: "suspended", label: "정지", description: "이 회사 멤버의 로그인·전환이 차단됩니다" },
              ]}
              value={statusDraft ?? tenant.status}
              onChange={(v) => setStatusDraft(v as "active" | "trial" | "suspended")}
            />
            {statusDraft === "trial" ? (
              <Input
                type="date"
                value={trialEndsDraft}
                onChange={(e) => setTrialEndsDraft(e.target.value)}
                label="체험판 만료일"
              />
            ) : null}
            {mutation.isError ? (
              <div style={{ fontSize: 12, color: themeVars.color.danger ?? "#b12a30" }}>변경에 실패했습니다. 다시 시도해주세요.</div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </AdminShell>
  );
}
```

역할 라벨은 admin 앱에 web 것을 재사용할 수 없으므로(앱 경계) 같은 폴더에 소형 파일 생성 — `apps/admin/src/pages/tenants/tenantLabels.ts`:

```ts
import type { TenantRole } from "@lawai/contracts";

const LABELS: Record<TenantRole, string> = {
  general: "일반",
  contractManager: "계약담당자",
  inHouseCounsel: "사내변호사",
  outsideCounsel: "사외변호사",
  sealManager: "날인담당자",
};

export const getTenantRoleLabelAdmin = (role: TenantRole): string => LABELS[role];
```

> lawkit `Modal`/`Dropdown`/`Button`/`Input` 의 정확한 props(`intent`, `footer`, `label`, controlled `value/onChange`)는 `node_modules/@lawkit/ui/CLAUDE.md` 를 열어 확인하고 다르면 그 API 에 맞춘다(예: Modal 이 `primaryText/onPrimary` 식이면 그 형태로). Input 이 `type="date"` 미지원이면 일반 텍스트 입력(YYYY-MM-DD placeholder) + 간단 검증으로 대체.

- [ ] **Step 2: App.tsx 라우트 추가** (`/tenants` 라우트 아래 — 순서 중요: `/tenants/:id` 를 별도 Route 로)

```tsx
import { TenantDetailPage } from "./pages/tenants/TenantDetailPage";
// <Routes> 안:
<Route
  path="/tenants/:id"
  element={
    <RequireAdmin>
      <TenantDetailPage />
    </RequireAdmin>
  }
/>
```

- [ ] **Step 3: 빌드 검증**

Run: `pnpm --filter @lawai/admin build`
Expected: 성공.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src
git commit -m "feat: admin 고객사 상세 페이지 (요금제/상태 변경 포함)"
```

---

### Task 9: 전체 검증

**Files:** 없음 (검증 전용 — 깨지면 해당 파일 수정)

- [ ] **Step 1: 전체 turbo**

Run: `pnpm turbo lint build test`
Expected: 17/17 PASS. web 은 변경이 없어야 함(`git status` 로 apps/web 미변경 확인).

- [ ] **Step 2: ERD 동기화 확인**

Task 2 Step 5 가 보류였다면 여기서 erdify MCP 로 재시도. 완료 여부를 최종 보고에 명시.

- [ ] **Step 3: 잔여 수정분 커밋 (있을 때만)**

```bash
git add -A
git commit -m "chore: admin 고객사 관리 전체 검증 통과"
```

---

## Self-Review 결과

- **Spec 커버리지**: §1 trialEndsAt(T2), §2.1 DTO/패턴(T1), §2.2 gateway(T6), §2.3 집계 3종+감사(T5), §3 suspended 차단+MembershipRow(T3/T4), §4 네비/목록/상세/다이얼로그(T7/T8), §5 범위(전 task 준수 — "+ 고객사 추가" 없음), §6 테스트(T3/T4/T5 TDD + T9). 상태 필터 드롭다운은 T7 에서 의도적 축소(YAGNI) — 스펙 §4 대비 유일한 축소로 여기 명시. ✅
- **Placeholder**: 없음. lawkit props 불확실성은 "빌드로 확인 + CLAUDE.md 레퍼런스 참조" 라는 실행 가능한 지시로 처리(코드 전문 제공).
- **타입 일관성**: `AdminTenantListItem`(T1↔T5 toTenantItem↔T7 표), `AdminTenantUpdateRequest & { actorId }`(T5↔T6), `tenantStatus`(T1↔T3↔T4), `listAdminTenants/getAdminTenant/updateAdminTenant`(T7↔T8), 403 메시지 문자열(T4 테스트↔구현) 일치 확인.
