# 계약 체결(Signing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계약 라이프사이클의 빈 구간인 "체결"을 채운다 — 검토를 거친 계약의 `signing → signed` 처리와, 검토 없이 이미 체결된 계약의 직접 등록.

**Architecture:** 별도 도메인·화면·테이블을 만들지 않는다. 기존 3개 표면(요청 폼 / 목록 / 상세)을 확장하고, 스키마는 `Contract.signedAt` 과 `FileRole.signed` 두 개만 추가한다. 원 계약 연결은 기존 `details.relatedDocs` 를 재사용한다.

**Tech Stack:** NestJS 마이크로서비스(TCP `@MessagePattern`), Prisma multiSchema(Postgres), React 19 + react-hook-form + zod + @tanstack/react-query, vanilla-extract, @lawkit/ui 0.1.72

**Spec:** `docs/superpowers/specs/2026-09-12-contract-signing-design.md`

## Global Constraints

- **프론트엔드(`apps/web` 전용)**: 화살표 함수. 커스텀 훅은 `use~` 접두사. `useEffect`/`useMemo`/`useCallback`/`React.memo` **금지**(파생값은 렌더 중 계산). 인라인 `style={{}}` **금지** — vanilla-extract `*.css.ts` + `themeVars` 토큰만. PreToolUse 훅이 새 인라인 스타일을 차단한다.
- **백엔드(`services/*`)에는 위 프론트 규칙을 적용하지 않는다.**
- 커밋 메시지: `<type>: <내용>`, 이모지 금지. type은 `feat|fix|chore|docs|design|style|refactor|test|perf|rename|init`.
- `registerAs` 가 `"review"` 이거나 없으면 **기존 create 경로를 한 줄도 바꾸지 않는다**(회귀 금지).
- RPC 에러는 `throw new RpcException({ status, message })` 형태. 게이트웨이는 `firstValueFrom(...).pipe(rpcToHttp())`.
- 새 Prisma 모델의 스키마 지정 필수(`@@schema("shared")` 등). 마이그레이션 후 **erdify MCP 로 "Law.ai Reboot" ERD 동기화 시도**(네트워크 실패 시 커밋 메시지에 미동기화 명시).
- 각 태스크 종료 시 해당 패키지의 `lint` + `test` 가 green 이어야 한다.

---

### Task 1: Prisma 스키마 — `Contract.signedAt` + `FileRole.signed`

**Files:**
- Modify: `services/user-service/prisma/schema.prisma` (model `Contract`, enum `FileRole`)
- Create: `services/user-service/prisma/migrations/<timestamp>_contract_signing/migration.sql` (prisma 가 생성)

**Interfaces:**
- Produces: `Contract.signedAt: DateTime?`, `FileRole` 에 `signed` 멤버 추가. 이후 모든 태스크가 이 둘에 의존한다.

- [ ] **Step 1: `FileRole` 에 `signed` 추가**

`services/user-service/prisma/schema.prisma` 의 enum(현재 399~405행)을 이렇게 바꾼다:

```prisma
enum FileRole {
  contract // 계약서
  attach // 첨부/별첨
  ref // 참고서류
  signed // 최종 서명본(체결 완료본)

  @@schema("shared")
}
```

- [ ] **Step 2: `Contract` 에 `signedAt` 추가**

`model Contract` 안, `dueDate DateTime?` 바로 아래 줄에 추가한다:

```prisma
  signedAt    DateTime? // 실제 서명 완료일. signed 상태 진입 시 확정.
```

- [ ] **Step 3: 마이그레이션 생성**

Docker Postgres 가 5433 포트로 떠 있어야 한다(`docker ps` 로 `lawai-postgres` 확인).

Run: `pnpm --filter @lawai/user-service exec prisma migrate dev --name contract_signing`
Expected: 새 마이그레이션 디렉터리 생성 + `Your database is now in sync with your schema.`

- [ ] **Step 4: Prisma Client 재생성 확인**

Run: `pnpm --filter @lawai/user-service exec prisma generate`
Expected: `Generated Prisma Client`

- [ ] **Step 5: 빌드로 타입 반영 확인**

Run: `pnpm --filter @lawai/user-service build`
Expected: 에러 없이 종료

- [ ] **Step 6: ERD 동기화 시도**

erdify MCP 로 "Law.ai Reboot" ERD 에 `Contract.signedAt` 컬럼과 `FileRole.signed` enum 값을 반영한다.
MCP 가 없거나 네트워크 오류면 **건너뛰고 커밋 메시지에 "ERD 미동기화(네트워크)" 를 명시**한다.

- [ ] **Step 7: 커밋**

```bash
git add services/user-service/prisma
git commit -m "feat: 계약 체결용 스키마 추가 - Contract.signedAt, FileRole.signed"
```

---

### Task 2: 공유 DTO — `packages/contracts`

**Files:**
- Modify: `packages/contracts/src/patterns.ts:50-57` (`CONTRACT_PATTERNS`)
- Modify: `packages/contracts/src/dto/contract.dto.ts` (`CreateContractRequest`, `ContractResponse`, 신규 인터페이스 2종)

**Interfaces:**
- Consumes: Task 1 의 `FileRole.signed`
- Produces:
  - `CONTRACT_PATTERNS.COMPLETE_SIGNING = "contract.completeSigning"`
  - `CompleteSigningRequest { contractId: string; viewerId: string; signedAt: string; fileId?: string | null; note?: string | null; tenantContext?: TenantContext }`
  - `CompleteSigningResult { contract: ContractResponse }`
  - `CreateContractRequest.registerAs?: "review" | "signed"`, `CreateContractRequest.signedAt?: string | null`
  - `ContractResponse.signedAt: string | null`

- [ ] **Step 1: RPC 패턴 추가**

`packages/contracts/src/patterns.ts` 의 `CONTRACT_PATTERNS` 에 한 줄 추가:

```ts
export const CONTRACT_PATTERNS = {
  CREATE: "contract.create",
  GET: "contract.get",
  LIST: "contract.list",
  UPDATE: "contract.update",
  UPDATE_STATUS: "contract.updateStatus",
  SUBMIT_APPROVAL: "contract.submitApproval",
  COMPLETE_SIGNING: "contract.completeSigning",
} as const;
```

- [ ] **Step 2: `CreateContractRequest` 확장**

`packages/contracts/src/dto/contract.dto.ts` 의 `CreateContractRequest`(131행부터) 안,
`schemaVersion: number;` 바로 아래에 추가한다:

```ts
  /** 등록 유형. "signed" 면 검토·결재를 건너뛰고 곧바로 체결 완료(signed)로 생성한다.
   *  미지정/"review" 는 기존 동작과 완전히 동일. */
  registerAs?: "review" | "signed";
  /** 실제 서명 완료일(ISO 8601). registerAs="signed" 일 때 필수. */
  signedAt?: string | null;
```

- [ ] **Step 3: `ContractResponse` 에 `signedAt` 추가**

`ContractResponse` 인터페이스에서 `dueDate` 필드 바로 아래에 추가한다
(기존 `dueDate` 가 `string | null` 이므로 동일한 형태로):

```ts
  signedAt: string | null;
```

- [ ] **Step 4: 체결 처리 DTO 추가**

같은 파일 끝의 `SubmitContractApprovalResult` 정의 뒤에 추가한다:

```ts
/** 체결 처리 — sealManager 가 결재 완료된 계약을 signing → signed 로 확정한다.
 *  서명본 파일 승격 + signedAt 확정을 한 번에 처리한다. */
export interface CompleteSigningRequest {
  contractId: string;
  /** gateway 가 JWT sub 를 주입. */
  viewerId: string;
  /** 실제 서명 완료일(ISO 8601). */
  signedAt: string;
  /** 사전 업로드된 서명본 File.id. 주어지면 role 을 signed 로 승격한다. */
  fileId?: string | null;
  /** 비고 — 감사 로그에만 남는다. */
  note?: string | null;
  tenantContext?: TenantContext;
}

export interface CompleteSigningResult {
  contract: ContractResponse;
}
```

- [ ] **Step 5: 빌드 확인**

Run: `pnpm --filter @lawai/contracts build`
Expected: 에러 없이 종료

- [ ] **Step 6: 커밋**

```bash
git add packages/contracts
git commit -m "feat: 체결 처리 DTO 와 RPC 패턴 추가"
```

---

### Task 3: user-service — `completeSigning` 서비스 + 컨트롤러

**Files:**
- Modify: `services/user-service/src/contracts/contracts.service.ts` (메서드 추가)
- Modify: `services/user-service/src/contracts/contracts.controller.ts` (핸들러 추가)
- Test: `services/user-service/src/contracts/contracts.service.spec.ts` (기존 파일에 describe 추가)

**Interfaces:**
- Consumes: Task 2 의 `CompleteSigningRequest`/`CompleteSigningResult`/`CONTRACT_PATTERNS.COMPLETE_SIGNING`, Task 1 의 `signedAt`·`FileRole.signed`
- Produces: `ContractsService.completeSigning(req: CompleteSigningRequest): Promise<CompleteSigningResult>`

**기존 헬퍼(그대로 재사용 — 새로 만들지 말 것):**
- `this.loadViewer(viewerId, ctx)` → `AuthzViewer | null`
- `this.toAuthzContract(row)` → `AuthzContract`
- `evaluate(viewer, authzContract)` → `{ canTransition, ... }` (`./contracts.authz` 에서 import, 이미 import 되어 있음)
- `this.toResponse(row)` → `ContractResponse`
- `this.audit.record({ action, targetType, targetId, actorId, tenantId, detail })`
- `tenantScope(ctx)` / `resolveTenantId(ctx)` — 파일 상단에 이미 import 되어 있음
- `contractInclude` — 파일 상단 상수
- `this.approvals.getActive("contract", id)` → `{ line: ApprovalLineDto | null, historyCount: number }`

- [ ] **Step 1: 실패하는 테스트 작성**

`services/user-service/src/contracts/contracts.service.spec.ts` 끝에 추가한다.
기존 스펙 파일의 mock 생성 헬퍼·`createService()` 패턴을 그대로 따른다(파일 상단을 먼저 읽을 것).

```ts
describe("completeSigning", () => {
  const baseRow = {
    id: "c1",
    tenantId: "t1",
    status: "signing",
    createdById: "u-req",
    ownerId: "u-legal",
    departmentId: null,
    securityLevel: "normal",
    counterparties: [],
    files: [],
    references: [],
  };

  it("권한이 없으면 403", async () => {
    const { service, prisma } = createService();
    prisma.contract.findFirst.mockResolvedValue(baseRow);
    prisma.userTenant.findFirst.mockResolvedValue({
      role: "general",
      user: { departmentId: null },
    });
    await expect(
      service.completeSigning({
        contractId: "c1",
        viewerId: "u-x",
        signedAt: "2026-09-12",
        tenantContext: { tenantId: "t1", isSystemAdmin: false },
      }),
    ).rejects.toMatchObject({ error: { status: 403 } });
  });

  it("결재가 완료되지 않았으면 400", async () => {
    const { service, prisma, approvals } = createService();
    prisma.contract.findFirst.mockResolvedValue(baseRow);
    prisma.userTenant.findFirst.mockResolvedValue({
      role: "sealManager",
      user: { departmentId: null },
    });
    approvals.getActive.mockResolvedValue({
      line: { id: "l1", status: "pending", steps: [] },
      historyCount: 0,
    });
    await expect(
      service.completeSigning({
        contractId: "c1",
        viewerId: "u-seal",
        signedAt: "2026-09-12",
        tenantContext: { tenantId: "t1", isSystemAdmin: false },
      }),
    ).rejects.toMatchObject({ error: { status: 400 } });
  });

  it("결재선이 아예 없어도 400", async () => {
    const { service, prisma, approvals } = createService();
    prisma.contract.findFirst.mockResolvedValue(baseRow);
    prisma.userTenant.findFirst.mockResolvedValue({
      role: "sealManager",
      user: { departmentId: null },
    });
    approvals.getActive.mockResolvedValue({ line: null, historyCount: 0 });
    await expect(
      service.completeSigning({
        contractId: "c1",
        viewerId: "u-seal",
        signedAt: "2026-09-12",
        tenantContext: { tenantId: "t1", isSystemAdmin: false },
      }),
    ).rejects.toMatchObject({ error: { status: 400 } });
  });

  it("남의 계약 파일을 주면 400", async () => {
    const { service, prisma, approvals } = createService();
    prisma.contract.findFirst.mockResolvedValue(baseRow);
    prisma.userTenant.findFirst.mockResolvedValue({
      role: "sealManager",
      user: { departmentId: null },
    });
    approvals.getActive.mockResolvedValue({
      line: { id: "l1", status: "approved", steps: [] },
      historyCount: 0,
    });
    prisma.file.findFirst.mockResolvedValue(null);
    await expect(
      service.completeSigning({
        contractId: "c1",
        viewerId: "u-seal",
        signedAt: "2026-09-12",
        fileId: "f-other",
        tenantContext: { tenantId: "t1", isSystemAdmin: false },
      }),
    ).rejects.toMatchObject({ error: { status: 400 } });
  });

  it("정상 처리 시 signed 로 전이하고 signedAt 과 파일 role 을 갱신한다", async () => {
    const { service, prisma, approvals, audit } = createService();
    prisma.contract.findFirst.mockResolvedValue(baseRow);
    prisma.userTenant.findFirst.mockResolvedValue({
      role: "sealManager",
      user: { departmentId: null },
    });
    approvals.getActive.mockResolvedValue({
      line: { id: "l1", status: "approved", steps: [] },
      historyCount: 0,
    });
    prisma.file.findFirst.mockResolvedValue({ id: "f1", contractId: "c1" });
    prisma.contract.update.mockResolvedValue({
      ...baseRow,
      status: "signed",
      signedAt: new Date("2026-09-12"),
    });

    const result = await service.completeSigning({
      contractId: "c1",
      viewerId: "u-seal",
      signedAt: "2026-09-12",
      fileId: "f1",
      note: "원본 보관함 A-3",
      tenantContext: { tenantId: "t1", isSystemAdmin: false },
    });

    expect(prisma.file.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "f1" },
        data: { role: "signed" },
      }),
    );
    expect(prisma.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "signed" }),
      }),
    );
    expect(result.contract.status).toBe("signed");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "transition",
        detail: expect.objectContaining({ kind: "completeSigning" }),
      }),
    );
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @lawai/user-service test -- contracts.service.spec`
Expected: FAIL — `service.completeSigning is not a function`

- [ ] **Step 3: 서비스 메서드 구현**

`services/user-service/src/contracts/contracts.service.ts` 의 `submitApproval` 메서드 바로 뒤에 추가한다.
`CompleteSigningRequest`/`CompleteSigningResult` 를 `@lawai/contracts` import 목록에 추가할 것.

```ts
  /** 체결 처리 — 결재가 전원 승인된 signing 계약을 signed 로 확정한다.
   *  권한·상태·결재 게이트를 모두 통과하기 전에는 어떤 쓰기도 하지 않는다. */
  async completeSigning(
    req: CompleteSigningRequest,
  ): Promise<CompleteSigningResult> {
    const ctx = req.tenantContext!;
    const row = await this.prisma.contract.findFirst({
      where: { id: req.contractId, deletedAt: null, ...tenantScope(ctx) },
      include: contractInclude,
    });
    if (!row) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }

    // sealManager 는 status === "signing" 일 때만 canTransition 이 true 다(authz 특수 처리).
    const viewer = await this.loadViewer(req.viewerId, ctx);
    const authz = evaluate(viewer, this.toAuthzContract(row));
    if (!authz.canTransition) {
      throw new RpcException({ status: 403, message: "체결 처리 권한이 없습니다" });
    }
    if (row.status !== "signing") {
      throw new RpcException({ status: 400, message: "체결 진행 상태가 아닙니다" });
    }

    // 결재 완료 게이트 — 라인이 없거나 approved 가 아니면 체결할 수 없다.
    const active = await this.approvals.getActive("contract", row.id);
    if (!active.line || active.line.status !== "approved") {
      throw new RpcException({ status: 400, message: "결재가 완료되지 않았습니다" });
    }

    // 서명본 파일은 반드시 이 계약 소유여야 한다.
    if (req.fileId) {
      const file = await this.prisma.file.findFirst({
        where: { id: req.fileId, contractId: row.id },
        select: { id: true },
      });
      if (!file) {
        throw new RpcException({ status: 400, message: "잘못된 파일입니다" });
      }
      await this.prisma.file.update({
        where: { id: req.fileId },
        data: { role: "signed" },
      });
    }

    const updated = await this.prisma.contract.update({
      where: { id: row.id },
      data: { status: "signed", signedAt: parseDate(req.signedAt) },
      include: contractInclude,
    });
    await this.audit.record({
      action: "transition",
      targetType: "Contract",
      targetId: row.id,
      actorId: req.viewerId,
      tenantId: row.tenantId,
      detail: {
        kind: "completeSigning",
        from: "signing",
        to: "signed",
        note: req.note ?? null,
      },
    });
    return { contract: this.toResponse(updated) };
  }
```

- [ ] **Step 4: `toResponse` 에 `signedAt` 매핑 추가**

`toResponse` 메서드(176행 근처 `status: row.status,` 가 있는 곳)에서 `dueDate` 매핑 옆에 추가한다.
기존 날짜 매핑이 쓰는 것과 **동일한 직렬화 방식**을 따를 것(`dueDate` 줄을 그대로 보고 맞춘다):

```ts
      signedAt: row.signedAt ? row.signedAt.toISOString() : null,
```

- [ ] **Step 5: 컨트롤러 핸들러 추가**

`services/user-service/src/contracts/contracts.controller.ts` 의 `submitApproval` 핸들러 뒤에 추가한다:

```ts
  @MessagePattern(CONTRACT_PATTERNS.COMPLETE_SIGNING)
  completeSigning(@Payload() req: CompleteSigningRequest) {
    return this.contracts.completeSigning(req);
  }
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `pnpm --filter @lawai/user-service test -- contracts.service.spec`
Expected: PASS (신규 5개 포함 전부)

- [ ] **Step 7: lint + 전체 테스트**

Run: `pnpm --filter @lawai/user-service lint && pnpm --filter @lawai/user-service test`
Expected: 둘 다 PASS

- [ ] **Step 8: 커밋**

```bash
git add services/user-service/src/contracts
git commit -m "feat: 체결 처리 RPC 추가 - 결재 완료 게이트 + 서명본 승격"
```

---

### Task 4: user-service — `create()` 체결 완료 등록 경로

**Files:**
- Modify: `services/user-service/src/contracts/contracts.service.ts` (`create` 메서드, 207행부터)
- Test: `services/user-service/src/contracts/contracts.service.spec.ts`

**Interfaces:**
- Consumes: Task 2 의 `CreateContractRequest.registerAs`/`signedAt`
- Produces: `registerAs === "signed"` 일 때 `status: "signed"` 로 생성되고 `risk` 분석이 트리거되는 경로

**중요:** `registerAs` 가 없거나 `"review"` 면 기존 동작이 **완전히 동일**해야 한다. 회귀 테스트로 보증한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`contracts.service.spec.ts` 에 추가한다. `createService()` 헬퍼와 기존 create 테스트의 인자 형태를 따른다.

```ts
describe("create - 체결 완료 등록", () => {
  const baseReq = {
    title: "이미 체결된 계약",
    securityLevel: "normal" as const,
    reviewType: "normal" as const,
    createdById: "u1",
    schemaVersion: 1,
    counterparties: [],
    approvers: [],
    references: [],
    tenantContext: { tenantId: "t1", isSystemAdmin: false },
  };

  it("signedAt 이 없으면 400", async () => {
    const { service } = createService();
    await expect(
      service.create({
        ...baseReq,
        registerAs: "signed",
        details: { stage: "new" } as never,
        files: [{ role: "signed", name: "a.pdf", meta: "", sortOrder: 0 }],
      }),
    ).rejects.toMatchObject({ error: { status: 400 } });
  });

  it("서명본 파일이 없으면 400", async () => {
    const { service } = createService();
    await expect(
      service.create({
        ...baseReq,
        registerAs: "signed",
        signedAt: "2025-12-18",
        details: { stage: "new" } as never,
        files: [{ role: "contract", name: "a.docx", meta: "", sortOrder: 0 }],
      }),
    ).rejects.toMatchObject({ error: { status: 400 } });
  });

  it("변경·해지인데 원 계약이 없으면 400", async () => {
    const { service } = createService();
    await expect(
      service.create({
        ...baseReq,
        registerAs: "signed",
        signedAt: "2025-12-18",
        details: { stage: "change", relatedDocs: [] } as never,
        files: [{ role: "signed", name: "a.pdf", meta: "", sortOrder: 0 }],
      }),
    ).rejects.toMatchObject({ error: { status: 400 } });
  });

  it("정상이면 signed 상태로 생성하고 risk 분석을 트리거한다", async () => {
    const { service, prisma, aiAnalysis } = createService();
    prisma.user.findUnique.mockResolvedValue({ departmentId: null });
    prisma.contract.create.mockResolvedValue({
      id: "c1",
      tenantId: "t1",
      status: "signed",
      signedAt: new Date("2025-12-18"),
      counterparties: [],
      files: [],
      references: [],
    });

    const res = await service.create({
      ...baseReq,
      registerAs: "signed",
      signedAt: "2025-12-18",
      details: { stage: "new" } as never,
      files: [{ role: "signed", name: "a.pdf", meta: "", sortOrder: 0 }],
    });

    expect(prisma.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "signed" }),
      }),
    );
    expect(res.status).toBe("signed");
    expect(aiAnalysis.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "risk" }),
    );
  });

  it("registerAs 미지정이면 기존 동작 그대로 - status 를 지정하지 않고 precheck 를 트리거한다", async () => {
    const { service, prisma, aiAnalysis } = createService();
    prisma.user.findUnique.mockResolvedValue({ departmentId: null });
    prisma.contract.create.mockResolvedValue({
      id: "c2",
      tenantId: "t1",
      status: "unassigned",
      signedAt: null,
      counterparties: [],
      files: [],
      references: [],
    });

    await service.create({
      ...baseReq,
      details: { stage: "new" } as never,
      files: [{ role: "contract", name: "a.docx", meta: "", sortOrder: 0 }],
    });

    const createArg = prisma.contract.create.mock.calls[0][0];
    expect(createArg.data.status).toBeUndefined();
    expect(aiAnalysis.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "precheck" }),
    );
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @lawai/user-service test -- contracts.service.spec`
Expected: FAIL — 검증이 없어 400 이 안 난다

- [ ] **Step 3: 검증 블록 추가**

`create()` 메서드 안, 카테고리 검증(`if (req.categoryId) { ... }`) **바로 뒤**, `try {` **앞**에 추가한다:

```ts
    // 체결 완료 등록: 검토·결재를 건너뛰므로 여기서 못 잡으면 영영 못 잡는다.
    const isDirectSigned = req.registerAs === "signed";
    if (isDirectSigned) {
      if (!req.signedAt) {
        throw new RpcException({ status: 400, message: "체결일을 입력하세요" });
      }
      if (!req.files.some((f) => f.role === "signed")) {
        throw new RpcException({ status: 400, message: "최종 서명본을 첨부하세요" });
      }
      const details = req.details as unknown as {
        stage?: string;
        relatedDocs?: unknown[];
      };
      if (details.stage === "change" && !details.relatedDocs?.length) {
        throw new RpcException({
          status: 400,
          message: "변경·해지 계약은 원 계약을 연결해야 합니다",
        });
      }
    }
```

- [ ] **Step 4: create 데이터에 상태·체결일 반영**

`this.prisma.contract.create({ data: { ... } })` 의 `dueDate: parseDate(req.dueDate),` 바로 아래에 추가한다.
**조건부 스프레드**를 써서 `review` 경로에서는 키 자체가 들어가지 않게 한다(기존 동작 보존):

```ts
          ...(isDirectSigned
            ? { status: "signed" as const, signedAt: parseDate(req.signedAt) }
            : {}),
```

- [ ] **Step 5: AI 트리거 분기**

`create()` 끝부분의 precheck 트리거 블록을 통째로 아래로 교체한다:

```ts
      // 검토 경로는 계약서 원본(role=contract) 기준 사전 점검(precheck),
      // 체결 완료 등록은 서명본(role=signed) 기준 위험 분석(risk) 을 백그라운드로 돌린다.
      if (isDirectSigned) {
        if (req.files.some((f) => f.role === "signed")) {
          void this.aiAnalysis.trigger({
            targetType: "contract",
            targetId: row.id,
            kind: "risk",
            tenantId: row.tenantId,
            triggeredByUserId: req.createdById,
            payload: buildRiskPayload(response, null),
          });
        }
      } else if (req.files.some((f) => f.role === "contract")) {
        void this.aiAnalysis.trigger({
          targetType: "contract",
          targetId: row.id,
          kind: "precheck",
          tenantId: row.tenantId,
          triggeredByUserId: req.createdById,
          payload: buildPrecheckPayload(response),
        });
      }
```

**주의:** `buildRiskPayload` 의 실제 시그니처를 파일 상단 import 와 정의에서 먼저 확인하고 인자를 맞출 것.
기존 `updateStatus` 의 risk 트리거 호출부를 그대로 복사해 인자 형태를 맞추는 것이 가장 안전하다.

- [ ] **Step 6: 테스트 통과 확인**

Run: `pnpm --filter @lawai/user-service test -- contracts.service.spec`
Expected: PASS

- [ ] **Step 7: lint + 전체 테스트**

Run: `pnpm --filter @lawai/user-service lint && pnpm --filter @lawai/user-service test`
Expected: 둘 다 PASS

- [ ] **Step 8: 커밋**

```bash
git add services/user-service/src/contracts
git commit -m "feat: 검토 없이 체결 완료 계약 직접 등록 경로 추가"
```

---

### Task 5: api-gateway — 체결 처리 엔드포인트

**Files:**
- Modify: `services/api-gateway/src/contracts/contracts.controller.ts`
- Create: `services/api-gateway/src/contracts/dto/complete-signing.dto.ts`

**Interfaces:**
- Consumes: Task 2 의 `CONTRACT_PATTERNS.COMPLETE_SIGNING`, `CompleteSigningRequest/Result`
- Produces: `POST /contracts/:id/complete-signing` → `ContractResponse`

- [ ] **Step 1: 요청 바디 DTO 생성**

`services/api-gateway/src/contracts/dto/complete-signing.dto.ts` 를 만든다.
**같은 디렉터리의 기존 dto 파일 하나를 먼저 열어** class-validator 데코레이터·Swagger 데코레이터 사용 관례를 그대로 따른다.

```ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class CompleteSigningDto {
  @ApiProperty({ description: "실제 서명 완료일(ISO 8601)", example: "2026-09-12" })
  @IsISO8601()
  signedAt!: string;

  @ApiPropertyOptional({ description: "사전 업로드된 서명본 File.id" })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiPropertyOptional({ description: "비고 - 감사 로그에만 남는다" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
```

- [ ] **Step 2: 엔드포인트 추가**

`contracts.controller.ts` 의 `submitApproval` 핸들러 뒤에 추가한다.
`submitApproval` 이 결과에서 `contract` 를 꺼내는 `map(...)` 형태를 그대로 따른다(먼저 그 코드를 읽을 것).

```ts
  @ApiOperation({
    summary: "체결 처리",
    description:
      "인감 담당(sealManager) + 체결 진행(signing) + 결재 전원 승인 상태에서만. 서명본 파일 승격 + signedAt 확정 + signed 전이.",
  })
  @Post(":id/complete-signing")
  completeSigning(
    @Param("id") id: string,
    @Body() body: CompleteSigningDto,
    @Req() req: Request,
  ): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: CompleteSigningRequest = {
      contractId: id,
      viewerId: sub,
      signedAt: body.signedAt,
      fileId: body.fileId ?? null,
      note: body.note ?? null,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<CompleteSigningResult>(CONTRACT_PATTERNS.COMPLETE_SIGNING, payload)
        .pipe(
          rpcToHttp(),
          map((result: CompleteSigningResult) => result.contract),
        ),
    );
  }
```

- [ ] **Step 3: 빌드 + lint 확인**

Run: `pnpm --filter @lawai/api-gateway lint && pnpm --filter @lawai/api-gateway build`
Expected: 둘 다 PASS

- [ ] **Step 4: 커밋**

```bash
git add services/api-gateway/src/contracts
git commit -m "feat: 체결 처리 게이트웨이 엔드포인트 추가"
```

---

### Task 6: web — API 클라이언트 + 요청 폼 스키마 분기

**Files:**
- Modify: `apps/web/src/api/contracts.ts`
- Modify: `apps/web/src/pages/contract/request-schema.ts`
- Modify: `apps/web/src/pages/contract/toCreateRequest.ts`
- Test: `apps/web/src/pages/contract/request-schema.test.ts` (없으면 생성)
- Test: `apps/web/src/pages/contract/toCreateRequest.test.ts` (기존 파일에 케이스 추가)

**Interfaces:**
- Consumes: Task 5 의 `POST /contracts/:id/complete-signing`
- Produces:
  - `completeSigning(id: string, body: { signedAt: string; fileId?: string | null; note?: string | null }): Promise<ContractResponse>`
  - `contractRequestSchema` 에 `registerAs`, `signedAt`, `signedFiles` 필드 + superRefine 교차 검증
  - `contractRequestDefaults.registerAs = "review"`, `.signedAt = ""`, `.signedFiles = []`

- [ ] **Step 1: API 클라이언트 함수 추가**

`apps/web/src/api/contracts.ts` 끝, `submitContractApproval` 뒤에 추가한다:

```ts
// 체결 처리 — 인감 담당 + 결재 전원 승인 상태에서만.
export const completeSigning = (
  id: string,
  body: { signedAt: string; fileId?: string | null; note?: string | null },
): Promise<ContractResponse> =>
  apiFetch<ContractResponse>(`/contracts/${id}/complete-signing`, {
    method: "POST",
    body: JSON.stringify(body),
  });
```

- [ ] **Step 2: 실패하는 스키마 테스트 작성**

`apps/web/src/pages/contract/request-schema.test.ts` 에 추가한다(파일이 없으면 생성하고
`import { describe, it, expect } from "vitest";` 로 시작):

```ts
import { contractRequestSchema, contractRequestDefaults } from "./request-schema";

const signedBase = {
  ...contractRequestDefaults,
  name: "계약",
  party: "당사자",
  categoryId: "cat1",
  counterparties: [{ id: "co1", type: "company", name: "상대", bizNo: "1",
    ceo: null, phone: null, address: null, addressDetail: null,
    managerName: null, managerPhone: null, managerEmail: null, createdAt: "2026-01-01" }],
  purpose: "목적",
  money: [{ vat: "excluded" as const, amount: 1000, currency: "KRW" }],
  registerAs: "signed" as const,
};

describe("contractRequestSchema - 등록 유형 교차 검증", () => {
  it("체결 완료 등록인데 체결일이 없으면 실패한다", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      signedAt: "",
      signedFiles: [{ id: "f1", name: "a.pdf", meta: "", mimeType: null }],
      contractFiles: [],
    });
    expect(r.success).toBe(false);
  });

  it("체결 완료 등록인데 서명본이 없으면 실패한다", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      signedAt: "2025-12-18",
      signedFiles: [],
      contractFiles: [],
    });
    expect(r.success).toBe(false);
  });

  it("변경·해지 + 체결 완료 등록인데 원 계약이 없으면 실패한다", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      stage: "change" as const,
      signedAt: "2025-12-18",
      signedFiles: [{ id: "f1", name: "a.pdf", meta: "", mimeType: null }],
      contractFiles: [],
      relatedDocs: [],
    });
    expect(r.success).toBe(false);
  });

  it("체결 완료 등록은 검토용 계약서가 없어도 통과한다", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      signedAt: "2025-12-18",
      signedFiles: [{ id: "f1", name: "a.pdf", meta: "", mimeType: null }],
      contractFiles: [],
    });
    expect(r.success).toBe(true);
  });

  it("검토 요청은 계약서가 없으면 실패한다(기존 규칙 유지)", () => {
    const r = contractRequestSchema.safeParse({
      ...signedBase,
      registerAs: "review" as const,
      contractFiles: [],
      signedFiles: [],
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `pnpm --filter @lawai/web test -- request-schema`
Expected: FAIL

- [ ] **Step 4: 스키마 수정**

`request-schema.ts` 에서 다음 세 가지를 한다.

(1) `contractFiles` 의 `.min(1, ...)` 를 제거해 조건부 검증으로 넘긴다:

```ts
  contractFiles: z.array(uploadedFileSchema),
```

(2) `approvers` 필드 바로 아래(객체 닫기 전)에 신규 필드 3개를 추가한다:

```ts
  // 등록 유형 — "signed" 면 검토·결재를 건너뛰고 곧바로 체결 완료로 등록한다.
  registerAs: z.enum(["review", "signed"]),
  signedAt: z.string(),
  signedFiles: z.array(uploadedFileSchema),
```

(3) `z.object({...})` 전체를 `.superRefine(...)` 으로 감싼다.
즉 `export const contractRequestSchema = z.object({ ... })` 를
`export const contractRequestSchema = z.object({ ... }).superRefine((v, ctx) => { ... })` 로 바꾼다:

```ts
.superRefine((v, ctx) => {
  if (v.registerAs === "signed") {
    if (!v.signedAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["signedAt"], message: "체결일을 입력하세요" });
    }
    if (v.signedFiles.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["signedFiles"], message: "최종 서명본을 첨부하세요" });
    }
    if (v.stage === "change" && v.relatedDocs.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["relatedDocs"], message: "원 계약을 연결하세요" });
    }
  } else if (v.contractFiles.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contractFiles"], message: "계약서를 첨부하세요" });
  }
});
```

(4) `contractRequestDefaults` 에 기본값 3개를 추가한다:

```ts
  registerAs: "review",
  signedAt: "",
  signedFiles: [],
```

- [ ] **Step 5: `toCreateRequest` 수정**

`toCreateRequest.ts` 에서 `stage: form.stage,` 가 들어 있는 details 조립부는 그대로 두고,
반환 객체에 두 필드를 추가하고 파일 매핑에 서명본을 더한다.
기존 파일 매핑 코드(`contractFiles`/`attachFiles`/`refFiles` 를 `role` 과 `sortOrder` 로 펴는 부분)를
**먼저 읽고 같은 방식으로** `signedFiles` 를 `role: "signed"` 로 추가할 것.

```ts
    registerAs: form.registerAs,
    signedAt: form.signedAt || null,
```

- [ ] **Step 6: `toCreateRequest` 테스트 추가**

`toCreateRequest.test.ts` 에 추가한다:

```ts
it("체결 완료 등록이면 registerAs 와 signedAt 을 싣고 서명본을 role=signed 로 매핑한다", () => {
  const req = toCreateRequest(
    {
      ...contractRequestDefaults,
      registerAs: "signed",
      signedAt: "2025-12-18",
      signedFiles: [{ id: "f1", name: "sign.pdf", meta: "1MB", mimeType: "application/pdf" }],
    },
    "u1",
  );
  expect(req.registerAs).toBe("signed");
  expect(req.signedAt).toBe("2025-12-18");
  expect(req.files.some((f) => f.role === "signed" && f.name === "sign.pdf")).toBe(true);
});
```

**주의:** `toCreateRequest` 의 실제 인자 개수·순서를 기존 테스트에서 확인하고 맞출 것.

- [ ] **Step 7: 테스트 통과 확인**

Run: `pnpm --filter @lawai/web test -- request-schema toCreateRequest`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add apps/web/src/api/contracts.ts apps/web/src/pages/contract/request-schema.ts apps/web/src/pages/contract/toCreateRequest.ts apps/web/src/pages/contract/request-schema.test.ts apps/web/src/pages/contract/toCreateRequest.test.ts
git commit -m "feat: 요청 폼 등록 유형 분기 스키마와 체결 처리 API 클라이언트 추가"
```

---

### Task 7: web — 요청 폼 UI (등록 유형 · 체결일 · 원 계약 · 서명본)

**Files:**
- Modify: `apps/web/src/pages/contract/sections/OverviewSection.tsx`
- Modify: `apps/web/src/pages/contract/sections/DocsSection.tsx`
- Modify: `apps/web/src/pages/contract/ContractRequestPage.tsx` (제목·제출 버튼 문구)
- Modify: `apps/web/src/pages/contract/contractRequest.css.ts` (신규 스타일)
- Test: `apps/web/src/pages/contract/sections/OverviewSection.test.tsx`

**Interfaces:**
- Consumes: Task 6 의 `registerAs`/`signedAt`/`signedFiles` 폼 필드
- Produces: 등록 유형에 따라 필드가 바뀌는 요청 폼

**시안:** `contract-signing-mockup.html` 탭 1. 실제 화면 기준으로 그려져 있으니 레이아웃·문구를 그대로 따른다.

**컨벤션 주의:** `useEffect`/`useMemo`/`useCallback` 금지. `style={{}}` 금지 —
모든 스타일은 `contractRequest.css.ts` 에 vanilla-extract 로 추가하고 `themeVars` 만 쓴다.
분기는 `watch("registerAs")` 로 읽어 **렌더 중 계산**한다.

- [ ] **Step 1: css.ts 에 스타일 추가**

`contractRequest.css.ts` 끝에 추가한다(로컬 hex 금지 — `themeVars` + `color-mix` 만):

```ts
/* 등록 유형 분기 — 시안의 강조 박스 */
export const modeRow = style({
  background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 5%, ${themeVars.color.neutralSurface})`,
  border: `1px solid color-mix(in srgb, ${themeVars.color.accentPrimary} 18%, ${themeVars.color.neutralSurface})`,
  borderRadius: 6,
  padding: "13px 14px",
  marginBottom: 18,
  gridColumn: "1 / -1",
});

export const modeHelp = style({
  fontSize: 11.5,
  color: themeVars.color.textMuted,
  marginTop: 8,
  lineHeight: 1.6,
});

/* 변경·해지 + 체결 완료 등록 = 원 계약 필수 강조 */
export const origRequired = style({
  background: `color-mix(in srgb, ${themeVars.color.accentWarning} 8%, ${themeVars.color.neutralSurface})`,
  border: `1px solid color-mix(in srgb, ${themeVars.color.accentWarning} 26%, ${themeVars.color.neutralSurface})`,
  borderRadius: 6,
  padding: "12px 13px",
});
```

- [ ] **Step 2: 실패하는 테스트 작성**

`OverviewSection.test.tsx` 에 추가한다. 기존 테스트의 렌더 헬퍼(FormProvider 래핑)를 그대로 쓴다.

```ts
it("체결 완료 등록을 고르면 체결일이 뜨고 검토 요청자가 사라진다", async () => {
  renderSection(); // 기존 헬퍼
  await userEvent.click(screen.getByRole("button", { name: /체결 완료 등록/ }));
  expect(screen.getByText("체결일")).toBeInTheDocument();
  expect(screen.queryByText("검토 요청자")).not.toBeInTheDocument();
});

it("변경·해지를 고르면 원 계약 필드가 나타난다", async () => {
  renderSection();
  await userEvent.click(screen.getByLabelText("변경·해지"));
  expect(screen.getByText("원 계약")).toBeInTheDocument();
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `pnpm --filter @lawai/web test -- OverviewSection`
Expected: FAIL

- [ ] **Step 4: `OverviewSection` 에 등록 유형 + 체결일 + 원 계약 추가**

`return (` 직전에 파생값을 렌더 중 계산한다:

```tsx
  const registerAs = watch("registerAs");
  const stage = watch("stage");
  const isSigned = registerAs === "signed";
  const isChange = stage === "change";
```

`<div className={css.grid2}>` 바로 안쪽 **맨 위**에 등록 유형 블록을 넣는다:

```tsx
        <div className={css.modeRow}>
          <Field label="등록 유형" required>
            <Controller name="registerAs" control={control} render={({ field }) => (
              <ButtonGroup value={field.value} onChange={field.onChange} variant="outline"
                items={[
                  { value: "review", label: "법무 검토 요청", icon: <Icon name="edit" size="sm" /> },
                  { value: "signed", label: "체결 완료 등록", icon: <Icon name="checkSquare" size="sm" /> },
                ]} />
            )} />
          </Field>
          <p className={css.modeHelp}>
            {isSigned
              ? "검토·결재를 건너뛰고 곧바로 체결 완료 상태로 등록합니다."
              : "법무 검토 → 요청자 검토 → 검토 완료 → 체결 품의(결재) → 체결 순서로 진행됩니다."}
          </p>
        </div>
```

`검토 요청자` Field 와 `계약서 유형` Field 를 `{!isSigned && ( ... )}` 로 감싼다.

`계약명` Field 뒤에 체결일과 원 계약을 넣는다:

```tsx
        {isSigned && (
          <Field label="체결일" required>
            <Controller name="signedAt" control={control} render={({ field }) => (
              <Input type="date" value={field.value} onChange={field.onChange} />
            )} />
            <ErrText msg={errors.signedAt?.message} />
          </Field>
        )}

        {isChange && (
          <div className={isSigned ? css.origRequired : css.origOptional}>
            <Field label="원 계약" required={isSigned}
              info="변경·해지 대상 계약입니다. 관련문서로 저장됩니다.">
              {/* 기존 관련문서(relatedDocs) UI 를 그대로 재사용한다.
                  PeopleSection 의 RelatedDocsModal 연결 코드를 참고해 동일하게 연결할 것. */}
            </Field>
            <ErrText msg={errors.relatedDocs?.message as string | undefined} />
          </div>
        )}
```

`css.origOptional` 은 Step 1 에 함께 추가한다(강조 없는 기본 상태):

```ts
export const origOptional = style({ gridColumn: "1 / -1" });
```

`origRequired` 에도 `gridColumn: "1 / -1"` 를 더한다.

**주의 1:** `Icon` 의 `name` 값은 실제 lawkit 아이콘 이름이어야 한다.
`node_modules/@lawkit/ui/CLAUDE.md` 또는 기존 코드에서 실재하는 이름을 확인하고 쓸 것(없는 이름이면 렌더가 깨진다).
**주의 3:** 원 계약 UI 는 새로 만들지 말고 **`PeopleSection` 의 관련문서 구현을 읽고 그대로 재사용**한다.
`relatedDocs` 는 하나의 폼 필드이므로 두 섹션에서 동시에 렌더하면 중복된다 —
`isChange` 일 때는 `PeopleSection` 쪽 관련문서를 숨기고 여기에만 노출할 것.

- [ ] **Step 5: `DocsSection` 에 서명본 업로드 추가**

`DocsSection.tsx` 에서 `watch("registerAs")` 로 분기한다.
`registerAs === "signed"` 면 `계약서`(role `contract`) 업로드 블록 대신
`최종 서명본`(`signedFiles`, role `signed`) 업로드 블록을 렌더한다.
기존 `FileUploadField` 사용부를 그대로 복사해 필드명만 `signedFiles` 로 바꾼다.

안내 문구도 바꾼다:
- 검토: (기존 문구 유지)
- 체결: `"서명·날인이 완료된 최종본을 올려주세요. 서명본 기준으로 AI 리스크 분석이 실행됩니다."`

- [ ] **Step 6: 페이지 제목·버튼 문구 분기**

`ContractRequestPage.tsx` 에서 `methods.watch("registerAs")` 와 `methods.watch("stage")` 로 파생한다.
**기존 인라인 `style={{}}` 은 건드리면 훅이 차단하므로, 새로 추가하는 부분에만 적용**한다.

```tsx
  const registerAs = methods.watch("registerAs");
  const stage = methods.watch("stage");
  const isSigned = registerAs === "signed";
  const pageTitle = isSigned
    ? stage === "change" ? "체결 변경계약 등록" : "체결 계약 등록"
    : "계약서 검토 요청";
  const submitLabel = isSubmitting
    ? (isEdit ? "저장 중…" : "등록 중…")
    : isEdit ? "수정 저장" : isSigned ? "체결 계약 등록" : "검토요청 등록";
```

`<h1>` 의 텍스트를 `{pageTitle}`, 제출 버튼 텍스트를 `{submitLabel}` 로 바꾼다.

- [ ] **Step 7: 테스트 통과 확인**

Run: `pnpm --filter @lawai/web test -- OverviewSection DocsSection ContractRequestPage`
Expected: PASS

- [ ] **Step 8: lint 확인**

Run: `pnpm --filter @lawai/web lint`
Expected: PASS (인라인 스타일 0, 금지 훅 0)

- [ ] **Step 9: 커밋**

```bash
git add apps/web/src/pages/contract
git commit -m "feat: 요청 폼에 등록 유형 분기 UI 추가 - 체결일, 원 계약, 서명본"
```

---

### Task 8: web — 계약 조회 2단 상태 필터 + 만료 + 체결일 컬럼

**Files:**
- Create: `apps/web/src/pages/contract/statusGroups.ts`
- Create: `apps/web/src/pages/contract/statusGroups.test.ts`
- Modify: `apps/web/src/pages/contract/ContractListPage.tsx`
- Modify: `apps/web/src/pages/contract/listColumns.tsx`
- Modify: `apps/web/src/pages/contract/hooks/useContractsList.ts`
- Modify: `apps/web/src/pages/contract/contractList.css.ts`
- Modify: `apps/web/src/api/contracts.ts` (`ListContractsParams`)

**Interfaces:**
- Consumes: Task 2 의 `ContractResponse.signedAt`
- Produces: `STATUS_GROUPS`, `getGroupStatuses(group)`, `StatusGroup` 타입

**시안:** `contract-signing-mockup.html` 탭 2.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/pages/contract/statusGroups.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { STATUS_GROUPS, getGroupStatuses, STATUS_GROUP_LABEL } from "./statusGroups";

describe("statusGroups", () => {
  it("전체 그룹은 세부 상태를 비워 둔다", () => {
    expect(getGroupStatuses("all")).toEqual([]);
  });

  it("체결 그룹은 signing 과 signed 를 담는다", () => {
    expect(getGroupStatuses("sign")).toEqual(["signing", "signed"]);
  });

  it("all 을 제외한 모든 상태가 정확히 한 그룹에만 속한다", () => {
    const all = (Object.keys(STATUS_GROUPS) as (keyof typeof STATUS_GROUPS)[])
      .filter((g) => g !== "all")
      .flatMap((g) => STATUS_GROUPS[g]);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(10);
  });

  it("모든 그룹에 라벨이 있다", () => {
    for (const g of Object.keys(STATUS_GROUPS)) {
      expect(STATUS_GROUP_LABEL[g as keyof typeof STATUS_GROUPS]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @lawai/web test -- statusGroups`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `statusGroups.ts` 작성**

```ts
import type { ContractStatus } from "@lawai/contracts";

/**
 * 상태 필터 1단 — 라이프사이클 단계 그룹.
 * 칩 한 줄에 상태를 전부 늘어놓으면 상태가 늘 때마다 줄이 터진다(현재 10종).
 * 그룹은 라이프사이클이라 개수가 고정이고, 새 상태는 해당 그룹 안으로만 들어간다.
 */
export const STATUS_GROUPS = {
  all: [],
  review: [
    "draft",
    "unassigned",
    "assigning",
    "legalReview",
    "requesterReview",
    "reviewDone",
  ],
  sign: ["signing", "signed"],
  fulfil: ["fulfilling"],
  closed: ["closed"],
} as const satisfies Record<string, readonly ContractStatus[]>;

export type StatusGroup = keyof typeof STATUS_GROUPS;

export const STATUS_GROUP_LABEL: Record<StatusGroup, string> = {
  all: "전체",
  review: "검토",
  sign: "체결",
  fulfil: "이행",
  closed: "종료",
};

export const STATUS_GROUP_ORDER: StatusGroup[] = [
  "all",
  "review",
  "sign",
  "fulfil",
  "closed",
];

export const getGroupStatuses = (group: StatusGroup): ContractStatus[] => [
  ...STATUS_GROUPS[group],
];
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @lawai/web test -- statusGroups`
Expected: PASS

- [ ] **Step 5: 목록 훅에 그룹·만료 상태 추가**

`useContractsList.ts` 에 상태 두 개를 더한다. 기존 `status` 는 그대로 두고
그룹이 바뀌면 세부 상태를 초기화한다(**이벤트 핸들러에서** — effect 금지):

```ts
  const [group, setGroup] = useState<StatusGroup>("all");
  const [expiry, setExpiry] = useState<"" | "d90" | "d180" | "expired">("");

  const changeGroup = (next: StatusGroup): void => {
    setGroup(next);
    setStatus("");   // 그룹이 바뀌면 세부 상태 선택을 버린다
    setPage(1);
  };

  const changeExpiry = (next: "" | "d90" | "d180" | "expired"): void => {
    setExpiry(next);
    setPage(1);
  };
```

`queryKey` 와 `listContracts` 인자에 `group`·`expiry` 를 추가하고, 반환 객체에
`group, changeGroup, expiry, changeExpiry` 를 더한다.

`listContracts` 호출 시 상태 파라미터는 이렇게 결정한다
(세부 상태를 고르면 그것을, 아니면 그룹 전체를 보낸다):

```ts
        status: status || undefined,
        statuses: status ? undefined : getGroupStatuses(group).join(",") || undefined,
        expiry: expiry || undefined,
```

- [ ] **Step 6: `ListContractsParams` 확장**

`apps/web/src/api/contracts.ts` 의 `ListContractsParams` 에 추가하고 `listContracts` 의
`URLSearchParams` 조립부에도 두 줄을 더한다:

```ts
  statuses?: string;
  expiry?: "d90" | "d180" | "expired";
```

```ts
  if (params.statuses) search.set("statuses", params.statuses);
  if (params.expiry) search.set("expiry", params.expiry);
```

**주의:** 게이트웨이·user-service 의 `list` 가 `statuses`/`expiry` 를 아직 모른다.
**이 태스크에서 백엔드까지 함께 구현한다** — `services/api-gateway` 의 list 쿼리 DTO와
`services/user-service` 의 `list()` where 절에 다음을 추가할 것:
- `statuses`: 콤마 분리 문자열 → `status: { in: [...] }`
- `expiry`: `d90`/`d180` → `periodEnd: { gte: now, lte: now + N일 }`, `expired` → `periodEnd: { lt: now }`

user-service `list()` 테스트도 함께 추가한다(그룹 필터 1건, 만료 필터 1건).

- [ ] **Step 7: 체결일 컬럼 추가**

`listColumns.tsx` 에서 `updated`(수정일) 컬럼 **앞**에 추가한다.
기존 날짜 셀(`updated`)의 스타일을 그대로 따른다:

```tsx
    {
      accessorKey: "signedAt",
      header: "체결일",
      size: 96,
      cell: (i) => {
        const v = i.getValue();
        return v ? (
          <span className={listCss.dateCell}>{String(v)}</span>
        ) : (
          <span className={listCss.emptyCell}>—</span>
        );
      },
    },
```

**주의:** `listColumns.tsx` 는 현재 인라인 `style={{}}` 을 쓰고 있다(레거시).
**새로 추가하는 셀은 인라인 금지** — `contractList.css.ts` 에 `dateCell`/`emptyCell` 을 추가해 쓴다.
`ContractRow`(`mock-data.ts`)와 `toListRow.ts` 에도 `signedAt` 을 추가해야 한다.

- [ ] **Step 8: 목록 화면에 2단 필터 렌더**

`ContractListPage.tsx` 에서 기존 `ChipsNavigation`(상태 칩) 블록을 2단으로 교체한다.

1단(그룹): `STATUS_GROUP_ORDER` 를 `.map()` 으로 렌더하는 세그먼트 컨트롤.
2단(세부): `group === "all"` 이면 렌더하지 않고, 아니면
`getGroupStatuses(group).map(...)` 을 `ChipsNavigation` 으로 렌더한다(라벨은 `getStatusLabel`).

만료 드롭다운은 필터 행(검색 입력 뒤, `내 업무만` 앞)에 `Dropdown` 으로 넣는다:
`만료 전체 / 90일 이내 / 180일 이내 / 만료됨`.

페이지 제목을 `계약서 검토 조회` → **`계약 조회`** 로 바꾼다.

스타일은 전부 `contractList.css.ts` 에 추가한다(시안 탭 2 의 `.grpSeg`/`.subbar` 참고, 값은 `themeVars` 로).

- [ ] **Step 9: 테스트 + lint**

Run: `pnpm --filter @lawai/web test && pnpm --filter @lawai/web lint`
Expected: 둘 다 PASS

- [ ] **Step 10: 커밋**

```bash
git add apps/web/src/pages/contract apps/web/src/api/contracts.ts services/api-gateway services/user-service
git commit -m "feat: 계약 조회 2단 상태 필터와 만료 필터, 체결일 컬럼 추가"
```

---

### Task 9: web — 계약 상세 체결 처리

**Files:**
- Modify: `apps/web/src/pages/contract/getActionView.ts`
- Modify: `apps/web/src/pages/contract/getActionView.test.ts`
- Create: `apps/web/src/pages/contract/sections/CompleteSigningModal.tsx`
- Create: `apps/web/src/pages/contract/sections/completeSigningModal.css.ts`
- Create: `apps/web/src/pages/contract/hooks/useCompleteSigning.ts`
- Modify: `apps/web/src/pages/contract/sections/ReviewActionPanel.tsx`
- Modify: `apps/web/src/pages/contract/ContractDetailPage.tsx` (진행 정보에 체결일 행)
- Modify: `apps/web/src/pages/contract/contractDetail.css.ts`

**Interfaces:**
- Consumes: Task 6 의 `completeSigning(id, body)`, Task 2 의 `ContractResponse.signedAt`
- Produces: `ActionButtonKind` 에 `"completeSigning"` 추가, `ApprovalActionContext.isApprovalComplete: boolean`

**시안:** `contract-signing-mockup.html` 탭 3.

- [ ] **Step 1: 실패하는 테스트 작성**

`getActionView.test.ts` 에 추가한다:

```ts
describe("signing - 체결 처리", () => {
  const can = { view: true, edit: false, assign: false, transition: true, delete: false, maskSecret: false };

  it("결재가 완료되고 전이 권한이 있으면 체결 처리 버튼이 뜬다", () => {
    const v = getActionView("signing", can, {
      isRequester: false, isMyTurn: false, canSubmit: false, isApprovalComplete: true,
    });
    expect(v.buttons.map((b) => b.kind)).toContain("completeSigning");
  });

  it("결재가 완료되지 않으면 버튼이 없다", () => {
    const v = getActionView("signing", can, {
      isRequester: false, isMyTurn: false, canSubmit: false, isApprovalComplete: false,
    });
    expect(v.buttons).toHaveLength(0);
  });

  it("전이 권한이 없으면 결재가 완료돼도 버튼이 없다", () => {
    const v = getActionView("signing", { ...can, transition: false }, {
      isRequester: false, isMyTurn: false, canSubmit: false, isApprovalComplete: true,
    });
    expect(v.buttons).toHaveLength(0);
  });

  it("내 차례면 기존 승인/반려가 우선한다", () => {
    const v = getActionView("signing", can, {
      isRequester: false, isMyTurn: true, canSubmit: false, isApprovalComplete: false,
    });
    expect(v.buttons.map((b) => b.kind)).toEqual(["rejectStep", "approveStep"]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter @lawai/web test -- getActionView`
Expected: FAIL

- [ ] **Step 3: `getActionView` 확장**

(1) `ActionButtonKind` 에 추가:

```ts
  | "completeSigning" // 체결 처리 → CompleteSigningModal → completeSigning API
```

(2) `ApprovalActionContext` 에 추가:

```ts
  /** 활성 결재 라인이 전원 승인(approved) 되었는지. 체결 처리 게이트. */
  isApprovalComplete: boolean;
```

(3) `NO_APPROVAL` 에 `isApprovalComplete: false,` 추가.

(4) `APPROVAL_STATUSES` 블록 안, `isMyTurn` 분기 **뒤**·기존 `return` **앞**에 추가:

```ts
    // 결재 전원 승인 + 전이 권한(=sealManager 이고 signing) → 체결 처리.
    if (status === "signing" && approval.isApprovalComplete && can.transition) {
      return {
        head: "체결 처리",
        isApprovalMode: true,
        isSubmitMode: false,
        isDecideMode: false,
        showAssignee: false,
        notice:
          "모든 결재가 완료되었습니다. 서명·날인이 끝난 계약서를 등록하면 체결 완료로 확정됩니다.",
        buttons: [
          {
            kind: "completeSigning",
            label: "체결 처리",
            color: "primary",
            variant: "default",
          },
        ],
      };
    }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @lawai/web test -- getActionView`
Expected: PASS

- [ ] **Step 5: `useCompleteSigning` 훅 작성**

`apps/web/src/pages/contract/hooks/useCompleteSigning.ts`.
같은 폴더의 `useContractApproval.ts` 를 먼저 읽고 **동일한 mutation + invalidate 패턴**을 따른다.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeSigning } from "../../../api/contracts";

export const useCompleteSigning = (contractId: string) => {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: { signedAt: string; fileId?: string | null; note?: string | null }) =>
      completeSigning(contractId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contract", contractId] });
      void qc.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
};
```

**주의:** `queryKey` 는 실제 상세 조회 훅이 쓰는 키와 정확히 일치해야 한다. `useContract*` 훅에서 확인할 것.

- [ ] **Step 6: `CompleteSigningModal` 작성**

시안 탭 3 의 모달을 따른다. 구성: 안내 Callout / 최종 서명본 업로드 / 체결일(date) / 비고(textarea) / 취소·체결 확정.

- 파일 업로드는 기존 `useFileUpload({ contractId })` 를 재사용한다(새로 만들지 말 것).
  업로드 완료된 파일의 `id` 를 `fileId` 로 넘긴다.
- 모달 컴포넌트는 기존 `ApprovalRejectModal.tsx` 의 구조·lawkit Modal 사용법을 그대로 따른다.
- 스타일은 `completeSigningModal.css.ts` 에 vanilla-extract 로. 인라인 금지.
- 체결일 기본값은 오늘 날짜(`new Date().toISOString().slice(0, 10)`).
- `signedAt` 이 비었거나 서명본이 없으면 확정 버튼 `disabled`.

- [ ] **Step 7: `ReviewActionPanel` 에 연결**

`completeSigning` kind 버튼 클릭 시 모달을 연다(로컬 `useState`).
`isApprovalComplete` 는 `approvalLine?.status === "approved"` 로 상위에서 계산해 내려준다
(`ContractDetailPage` 가 `ApprovalActionContext` 를 조립하는 곳을 찾아 필드를 추가).

시안의 액션 패널 강조(성공색 테두리 + 글로우)는 `contractDetail.css.ts` 에 추가한다.
**`prefers-reduced-motion` 을 반드시 존중할 것** — 기존 `ringPulse`/`boxGlow` 키프레임이
이미 같은 패턴으로 되어 있으니 그것을 따른다.

- [ ] **Step 8: 진행 정보에 체결일 행 추가**

`ContractDetailPage.tsx` 의 `진행 정보`(또는 결재 현황) 블록에 체결일 행을 더한다.
값이 없으면 흐린 `미등록` 으로 표시한다(기존 `emptychip` 스타일 재사용 가능).

- [ ] **Step 9: 테스트 + lint**

Run: `pnpm --filter @lawai/web test && pnpm --filter @lawai/web lint`
Expected: 둘 다 PASS

- [ ] **Step 10: 커밋**

```bash
git add apps/web/src/pages/contract
git commit -m "feat: 계약 상세에 체결 처리 액션과 모달 추가"
```

---

### Task 10: 셸 정리 + 통합 검증

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx:21-24`
- Modify: `apps/web/src/components/layout/Sidebar.test.tsx`
- Modify: `apps/web/src/routes.tsx:63-64`

**Interfaces:**
- Consumes: Task 8 의 계약 조회 통합(체결·만료를 흡수했으므로 전용 메뉴가 불필요해짐)

- [ ] **Step 1: 사이드바 항목 정리**

`Sidebar.tsx` 에서 `c-signed`, `c-expire` 두 항목을 **삭제**하고 `c-list` 라벨을 바꾼다:

```ts
      { id: "c-request", label: "계약서 검토 요청", icon: "filePlus", path: "/contract/request" },
      { id: "c-list", label: "계약 조회", icon: "fileFind", path: "/contract/list" },
```

- [ ] **Step 2: 사이드바 테스트 갱신**

`Sidebar.test.tsx` 에서 `체결 계약 조회`·`체결계약 만료 현황` 을 기대하는 단언을 제거하고,
`계약 조회` 가 있고 두 항목이 **없음**을 확인하는 단언으로 바꾼다:

```ts
it("체결 전용 메뉴는 계약 조회로 흡수되어 노출되지 않는다", () => {
  renderSidebar();
  expect(screen.getByText("계약 조회")).toBeInTheDocument();
  expect(screen.queryByText("체결 계약 조회")).not.toBeInTheDocument();
  expect(screen.queryByText("체결계약 만료 현황")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: 라우트 제거**

`routes.tsx` 에서 두 줄을 삭제한다:

```tsx
        <Route path="/contract/signed" element={<ContractPlaceholderPage title="체결 계약 조회" />} />
        <Route path="/contract/expire" element={<ContractPlaceholderPage title="체결계약 만료 현황" />} />
```

`ContractPlaceholderPage` 가 다른 라우트에서도 쓰이는지 확인한다.
**안 쓰이면 import 와 파일을 함께 삭제**하고, 쓰이면 import 를 유지한다.

- [ ] **Step 4: 전체 게이트**

Run: `pnpm turbo run lint test build --force`
Expected: 전부 PASS (uncached)

- [ ] **Step 5: 실행 검증 (수동 E2E)**

Docker Postgres(5433) 를 확인하고 서비스를 띄운다:

```bash
pnpm turbo run dev --filter=@lawai/web --filter=@lawai/api-gateway --filter=@lawai/user-service --filter=@lawai/auth-service
```

로그인 계정이 없으면 만든다:
```bash
curl -s -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" \
  -d '{"email":"demo@lawai.test","password":"Lawai!2345","name":"손준호"}'
```
테넌트 소속이 없으면 DB에 직접 넣는다(`users.Tenant`, `users.UserTenant`, role `inHouseCounsel`).

브라우저로 아래 4가지를 **실제로 확인**한다:
1. `/contract/request` 에서 `체결 완료 등록` 선택 → 체결일·서명본 노출, 검토 요청자 사라짐 → 등록 → 상태가 `체결 완료`
2. `변경·해지` + `체결 완료 등록` → 원 계약 없이 제출하면 막히는지
3. `/contract/list` 에서 단계 그룹 전환 → 세부 상태 칩이 바뀌는지, 만료 드롭다운이 동작하는지, 체결일 컬럼이 보이는지
4. `signing` 상태 + 결재 전원 승인 + `sealManager` 계정 → 상세에서 `체결 처리` 버튼 → 모달 → 확정 → `체결 완료` 전이 + 체결일 표시

**주의:** 컨트롤러가 `null`/`undefined` 를 반환하면 NestJS 가 **빈 본문**을 보내 `res.json()` 이 터진다.
이 레포에는 이미 그 사고 전례가 있다. 새 엔드포인트의 응답이 항상 객체인지 확인할 것.

- [ ] **Step 6: ERD 동기화 재시도**

Task 1 에서 실패했다면 여기서 다시 시도한다. 또 실패하면 커밋 메시지에 명시하고 넘어간다.

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src
git commit -m "refactor: 체결 전용 메뉴와 라우트를 계약 조회로 흡수"
```

---

## Self-Review 결과

**1. 스펙 커버리지**

| 스펙 절 | 태스크 |
| --- | --- |
| §3 데이터 모델 (`signedAt`, `FileRole.signed`) | Task 1 |
| §4 등록 유형 × 계약 단계 (원 계약 강제 규칙) | Task 4(서버 검증) + Task 6(스키마) + Task 7(UI) |
| §5.1 체결 완료 등록 | Task 4 |
| §5.2 `completeSigning` RPC | Task 3 |
| §5.3 게이트웨이 | Task 5 |
| §6.1 요청 폼 | Task 6, 7 |
| §6.2 계약 조회 2단 필터·만료·체결일 | Task 8 |
| §6.3 계약 상세 체결 처리 | Task 9 |
| §6.4 셸 정리 | Task 10 |
| §7 테스트 | 각 태스크에 분산 + Task 10 수동 E2E |

누락 없음.

**2. 플레이스홀더 스캔**

Task 7 Step 4 의 원 계약 UI, Task 9 Step 6 의 모달 본문은 "기존 구현을 읽고 재사용하라"는
지시로 남겼다. 이는 플레이스홀더가 아니라 **중복 구현 방지**가 목적이며, 재사용 대상 파일을
정확히 지목했다(`PeopleSection` 의 relatedDocs, `ApprovalRejectModal`, `useFileUpload`).

**3. 타입 일관성**

- `registerAs: "review" | "signed"` — Task 2(DTO)·4(서버)·6(폼)·7(UI) 전부 동일
- `signedAt` — DTO `string | null`, 폼 `string`(빈 문자열이 미입력), 서버 `parseDate()` 통과. Task 6 의 `toCreateRequest` 에서 `form.signedAt || null` 로 변환하므로 일관
- `isApprovalComplete` — Task 9 에서 정의하고 같은 태스크 안에서만 소비
- `StatusGroup` — Task 8 에서 정의, 같은 태스크의 훅·페이지에서 소비

**4. 알려진 리스크**

- Task 8 은 프론트 + 게이트웨이 + user-service 를 한 태스크에서 건드린다(`statuses`/`expiry` 파라미터가
  세 레이어를 관통하므로 쪼개면 중간 상태가 깨진다). 다른 태스크보다 크므로 리뷰 시 주의.
- `buildRiskPayload` 시그니처는 Task 4 에서 **직접 확인 후** 맞춰야 한다(기존 호출부 복사 권장).
- lawkit `Icon` 의 `name` 은 실재하는 값만 사용해야 한다(Task 7).
