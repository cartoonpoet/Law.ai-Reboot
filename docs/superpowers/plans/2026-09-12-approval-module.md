# 범용 결재 모듈 + 계약 체결 품의 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 범용 결재(approvals) 모듈을 신설하고 계약의 `reviewDone→signing` 체결 품의(상신·순차 결재·반려 복귀·대기함·알림)를 실동작시킨다.

**Architecture:** user-service 안에 폴리모픽 `(targetType, targetId)` 결재 모듈을 만들고, 계약 도메인이 상신을 주도(`contract.submitApproval`)하며 결과는 `ApprovalOutcomeRegistry` 에 등록된 핸들러로 역전파된다. 라인은 상신 시점에만 생성되고, 상신 전 결재선은 `Contract.details.approvers`(JSONB) 로만 존재한다.

**Tech Stack:** Prisma 6 (multiSchema, `shared`), NestJS 11 (TCP RPC + api-gateway REST/JWT), `@lawai/contracts`, React 19 + react-query + vanilla-extract(`themeVars`), Jest(백엔드)/Vitest(프론트)

**Spec:** `docs/superpowers/specs/2026-09-12-approval-module-design.md` (시안: `approval-process-mockup.html`)

## Global Constraints

- 커밋: `<type>: <내용>`, 이모지 금지.
- 프론트(apps/web): 화살표 함수, 커스텀 훅(`use~`), `useEffect`/`useMemo`/`useCallback` 금지(파생은 렌더 중 계산), 인라인 style 금지 — vanilla-extract + `themeVars` 토큰만. lawkit `Input` 은 ref 미전달 → RHF 연결 시 `Controller`.
- 백엔드 테스트: `cd services/user-service && pnpm test -- <파일명 일부>` (jest). 프론트: `cd apps/web && pnpm test -- <경로>` (vitest run).
- DB 스키마 변경 후 erdify MCP 로 "Law.ai Reboot" ERD 동기화(연결 안 되면 사용자에게 보고 후 보류, 작업은 계속).
- dev DB 데이터 폐기 허용(마이그레이션 reset 가능).

---

### Task 1: Prisma 스키마 — 결재 폴리모픽 개조 + 마이그레이션

**Files:**
- Modify: `services/user-service/prisma/schema.prisma` (ApprovalLine/ApprovalStep/Contract/User)

**Interfaces:**
- Produces: `ApprovalLine { targetType, targetId, title, status, tenantId, submittedById, submittedAt, decidedAt }`, `ApprovalStep { userId?, comment?, decidedAt? }`. `Contract.approvalLines` relation 제거.

- [ ] **Step 1: 스키마 수정** — `model ApprovalLine`/`ApprovalStep` 를 아래로 교체하고, `model Contract` 에서 `approvalLines ApprovalLine[]` 줄 삭제, `model User` 에 두 relation 추가.

```prisma
model ApprovalLine {
  id            String         @id @default(uuid())
  targetType    String
  targetId      String
  title         String
  status        ApprovalStatus @default(pending)
  tenantId      String
  submittedById String
  submittedAt   DateTime       @default(now())
  decidedAt     DateTime?
  createdAt     DateTime       @default(now())

  submittedBy User           @relation("SubmittedApprovalLines", fields: [submittedById], references: [id])
  steps       ApprovalStep[]

  @@index([targetType, targetId])
  @@index([status])
  @@schema("shared")
}

model ApprovalStep {
  id        String       @id @default(uuid())
  lineId    String
  stepOrder Int
  userId    String?
  name      String
  dept      String
  type      ApproverType
  status    StepStatus   @default(pending)
  comment   String?
  decidedAt DateTime?

  line ApprovalLine @relation(fields: [lineId], references: [id], onDelete: Cascade)
  user User?        @relation("UserApprovalSteps", fields: [userId], references: [id])

  @@index([lineId])
  @@index([userId, status])
  @@schema("shared")
}
```

User 에 추가: `submittedApprovalLines ApprovalLine[] @relation("SubmittedApprovalLines")`, `approvalSteps ApprovalStep[] @relation("UserApprovalSteps")`.

- [ ] **Step 2: 마이그레이션** — `cd services/user-service && npx prisma migrate dev --name approval_polymorphic`. drift 로 reset 요구 시 수락(dev 데이터 폐기 허용). client 재생성 확인.
- [ ] **Step 3: 컴파일 깨짐 임시 확인** — `npx tsc --noEmit` 은 contracts.service 의 `approvalLines` 참조로 실패할 것(Task 4 에서 수리). 이 단계에서는 스키마·마이그레이션 파일만 커밋.
- [ ] **Step 4: erdify MCP 로 "Law.ai Reboot" ERD 에 동일 변경 반영** (미연결이면 보고 후 보류)
- [ ] **Step 5: Commit** — `git add services/user-service/prisma && git commit -m "feat: 결재 라인/스텝 폴리모픽 개조 (target 참조 + 결재자 userId)"`

### Task 2: @lawai/contracts — 결재 DTO/패턴

**Files:**
- Create: `packages/contracts/src/dto/approval.dto.ts`
- Modify: `packages/contracts/src/patterns.ts`, `packages/contracts/src/dto/contract.dto.ts`, `packages/contracts/src/index.ts`

**Interfaces:**
- Produces: `APPROVAL_PATTERNS = { DECIDE:"approval.decide", INBOX:"approval.inbox", GET_ACTIVE:"approval.getActive" }`, `CONTRACT_PATTERNS.SUBMIT_APPROVAL = "contract.submitApproval"`, 아래 DTO 전부. `ApproverSnapshot.userId?: string | null`. `ApprovalStepResponse` 에 `userId/comment/decidedAt` 추가, `ApprovalLineResponse` 에 `currentStepId/submittedById/submittedAt` 추가, `ContractResponse.plannedApprovers: ApproverSnapshot[]` 추가. `SubmitContractApprovalRequest/Result`.

- [ ] **Step 1: approval.dto.ts 작성**

```ts
import type { TenantContext } from "./tenant.dto";
import type { ApproverType, ApprovalStatus, StepStatus } from "./contract.dto";
import type { PushNotification } from "./comment.dto";

// 결재 스텝 DTO. draft 는 상신 시 approved 로 생성, refer 는 승인 대상 아님(항상 pending 표시).
export interface ApprovalStepDto {
  id: string;
  stepOrder: number;
  userId: string | null;
  name: string;
  dept: string;
  type: ApproverType;
  status: StepStatus;
  comment: string | null;
  decidedAt: string | null;
}

export interface ApprovalLineDto {
  id: string;
  targetType: string; // "contract"
  targetId: string;
  title: string;
  status: ApprovalStatus;
  submittedById: string;
  submittedByName: string;
  submittedAt: string;
  decidedAt: string | null;
  steps: ApprovalStepDto[];
  // 현재 차례(approve/agree 중 stepOrder 최소 pending). 없으면 null(확정됨).
  currentStepId: string | null;
}

// 승인/반려. 대상 스텝은 서버가 현재 차례로 파생(stepId 미수신 — 경합·위조 차단).
export interface DecideApprovalRequest {
  lineId: string;
  decision: "approve" | "reject";
  comment?: string;
  viewerId?: string;
  tenantContext?: TenantContext;
}

export interface DecideApprovalResult {
  line: ApprovalLineDto;
  notifications: PushNotification[];
}

export interface ApprovalInboxRequest {
  viewerId?: string;
  tenantContext?: TenantContext;
}

export interface ApprovalInboxItem {
  lineId: string;
  targetType: string;
  targetId: string;
  title: string;
  submittedById: string;
  submittedByName: string;
  submittedByDept: string;
  myStepOrder: number; // 0-based
  totalSteps: number; // 승인 필요(approve/agree) 스텝 수
  myType: ApproverType;
  submittedAt: string;
  lineStatus: ApprovalStatus;
  myStatus: StepStatus;
  myDecidedAt: string | null;
}

export interface ApprovalInboxResponse {
  pending: ApprovalInboxItem[]; // 내 차례인 진행 중 라인
  processed: ApprovalInboxItem[]; // 내가 승인/반려한 라인(최근 30일)
}

export interface GetActiveApprovalRequest {
  targetType: string;
  targetId: string;
  tenantContext?: TenantContext;
}

export interface GetActiveApprovalResponse {
  line: ApprovalLineDto | null; // 최신 라인(submittedAt desc)
  historyCount: number; // 이전 라인 수
}
```

- [ ] **Step 2: contract.dto.ts 수정** — `ApproverSnapshot` 에 `userId?: string | null;` 추가. `ApprovalStepResponse` 에 `userId: string | null; comment: string | null; decidedAt: string | null;` 추가. `ApprovalLineResponse` 에 `currentStepId: string | null; submittedById: string; submittedAt: string;` 추가. `ContractResponse` 에 `plannedApprovers: ApproverSnapshot[];` 추가. 그리고 상신 요청/응답:

```ts
export interface SubmitContractApprovalRequest {
  id: string;
  viewerId?: string;
  tenantContext?: TenantContext;
}
export interface SubmitContractApprovalResult {
  contract: ContractResponse;
  notifications: PushNotification[]; // gateway 가 SSE push
}
```

(`PushNotification` 은 `./comment.dto` 에서 import)

- [ ] **Step 3: patterns.ts** — `CONTRACT_PATTERNS` 에 `SUBMIT_APPROVAL: "contract.submitApproval",` 추가하고 아래 신설:

```ts
export const APPROVAL_PATTERNS = {
  DECIDE: "approval.decide",
  INBOX: "approval.inbox",
  GET_ACTIVE: "approval.getActive",
} as const;
```

- [ ] **Step 4: index.ts 에 `export * from "./dto/approval.dto";` 추가 후 빌드 확인** — `cd packages/contracts && pnpm build` (스크립트 없으면 `npx tsc --noEmit`)
- [ ] **Step 5: Commit** — `git commit -m "feat: 결재 계약 추가 (approval DTO/패턴 + 계약 상신 DTO)"`

### Task 3: approvals 모듈 (user-service) — 서비스 + RPC + outcome 레지스트리

**Files:**
- Create: `services/user-service/src/approvals/approval-outcome.ts`
- Create: `services/user-service/src/approvals/approvals.service.ts`
- Create: `services/user-service/src/approvals/approvals.service.spec.ts`
- Create: `services/user-service/src/approvals/approvals.controller.ts`
- Create: `services/user-service/src/approvals/approvals.module.ts`
- Modify: `services/user-service/src/app.module.ts` (ApprovalsModule import)

**Interfaces:**
- Consumes: `NotificationService.createMany(items: CreateNotificationInput[]): Promise<PushNotification[]>` (notifications 모듈), `PrismaService`.
- Produces:
  - `ApprovalOutcomeRegistry.register(handler: ApprovalOutcomeHandler)` / `get(targetType): ApprovalOutcomeHandler | undefined`
  - `ApprovalsService.submit(input: SubmitApprovalInput): Promise<{ line: ApprovalLineDto; notifications: PushNotification[] }>`
  - `ApprovalsService.decide(req: DecideApprovalRequest): Promise<DecideApprovalResult>`
  - `ApprovalsService.inbox(req: ApprovalInboxRequest): Promise<ApprovalInboxResponse>`
  - `ApprovalsService.getActive(targetType: string, targetId: string): Promise<GetActiveApprovalResponse>`

- [ ] **Step 1: approval-outcome.ts 작성**

```ts
import { Injectable } from "@nestjs/common";
import type { ApprovalLineDto } from "@lawai/contracts";

// 결재 확정(승인/반려)을 대상 도메인으로 역전파하는 핸들러 계약.
// approvals 모듈은 대상 도메인을 모른다 — 도메인 모듈이 onModuleInit 에서 register 한다.
export interface ApprovalOutcomeHandler {
  targetType: string; // "contract"
  onApproved(line: ApprovalLineDto): Promise<void>;
  onRejected(line: ApprovalLineDto, rejectedStepId: string): Promise<void>;
}

@Injectable()
export class ApprovalOutcomeRegistry {
  private readonly handlers = new Map<string, ApprovalOutcomeHandler>();
  register(handler: ApprovalOutcomeHandler): void {
    this.handlers.set(handler.targetType, handler);
  }
  get(targetType: string): ApprovalOutcomeHandler | undefined {
    return this.handlers.get(targetType);
  }
}
```

- [ ] **Step 2: 실패하는 서비스 테스트 작성** (`approvals.service.spec.ts`) — 기존 `contracts.service.spec.ts` 의 PrismaService mock 패턴을 따른다. 핵심 케이스:

```ts
import { RpcException } from "@nestjs/microservices";
import { ApprovalsService, SubmitApprovalInput } from "./approvals.service";
import { ApprovalOutcomeRegistry } from "./approval-outcome";

// prisma/notification mock 헬퍼
const makeLine = (steps: any[], over: Partial<any> = {}) => ({
  id: "L1", targetType: "contract", targetId: "C1", title: "테스트 계약",
  status: "pending", tenantId: "T1", submittedById: "u-req",
  submittedAt: new Date("2026-09-11"), decidedAt: null, createdAt: new Date(),
  submittedBy: { id: "u-req", name: "한지원" },
  steps, ...over,
});
const step = (order: number, over: Partial<any> = {}) => ({
  id: `S${order}`, lineId: "L1", stepOrder: order, userId: `u${order}`,
  name: `이름${order}`, dept: "부서", type: "approve", status: "pending",
  comment: null, decidedAt: null, ...over,
});

describe("ApprovalsService", () => {
  let prisma: any; let noti: any; let registry: ApprovalOutcomeRegistry; let svc: ApprovalsService;
  beforeEach(() => {
    prisma = {
      approvalLine: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      approvalStep: { update: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    noti = { createMany: jest.fn().mockResolvedValue([]) };
    registry = new ApprovalOutcomeRegistry();
    svc = new ApprovalsService(prisma, noti, registry);
  });

  it("submit: 라인 생성 — draft 는 즉시 approved, 첫 차례 approval_turn + refer approval_referred 알림", async () => {
    prisma.approvalLine.create.mockResolvedValue(makeLine([
      step(0, { id: "S0", userId: "u-req", type: "draft", status: "approved" }),
      step(1), step(2, { type: "refer", userId: "u-ref" }),
    ]));
    const input: SubmitApprovalInput = {
      targetType: "contract", targetId: "C1", title: "테스트 계약",
      submittedById: "u-req", tenantId: "T1",
      steps: [
        { userId: "u-req", name: "한지원", dept: "사업개발팀", type: "draft" },
        { userId: "u1", name: "이름1", dept: "부서", type: "approve" },
        { userId: "u-ref", name: "참조자", dept: "부서", type: "refer" },
      ],
    };
    const result = await svc.submit(input);
    expect(result.line.currentStepId).toBe("S1");
    const types = noti.createMany.mock.calls[0][0].map((n: any) => [n.type, n.recipientId]);
    expect(types).toContainEqual(["approval_turn", "u1"]);
    expect(types).toContainEqual(["approval_referred", "u-ref"]);
  });

  it("decide: 내 차례가 아니면 403", async () => {
    prisma.approvalLine.findUnique.mockResolvedValue(makeLine([step(0), step(1)]));
    await expect(
      svc.decide({ lineId: "L1", decision: "approve", viewerId: "u1", tenantContext: { tenantId: "T1" } as any }),
    ).rejects.toMatchObject({ error: expect.objectContaining({ status: 403 }) });
  });

  it("decide 승인: 다음 차례에게 approval_turn, 라인은 pending 유지", async () => {
    prisma.approvalLine.findUnique.mockResolvedValue(makeLine([step(0), step(1)]));
    prisma.approvalStep.update.mockResolvedValue(step(0, { status: "approved" }));
    const result = await svc.decide({ lineId: "L1", decision: "approve", comment: "확인", viewerId: "u0", tenantContext: { tenantId: "T1" } as any });
    expect(result.line.status).toBe("pending");
    expect(result.line.currentStepId).toBe("S1");
    const types = noti.createMany.mock.calls[0][0].map((n: any) => [n.type, n.recipientId]);
    expect(types).toContainEqual(["approval_turn", "u1"]);
  });

  it("decide 마지막 승인: 라인 approved + onApproved 호출 + 상신자 approval_completed", async () => {
    const onApproved = jest.fn();
    registry.register({ targetType: "contract", onApproved, onRejected: jest.fn() });
    prisma.approvalLine.findUnique.mockResolvedValue(
      makeLine([step(0, { status: "approved" }), step(1), step(2, { type: "refer", userId: "u-ref" })]),
    );
    prisma.approvalStep.update.mockResolvedValue(step(1, { status: "approved" }));
    prisma.approvalLine.update.mockResolvedValue(makeLine([], { status: "approved" }));
    const result = await svc.decide({ lineId: "L1", decision: "approve", viewerId: "u1", tenantContext: { tenantId: "T1" } as any });
    expect(result.line.status).toBe("approved");
    expect(onApproved).toHaveBeenCalled();
    const types = noti.createMany.mock.calls[0][0].map((n: any) => [n.type, n.recipientId]);
    expect(types).toContainEqual(["approval_completed", "u-req"]);
  });

  it("decide 반려: 라인 rejected + onRejected 호출 + 상신자 approval_rejected", async () => {
    const onRejected = jest.fn();
    registry.register({ targetType: "contract", onApproved: jest.fn(), onRejected });
    prisma.approvalLine.findUnique.mockResolvedValue(makeLine([step(0)]));
    prisma.approvalStep.update.mockResolvedValue(step(0, { status: "rejected" }));
    prisma.approvalLine.update.mockResolvedValue(makeLine([], { status: "rejected" }));
    const result = await svc.decide({ lineId: "L1", decision: "reject", comment: "예산 초과", viewerId: "u0", tenantContext: { tenantId: "T1" } as any });
    expect(result.line.status).toBe("rejected");
    expect(onRejected).toHaveBeenCalledWith(expect.anything(), "S0");
    const types = noti.createMany.mock.calls[0][0].map((n: any) => [n.type, n.recipientId]);
    expect(types).toContainEqual(["approval_rejected", "u-req"]);
  });

  it("decide: 확정된 라인이면 400", async () => {
    prisma.approvalLine.findUnique.mockResolvedValue(makeLine([step(0, { status: "approved" })], { status: "approved" }));
    await expect(
      svc.decide({ lineId: "L1", decision: "approve", viewerId: "u0", tenantContext: { tenantId: "T1" } as any }),
    ).rejects.toMatchObject({ error: expect.objectContaining({ status: 400 }) });
  });

  it("inbox: 내 차례(pending)와 처리한 결재(processed)를 나눠 반환", async () => {
    prisma.approvalLine.findMany
      .mockResolvedValueOnce([makeLine([step(0, { userId: "me" }), step(1)])]) // pending 후보
      .mockResolvedValueOnce([makeLine([step(0, { userId: "me", status: "approved", decidedAt: new Date() })], { id: "L2", status: "approved" })]);
    const res = await svc.inbox({ viewerId: "me", tenantContext: { tenantId: "T1" } as any });
    expect(res.pending).toHaveLength(1);
    expect(res.pending[0].myStepOrder).toBe(0);
    expect(res.processed).toHaveLength(1);
  });

  it("inbox: 내 스텝이 있어도 앞 단계가 pending 이면 pending 목록에 없음", async () => {
    prisma.approvalLine.findMany
      .mockResolvedValueOnce([makeLine([step(0), step(1, { userId: "me" })])])
      .mockResolvedValueOnce([]);
    const res = await svc.inbox({ viewerId: "me", tenantContext: { tenantId: "T1" } as any });
    expect(res.pending).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인** — `cd services/user-service && pnpm test -- approvals.service` → 모듈 없음으로 FAIL
- [ ] **Step 4: approvals.service.ts 구현** — 핵심 로직:

```ts
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  ApprovalInboxRequest, ApprovalInboxResponse, ApprovalInboxItem,
  ApprovalLineDto, ApprovalStepDto, ApproverType,
  DecideApprovalRequest, DecideApprovalResult, GetActiveApprovalResponse,
  PushNotification,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notifications.service";
import { ApprovalOutcomeRegistry } from "./approval-outcome";

export interface SubmitApprovalInput {
  targetType: string;
  targetId: string;
  title: string;
  submittedById: string;
  tenantId: string;
  steps: { userId: string | null; name: string; dept: string; type: ApproverType }[];
}

const lineInclude = {
  submittedBy: { select: { id: true, name: true } },
  steps: { orderBy: { stepOrder: "asc" as const } },
};

// 승인 필요 스텝(approve/agree)만 결재 진행 대상. draft 는 상신 시 approved, refer 는 표시/알림 전용.
const isDecisionStep = (t: string) => t === "approve" || t === "agree";
const currentStepOf = (steps: { type: string; status: string }[]) =>
  steps.filter((s) => isDecisionStep(s.type)).find((s) => s.status === "pending") ?? null;
```

`toLineDto(row)`: 필드 매핑 + `currentStepId = currentStepOf(row.steps)?.id ?? null`, 날짜는 `toISOString()`.

`submit(input)`: `prisma.approvalLine.create({ data: { ..., steps: { create: input.steps.map((s, i) => ({ stepOrder: i, userId: s.userId, name: s.name, dept: s.dept, type: s.type, status: s.type === "draft" ? "approved" : "pending", decidedAt: s.type === "draft" ? new Date() : null })) } }, include: lineInclude })`. 알림: 현재 차례 userId → `approval_turn`, refer 스텝의 userId → `approval_referred` (userId null 이면 건너뜀). `notifications = await this.noti.createMany(items)` — `targetType: "ApprovalLine", targetId: line.id, actorId: submittedById, tenantId: input.tenantId, detail: { targetType, targetId, title }`.

`decide(req)`: 라인 로드(findUnique + include, 없으면 404) → `line.status !== "pending"` 이면 400 → `current = currentStepOf(steps)`; `!current || current.userId !== req.viewerId` 이면 403 → 스텝 update(status approve→approved/reject→rejected, comment, decidedAt) → 반려면 라인 update(rejected, decidedAt) + `registry.get(targetType)?.onRejected(dto, current.id)` + 상신자 `approval_rejected`; 승인이면 남은 현재 차례 재계산 — 있으면 그 userId 에 `approval_turn`, 없으면 라인 update(approved, decidedAt) + `onApproved(dto)` + 상신자 `approval_completed`. 최종 라인 재조회 후 `{ line, notifications }` 반환. RpcException 형식은 contracts.service 와 동일(`new RpcException({ status, message })`).

`inbox(req)`: ① pending 후보 — `approvalLine.findMany({ where: { status: "pending", tenantId, steps: { some: { userId: viewerId, status: "pending" } } }, include: lineInclude, orderBy: { submittedAt: "desc" } })` 후 JS 로 `currentStepOf(...)?.userId === viewerId` 필터. ② processed — `findMany({ where: { tenantId, steps: { some: { userId: viewerId, decidedAt: { not: null } } }, submittedAt: { gte: 30일 전 } }, ... })`. `toInboxItem(line, viewerId)`: 내 스텝 찾기, `totalSteps = 승인필요 스텝 수`, `myStepOrder = 승인필요 스텝 중 내 위치(0-based)`.

`getActive(targetType, targetId)`: `findFirst({ where: { targetType, targetId }, orderBy: { submittedAt: "desc" }, include })` + `count - 1` (라인 없으면 0).

- [ ] **Step 5: 테스트 통과 확인** — `pnpm test -- approvals.service` → PASS
- [ ] **Step 6: controller/module 작성** — `approvals.controller.ts`: `@MessagePattern(APPROVAL_PATTERNS.DECIDE/INBOX/GET_ACTIVE)` 3개, contracts.controller.ts 패턴 동일(페이로드 그대로 서비스 위임). `approvals.module.ts`:

```ts
@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalOutcomeRegistry],
  exports: [ApprovalsService, ApprovalOutcomeRegistry],
})
export class ApprovalsModule {}
```

(NotificationsModule 이 NotificationService 를 export 하는지 확인 — 아니면 export 추가. PrismaModule 이 global 이면 imports 생략.) `app.module.ts` 에 `ApprovalsModule` 추가.

- [ ] **Step 7: 전체 테스트/컴파일** — `pnpm test` (contracts 쪽 실패는 Task 4 대상이므로 approvals 만 green 확인), `npx tsc --noEmit` 오류가 contracts.service 뿐인지 확인
- [ ] **Step 8: Commit** — `git commit -m "feat: 범용 결재 모듈 (순차 결재/대기함/outcome 레지스트리)"`

### Task 4: contracts 통합 — 상신 RPC·결재선 저장 방식 전환·반려 복귀 핸들러

**Files:**
- Create: `services/user-service/src/contracts/contract-approval.handler.ts`
- Modify: `services/user-service/src/contracts/contracts.service.ts`
- Modify: `services/user-service/src/contracts/contracts.controller.ts` (SUBMIT_APPROVAL 핸들러)
- Modify: `services/user-service/src/contracts/contracts.module.ts` (ApprovalsModule import + 핸들러 provider)
- Modify: `services/user-service/src/contracts/contracts.service.spec.ts` (기존 결재선 관련 기대 수정 + 신규 테스트)

**Interfaces:**
- Consumes: `ApprovalsService.submit/getActive`, `ApprovalOutcomeRegistry.register`
- Produces: RPC `contract.submitApproval(req: SubmitContractApprovalRequest): SubmitContractApprovalResult`. `ContractResponse.plannedApprovers` + `approvalLine`(활성 라인 파생, 기존 shape 유지+확장). `ALLOWED_TRANSITIONS.signing = ["signed", "reviewDone"]`.

- [ ] **Step 1: 실패 테스트 추가** (contracts.service.spec.ts) — submitApproval 4케이스 + 반려 복귀:

```ts
describe("submitApproval", () => {
  it("요청자 본인이 아니면 403", async () => { /* createdById !== viewerId → RpcException 403 */ });
  it("reviewDone 이 아니면 400", async () => { /* status: "legalReview" → 400 */ });
  it("details.approvers 비어 있으면 400", async () => {});
  it("pending 라인이 이미 있으면 409", async () => { /* approvals.getActive 가 pending 라인 반환하도록 mock */ });
  it("성공: approvals.submit 호출 + 상태 signing 전이 + 알림 반환", async () => {});
});
describe("ContractApprovalOutcomeHandler", () => {
  it("onRejected: 계약을 reviewDone 으로 되돌린다", async () => {});
  it("onApproved: 상태 변경 없음(signing 유지)", async () => {});
});
```

(mock: `approvals = { submit: jest.fn(), getActive: jest.fn().mockResolvedValue({ line: null, historyCount: 0 }) }` 를 ContractsService 생성자에 주입. 기존 spec 의 생성자 시그니처 변경에 맞춰 전체 검색·수정.)

- [ ] **Step 2: 실패 확인** — `pnpm test -- contracts.service`
- [ ] **Step 3: contracts.service.ts 수정**
  - `ALLOWED_TRANSITIONS.signing` 을 `["signed", "reviewDone"]` 로.
  - 생성자에 `private readonly approvals: ApprovalsService` 추가.
  - `contractInclude` 에서 `approvalLines` 제거.
  - create: `approvalLines: {...}` 블록 삭제, `details: { ...req.details, approvers: req.approvers } as unknown as Prisma.InputJsonValue`. update 도 동일(`req.approvers !== undefined` 인 경우에만 details 병합 갱신).
  - `toResponse(row, line?: ApprovalLineDto | null)`: `approvalLine` 을 인자 `line` 에서 매핑(기존 shape + userId/comment/decidedAt/currentStepId/submittedById/submittedAt), `plannedApprovers: ((row.details as ContractDetailsV1 & { approvers?: ApproverSnapshot[] }).approvers) ?? []`. 호출부: `get` 은 `const active = await this.approvals.getActive("contract", id)` 후 `toResponse(row, active.line)`, `list`/`create`/`update`/`updateStatus` 는 `toResponse(row, null)` (목록·쓰기 응답은 라인 불필요 — get 재조회 관행 유지).
  - `submitApproval(req)`:

```ts
async submitApproval(req: SubmitContractApprovalRequest): Promise<SubmitContractApprovalResult> {
  const ctx = req.tenantContext;
  const row = await this.findOr404(req.id, ctx);
  if (!req.viewerId || row.createdById !== req.viewerId) {
    throw new RpcException({ status: 403, message: "요청자 본인만 상신할 수 있습니다" });
  }
  if (row.status !== "reviewDone") {
    throw new RpcException({ status: 400, message: "검토 완료 상태에서만 상신할 수 있습니다" });
  }
  const approvers = ((row.details as unknown as { approvers?: ApproverSnapshot[] }).approvers) ?? [];
  if (approvers.length === 0) {
    throw new RpcException({ status: 400, message: "결재선이 비어 있습니다" });
  }
  const active = await this.approvals.getActive("contract", row.id);
  if (active.line?.status === "pending") {
    throw new RpcException({ status: 409, message: "진행 중인 결재가 이미 있습니다" });
  }
  const { line, notifications } = await this.approvals.submit({
    targetType: "contract", targetId: row.id, title: row.title,
    submittedById: req.viewerId, tenantId: row.tenantId,
    steps: approvers.map((a) => ({ userId: a.userId ?? null, name: a.name, dept: a.dept, type: a.type })),
  });
  const updated = await this.prisma.contract.update({
    where: { id: row.id }, data: { status: "signing" }, include: contractInclude,
  });
  await this.audit.record({ action: "submitApproval", targetType: "Contract", targetId: row.id, actorId: req.viewerId, tenantId: row.tenantId });
  return { contract: this.toResponse(updated, line), notifications };
}
```

- [ ] **Step 4: contract-approval.handler.ts 작성**

```ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import type { ApprovalLineDto } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { ApprovalOutcomeRegistry, ApprovalOutcomeHandler } from "../approvals/approval-outcome";

// 결재 확정 → 계약 상태 역전파. 반려 시 signing→reviewDone 복귀(전이맵 내부 경로).
@Injectable()
export class ContractApprovalOutcomeHandler implements ApprovalOutcomeHandler, OnModuleInit {
  readonly targetType = "contract";
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ApprovalOutcomeRegistry,
  ) {}
  onModuleInit(): void {
    this.registry.register(this);
  }
  async onApproved(): Promise<void> {
    // 승인 완료 시 계약은 signing 유지 — 날인(signing→signed)은 별도 조각.
  }
  async onRejected(line: ApprovalLineDto): Promise<void> {
    await this.prisma.contract.updateMany({
      where: { id: line.targetId, status: "signing" },
      data: { status: "reviewDone" },
    });
  }
}
```

- [ ] **Step 5: controller/module 배선** — contracts.controller 에 `@MessagePattern(CONTRACT_PATTERNS.SUBMIT_APPROVAL)` 추가(기존 핸들러와 동일 위임). contracts.module 에 `imports: [ApprovalsModule]`(기존 imports 유지) + `providers` 에 `ContractApprovalOutcomeHandler` 추가.
- [ ] **Step 6: 전체 테스트** — `pnpm test` → 전부 PASS (`tsc --noEmit` 도 클린)
- [ ] **Step 7: Commit** — `git commit -m "feat: 계약 체결 품의 상신 + 반려 복귀 (결재선 details 저장 전환)"`

### Task 5: api-gateway — 결재 엔드포인트

**Files:**
- Create: `services/api-gateway/src/approvals/dto.ts`
- Create: `services/api-gateway/src/approvals/approvals.controller.ts`
- Create: `services/api-gateway/src/approvals/approvals.module.ts`
- Modify: `services/api-gateway/src/contracts/contracts.controller.ts` (상신 엔드포인트)
- Modify: `services/api-gateway/src/app.module.ts`

**Interfaces:**
- Produces: `GET /approvals/inbox` → `ApprovalInboxResponse`, `POST /approvals/:lineId/decide` → `ApprovalLineDto`, `POST /contracts/:id/approval/submit` → `ContractResponse`. decide/submit 은 결과의 `notifications` 를 `NotificationHubService.push` 로 SSE 전달(코멘트 패턴 동일).

- [ ] **Step 1: dto.ts** —

```ts
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
export class DecideApprovalDto {
  @IsIn(["approve", "reject"]) decision!: "approve" | "reject";
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}
```

- [ ] **Step 2: approvals.controller.ts** — `@Controller("approvals")` + `JwtAuthGuard`, notifications.controller 의 `USER_CLIENT`/`rpcToHttp`/`extractTenantContext` 패턴 그대로:
  - `@Get("inbox")` → `APPROVAL_PATTERNS.INBOX` `{ viewerId: sub, tenantContext }`
  - `@Post(":lineId/decide")` → `APPROVAL_PATTERNS.DECIDE` `{ lineId, decision, comment, viewerId: sub, tenantContext }` → `map((r: DecideApprovalResult) => { r.notifications.forEach((n) => this.hub.push(n.recipientId, n.notification)); return r.line; })`
- [ ] **Step 3: approvals.module.ts** — contracts 게이트웨이 모듈과 동일 구성(USER_CLIENT client + NotificationHubModule import). app.module 에 등록.
- [ ] **Step 4: contracts.controller.ts 에 상신 추가** —

```ts
@ApiOperation({ summary: "체결 품의 상신", description: "요청자 본인 + 검토 완료 상태에서만" })
@Post(":id/approval/submit")
submitApproval(@Param("id") id: string, @Req() req: Request): Promise<ContractResponse> {
  const { sub } = (req as Request & { user: JwtPayload }).user;
  const payload: SubmitContractApprovalRequest = { id, viewerId: sub, tenantContext: extractTenantContext(req) };
  return firstValueFrom(
    this.userClient.send<SubmitContractApprovalResult>(CONTRACT_PATTERNS.SUBMIT_APPROVAL, payload).pipe(
      rpcToHttp(),
      map((result) => {
        result.notifications.forEach((n) => this.hub.push(n.recipientId, n.notification));
        return result.contract;
      }),
    ),
  );
}
```

- [ ] **Step 5: 게이트웨이 빌드 확인** — `cd services/api-gateway && npx tsc --noEmit`
- [ ] **Step 6: Commit** — `git commit -m "feat: gateway 결재 엔드포인트 (inbox/decide/상신)"`

### Task 6: web — 결재 API 모듈 + 결재 대기함 화면

**Files:**
- Create: `apps/web/src/api/approvals.ts`
- Create: `apps/web/src/pages/approval/toInboxRow.ts`
- Create: `apps/web/src/pages/approval/toInboxRow.test.ts`
- Create: `apps/web/src/pages/approval/hooks/useApprovalInbox.ts`
- Create: `apps/web/src/pages/approval/ApprovalInboxPage.tsx`
- Create: `apps/web/src/pages/approval/approvalInbox.css.ts`
- Modify: `apps/web/src/routes.tsx`, `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/api/contracts.ts`

**Interfaces:**
- Consumes: `GET /approvals/inbox`, `POST /approvals/:lineId/decide`, `POST /contracts/:id/approval/submit`
- Produces: `getApprovalInbox(): Promise<ApprovalInboxResponse>`, `decideApproval(lineId, body: { decision, comment? }): Promise<ApprovalLineDto>`, `submitContractApproval(id): Promise<ContractResponse>`, `toInboxRow(item: ApprovalInboxItem): InboxRow`, 라우트 `/approvals/inbox`, 사이드바 "결재" 그룹.

- [ ] **Step 1: api 모듈** — `approvals.ts`:

```ts
import type { ApprovalInboxResponse, ApprovalLineDto } from "@lawai/contracts";
import { apiFetch } from "./client";

export const getApprovalInbox = (): Promise<ApprovalInboxResponse> =>
  apiFetch("/approvals/inbox");

export const decideApproval = (
  lineId: string,
  body: { decision: "approve" | "reject"; comment?: string },
): Promise<ApprovalLineDto> =>
  apiFetch(`/approvals/${lineId}/decide`, { method: "POST", body: JSON.stringify(body) });
```

`contracts.ts` 에 `export const submitContractApproval = (id: string): Promise<ContractResponse> => apiFetch(\`/contracts/${id}/approval/submit\`, { method: "POST" });` (기존 apiFetch 옵션 관행 — headers 자동이면 그대로 — 확인 후 동일하게).

- [ ] **Step 2: 실패 테스트** — `toInboxRow.test.ts`:

```ts
import { toInboxRow } from "./toInboxRow";

const item = {
  lineId: "L1", targetType: "contract", targetId: "C1", title: "클라우드 이용계약",
  submittedById: "u1", submittedByName: "한지원", submittedByDept: "사업개발팀",
  myStepOrder: 1, totalSteps: 3, myType: "approve" as const,
  submittedAt: "2026-09-11T01:00:00.000Z", lineStatus: "pending" as const,
  myStatus: "pending" as const, myDecidedAt: null,
};

it("계약 대상은 상세 경로로 딥링크한다", () => {
  expect(toInboxRow(item).href).toBe("/contract/C1");
});
it("내 단계는 1-based n/m 로 표기한다", () => {
  const row = toInboxRow(item);
  expect(row.stepLabel).toBe("2/3");
});
it("유형 라벨: approve→결재, agree→합의", () => {
  expect(toInboxRow(item).typeLabel).toBe("결재");
  expect(toInboxRow({ ...item, myType: "agree" }).typeLabel).toBe("합의");
});
it("결재 유형 라벨: contract → 체결 품의", () => {
  expect(toInboxRow(item).kindLabel).toBe("체결 품의");
});
```

- [ ] **Step 3: 실패 확인** — `cd apps/web && pnpm test -- src/pages/approval/toInboxRow`
- [ ] **Step 4: toInboxRow.ts 구현** — `TARGET_ROUTE: Record<string, (id: string) => string> = { contract: (id) => \`/contract/${id}\` }`, `TARGET_KIND_LABEL = { contract: "체결 품의" }`, `TYPE_LABEL = { draft: "기안", approve: "결재", agree: "합의", refer: "참조" }`. `InboxRow { lineId, title, code?: undefined, kindLabel, submittedByName, submittedByDept, stepLabel, typeLabel, submittedAtLabel(MM-DD), href, myStatus, myDecidedAtLabel }`.
- [ ] **Step 5: 통과 확인 후 훅/페이지 구현** — `useApprovalInbox`: `useQuery({ queryKey: ["approvalInbox"], queryFn: getApprovalInbox })` + 렌더 중 `toInboxRow` 매핑. `ApprovalInboxPage`: 탭(내 차례 n / 처리한 결재) 상태 `useState`, 테이블은 기존 `ContractListPage`/lawkit `DataTable` 사용 패턴을 따르되 셀 구성이 다르므로 시맨틱 `table` + vanilla-extract 로 직접(목록 시안 마크업 기준). 내 차례 행 라이브 펄스 점(`@keyframes` + `prefers-reduced-motion` media in css.ts). [처리] 버튼 → `navigate(row.href)`. 빈 상태 문구: "처리할 결재가 없습니다".
- [ ] **Step 6: 라우트/사이드바** — routes.tsx 에 `<Route path="/approvals/inbox" element={<ApprovalInboxPage />} />`. Sidebar 섹션 배열의 "계약 관리" 다음에:

```ts
{
  label: "결재",
  items: [{ id: "approval-inbox", label: "결재 대기함", icon: "factCheck", path: "/approvals/inbox" }],
},
```

(Sidebar.test.tsx 스냅샷/기대 목록 갱신)

- [ ] **Step 7: 테스트** — `pnpm test -- src/pages/approval src/components/layout/Sidebar`
- [ ] **Step 8: Commit** — `git commit -m "feat: 결재 대기함 화면 + 결재 API 모듈"`

### Task 7: web — 결재선 모달 userId 보존

**Files:**
- Modify: `apps/web/src/pages/contract/request-schema.ts` (approverSchema 에 userId)
- Modify: `apps/web/src/pages/contract/sections/ApprovalLineModal.tsx` (addPerson 에서 p.id 보존)
- Modify: `apps/web/src/pages/contract/toCreateRequest.ts`, `toEditDefaults.ts` (+ 각 테스트)

**Interfaces:**
- Consumes: `PersonRef { id, name, dept }` (`api/directory.ts`)
- Produces: `Approver = { userId: string | null; name: string; dept: string; type: "draft"|"approve"|"agree"|"refer" }` — 이후 CreateContractRequest.approvers 로 그대로 전달.

- [ ] **Step 1: 실패 테스트** — `toCreateRequest.test.ts` 에 추가:

```ts
it("approvers 에 userId 를 보존한다", () => {
  const form = makeForm({ approvers: [{ userId: "u-1", name: "김도윤", dept: "법무팀", type: "approve" }] });
  expect(toCreateRequest(form, ctx).approvers[0].userId).toBe("u-1");
});
```

`toEditDefaults.test.ts` 에: 응답 `plannedApprovers`(없으면 기존 approvalLine.steps) → 폼 approvers 에 userId 매핑 확인.

- [ ] **Step 2: 실패 확인 후 구현** — `approverSchema` 에 `userId: z.string().nullable().default(null)` 추가(기존 저장분 호환: default). `ApprovalLineModal.addPerson`: `{ id: st..., userId: p.id, name: p.name, dept: p.dept, type: addType }`; `apply`: `{ userId: s.userId ?? null, name, dept, type }`. 기본 기안 스텝(요청자 본인)은 `useMe` 의 id 사용 가능하면 주입, 아니면 null. `toEditDefaults`: `plannedApprovers` 우선, 폴백 `approvalLine.steps`(`userId` 필드 포함).
- [ ] **Step 3: 테스트** — `pnpm test -- src/pages/contract/toCreateRequest src/pages/contract/toEditDefaults src/pages/contract/request-schema`
- [ ] **Step 4: Commit** — `git commit -m "feat: 결재선 스텝에 실제 사용자 연결 (userId 보존)"`

### Task 8: web — 계약 상세 상신·결재 처리 통합 + 모션

**Files:**
- Create: `apps/web/src/pages/contract/getSubmitPrecheck.ts` + `getSubmitPrecheck.test.ts`
- Create: `apps/web/src/pages/contract/hooks/useContractApproval.ts`
- Create: `apps/web/src/pages/contract/sections/ApprovalRejectModal.tsx`
- Modify: `apps/web/src/pages/contract/getActionView.ts` + 테스트, `sections/ReviewActionPanel.tsx`, `ContractDetailPage.tsx`, `toDetailView.ts`, `contractDetail.css.ts`, `ContractDetailPage.test.tsx`

**Interfaces:**
- Consumes: `submitContractApproval`, `decideApproval`, `ContractResponse.plannedApprovers/approvalLine(currentStepId·steps[].userId·comment)`, `useMe`(내 userId)
- Produces: `getSubmitPrecheck(input: { plannedApprovers: ApproverSnapshot[]; hasContractFile: boolean; annualAmountKrw: number | null }): { items: PrecheckItem[]; canSubmit: boolean }`, `getActionView(status, can, approval: { isRequester: boolean; isMyTurn: boolean; canSubmit: boolean })` 확장.

- [ ] **Step 1: getSubmitPrecheck 실패 테스트**

```ts
import { getSubmitPrecheck } from "./getSubmitPrecheck";

it("결재선 비면 canSubmit=false", () => {
  const r = getSubmitPrecheck({ plannedApprovers: [], hasContractFile: true, annualAmountKrw: null });
  expect(r.canSubmit).toBe(false);
  expect(r.items.find((i) => i.key === "approvers")?.ok).toBe(false);
});
it("연간 1억 초과인데 agree 단계 없으면 경고(warn)지만 상신은 가능", () => {
  const r = getSubmitPrecheck({
    plannedApprovers: [{ userId: "u1", name: "a", dept: "d", type: "approve" }],
    hasContractFile: true,
    annualAmountKrw: 120_000_000,
  });
  expect(r.canSubmit).toBe(true);
  expect(r.items.find((i) => i.key === "financeAgree")?.ok).toBe(false);
});
it("계약서 파일 없으면 canSubmit=false", () => {
  const r = getSubmitPrecheck({ plannedApprovers: [{ userId: "u1", name: "a", dept: "d", type: "approve" }], hasContractFile: false, annualAmountKrw: null });
  expect(r.canSubmit).toBe(false);
});
```

- [ ] **Step 2: 구현** — `PrecheckItem { key: "approvers" | "contractFile" | "financeAgree"; ok: boolean; label: string; sub?: string }`. 규칙: approvers 1개 이상(필수) / 계약서(role==="contract") 파일 존재(필수) / `annualAmountKrw > 100_000_000` 이면 agree 스텝 포함 권고(경고 — canSubmit 에는 미반영). `canSubmit = 필수 항목 전부 ok`. 순수 함수, 렌더 중 호출.
- [ ] **Step 3: getActionView 확장 (테스트 먼저)** — 시그니처를 `getActionView(status, can, approval: { isRequester: boolean; isMyTurn: boolean; canSubmit: boolean })` 로. 분기 추가: `status === "reviewDone" && approval.isRequester` → `buttons` 에 `{ kind: "submitApproval", label: "체결 품의 상신", color: "primary", variant: "default" }` (canSubmit false 면 `disabled: true` 필드 추가), head "체결 품의". `status === "signing" && approval.isMyTurn` → head "결재 현황", `isApprovalMode: true`, `buttons: [{ kind: "approveStep", ... }, { kind: "rejectStep", ... }]`. 기존 케이스(반려/검토완료/배정) 회귀 테스트 유지 — 기존 `getActionView` 호출부/테스트 전부 새 3번째 인자 기본값 `{ isRequester: false, isMyTurn: false, canSubmit: false }` 로 갱신.
- [ ] **Step 4: useContractApproval.ts** — react-query `useMutation` 2개: `submit`(성공 시 `queryClient.invalidateQueries(["contract", id])`), `decide(lineId, decision, comment)`(동일 invalidate + `["approvalInbox"]`). 에러는 기존 훅 관행(토스트/alert)대로.
- [ ] **Step 5: ReviewActionPanel/DetailPage 통합** — `ContractDetailPage` 에서 파생: `me` (기존 useMe 훅 또는 auth 저장 userId), `isRequester = d.createdById === myId`, `line = d.approvalLine`, `myTurn = line?.steps.find((s) => s.id === line.currentStepId)?.userId === myId`, `precheck = getSubmitPrecheck(...)`. ReviewActionPanel props 확장(approval 컨텍스트 + onSubmitApproval/onApprove/onReject 핸들러). 패널 렌더:
  - 상신 모드: precheck 체크리스트(ok → check 아이콘/warn → 주의 아이콘, 시안 `aichk` 스타일) + 상신 버튼(disabled=!canSubmit) + 안내 문구.
  - 결재 모드(내 차례): 의견 textarea(`useState`) + [승인]/[반려] — 반려는 `ApprovalRejectModal`(사유 textarea + 경고 문구 + [반려 확정], lawkit Modal) 열어 확정. 스텝 목록에 각 스텝 상태(`승인 MM-DD` / `반려` / `내 차례` / `대기`)와 comment 표시(`toDetailView.toApprovalStep` 확장: userId·comment·decidedAt 통과).
  - 결재선 카드(ApprovalLineCard): 라인 없으면 `plannedApprovers` 로 "(예정)" 표시.
- [ ] **Step 6: 모션** — `contractDetail.css.ts` 에 vanilla-extract `keyframes` 로 `ringPulse`(내 차례 스텝 번호·현재 라이프사이클), `boxGlow`(내 차례 액션 박스) 추가, `@media (prefers-reduced-motion: reduce)` 에서 `animation: "none"`. 시안 `approval-process-mockup.html` 의 값 사용(2s ease-out infinite / 2.6s ease-in-out infinite).
- [ ] **Step 7: 컴포넌트 테스트 갱신** — `ContractDetailPage.test.tsx`: 요청자+reviewDone 에 상신 버튼 노출 / 비요청자에 미노출 / signing+내 차례에 승인·반려 노출 / 반려 모달 확정 시 decide 호출. `getActionView.test` 신규 분기.
- [ ] **Step 8: 전체 프론트 테스트** — `cd apps/web && pnpm test` → PASS
- [ ] **Step 9: Commit** — `git commit -m "feat: 계약 상세 체결 품의 상신·결재 처리 통합 (사전점검 + 내 차례 모션)"`

### Task 9: 수동 검증 + 마무리

- [ ] **Step 1: 로컬 기동** — docker compose(Postgres) + user-service + api-gateway + apps/web 기동, 시나리오: 요청자 계정으로 계약 reviewDone 만들기 → 결재선(실사용자 2명) 설정 → 상신 → 결재자 계정 대기함 확인 → 승인 → 다음 결재자 알림/승인 → 완료 알림. 반려 경로: 반려 → 계약 reviewDone 복귀 → 결재선 수정 → 재상신(새 라인).
- [ ] **Step 2: erdify ERD 동기화 확인** (Task 1 에서 보류됐다면 여기서 재시도)
- [ ] **Step 3: 남은 체크박스 플랜에 반영 후 Commit** — `git commit -m "docs: 결재 모듈 플랜 체크박스 갱신"`
