import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  ApprovalInboxItem,
  ApprovalInboxRequest,
  ApprovalInboxResponse,
  ApprovalLineDto,
  ApprovalStepDto,
  ApproverType,
  DecideApprovalRequest,
  DecideApprovalResult,
  GetActiveApprovalResponse,
  PushNotification,
} from "@lawai/contracts";
import { toAvatarPath } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notifications.service";
import type { CreateNotificationInput } from "../notifications/notifications.service";
import { ApprovalOutcomeRegistry } from "./approval-outcome";

// 대상 도메인이 상신 시 넘기는 입력(RPC 아님 — 서비스 내부 API).
export interface SubmitApprovalInput {
  targetType: string;
  targetId: string;
  title: string;
  submittedById: string;
  tenantId: string;
  steps: {
    userId: string | null;
    name: string;
    dept: string;
    type: ApproverType;
  }[];
}

const lineInclude = {
  submittedBy: { select: { id: true, name: true } },
  // 결재자 프로필 사진 — 스텝의 이름·부서는 상신 시점 스냅이지만 사진은 현재 값을 보여준다.
  steps: { orderBy: { stepOrder: "asc" as const }, include: { user: { select: { avatarKey: true } } } },
};

type StepRow = {
  id: string;
  lineId: string;
  stepOrder: number;
  userId: string | null;
  name: string;
  dept: string;
  type: string;
  status: string;
  comment: string | null;
  decidedAt: Date | null;
  // lineInclude 로 조회한 경우에만 채워진다(없으면 사진 없음으로 본다).
  user?: { avatarKey: string | null } | null;
};

type LineRow = {
  id: string;
  targetType: string;
  targetId: string;
  title: string;
  status: string;
  tenantId: string;
  submittedById: string;
  submittedAt: Date;
  decidedAt: Date | null;
  submittedBy: { id: string; name: string };
  steps: StepRow[];
};

// 승인 필요 스텝(approve/agree)만 결재 진행 대상. draft 는 상신 시 approved, refer 는 알림 전용.
const isDecisionStep = (type: string): boolean =>
  type === "approve" || type === "agree";

const currentStepOf = (steps: StepRow[]): StepRow | null =>
  steps
    .filter((s) => isDecisionStep(s.type))
    .find((s) => s.status === "pending") ?? null;

const PROCESSED_WINDOW_DAYS = 30;

// 도메인이 달라도 targetId 가 겹칠 수 있어 targetType 과 묶은 키로 문서 번호를 찾는다.
const targetKeyOf = (targetType: string, targetId: string): string => `${targetType}:${targetId}`;

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly noti: NotificationService,
    private readonly registry: ApprovalOutcomeRegistry,
  ) {}

  private toStepDto(row: StepRow): ApprovalStepDto {
    return {
      id: row.id,
      stepOrder: row.stepOrder,
      userId: row.userId,
      name: row.name,
      avatarUrl: row.userId ? toAvatarPath(row.userId, row.user?.avatarKey) : null,
      dept: row.dept,
      type: row.type as ApprovalStepDto["type"],
      status: row.status as ApprovalStepDto["status"],
      comment: row.comment,
      decidedAt: row.decidedAt?.toISOString() ?? null,
    };
  }

  private toLineDto(row: LineRow): ApprovalLineDto {
    return {
      id: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      title: row.title,
      status: row.status as ApprovalLineDto["status"],
      submittedById: row.submittedById,
      submittedByName: row.submittedBy?.name ?? "",
      submittedAt: row.submittedAt.toISOString(),
      decidedAt: row.decidedAt?.toISOString() ?? null,
      steps: row.steps.map((s) => this.toStepDto(s)),
      currentStepId: currentStepOf(row.steps)?.id ?? null,
    };
  }

  private notificationOf(
    line: LineRow,
    recipientId: string,
    type: string,
    actorId: string,
  ): CreateNotificationInput {
    return {
      recipientId,
      type,
      actorId,
      targetType: "ApprovalLine",
      targetId: line.id,
      tenantId: line.tenantId,
      detail: {
        targetType: line.targetType,
        targetId: line.targetId,
        title: line.title,
      },
    };
  }

  /** 상신 — 라인+스텝 생성. draft 는 즉시 approved. 첫 차례·참조자 알림 생성. */
  async submit(
    input: SubmitApprovalInput,
  ): Promise<{ line: ApprovalLineDto; notifications: PushNotification[] }> {
    const now = new Date();
    const row = (await this.prisma.approvalLine.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        title: input.title,
        tenantId: input.tenantId,
        submittedById: input.submittedById,
        steps: {
          create: input.steps.map((s, index) => ({
            stepOrder: index,
            userId: s.userId,
            name: s.name,
            dept: s.dept,
            type: s.type,
            status: s.type === "draft" ? "approved" : "pending",
            decidedAt: s.type === "draft" ? now : null,
          })),
        },
      },
      include: lineInclude,
    })) as unknown as LineRow;

    const items: CreateNotificationInput[] = [];
    const current = currentStepOf(row.steps);
    if (current?.userId) {
      items.push(
        this.notificationOf(row, current.userId, "approval_turn", input.submittedById),
      );
    }
    for (const s of row.steps) {
      if (s.type === "refer" && s.userId) {
        items.push(
          this.notificationOf(row, s.userId, "approval_referred", input.submittedById),
        );
      }
    }
    const notifications = await this.noti.createMany(items);
    return { line: this.toLineDto(row), notifications };
  }

  /** 승인/반려 — 대상 스텝은 서버가 현재 차례로 파생. 확정 시 outcome 핸들러 호출. */
  async decide(req: DecideApprovalRequest): Promise<DecideApprovalResult> {
    const row = (await this.prisma.approvalLine.findUnique({
      where: { id: req.lineId },
      include: lineInclude,
    })) as unknown as LineRow | null;
    if (!row) {
      throw new RpcException({ status: 404, message: "결재를 찾을 수 없습니다" });
    }
    if (row.status !== "pending") {
      throw new RpcException({ status: 400, message: "이미 확정된 결재입니다" });
    }
    const current = currentStepOf(row.steps);
    if (!current || !req.viewerId || current.userId !== req.viewerId) {
      throw new RpcException({ status: 403, message: "현재 차례의 결재자가 아닙니다" });
    }

    const now = new Date();
    const decided = req.decision === "approve" ? "approved" : "rejected";
    await this.prisma.approvalStep.update({
      where: { id: current.id },
      data: { status: decided, comment: req.comment ?? null, decidedAt: now },
    });

    const items: CreateNotificationInput[] = [];
    if (req.decision === "reject") {
      await this.prisma.approvalLine.update({
        where: { id: row.id },
        data: { status: "rejected", decidedAt: now },
      });
      items.push(
        this.notificationOf(row, row.submittedById, "approval_rejected", req.viewerId),
      );
    } else {
      const remaining = currentStepOf(
        row.steps.map((s) =>
          s.id === current.id ? { ...s, status: "approved" } : s,
        ),
      );
      if (remaining) {
        if (remaining.userId) {
          items.push(
            this.notificationOf(row, remaining.userId, "approval_turn", req.viewerId),
          );
        }
      } else {
        await this.prisma.approvalLine.update({
          where: { id: row.id },
          data: { status: "approved", decidedAt: now },
        });
        items.push(
          this.notificationOf(row, row.submittedById, "approval_completed", req.viewerId),
        );
      }
    }

    const updated = (await this.prisma.approvalLine.findUnique({
      where: { id: row.id },
      include: lineInclude,
    })) as unknown as LineRow;
    const dto = this.toLineDto(updated);

    // 확정 시 대상 도메인으로 역전파(핸들러 미등록 targetType 은 no-op).
    if (dto.status === "rejected") {
      await this.registry.get(dto.targetType)?.onRejected(dto, current.id);
    } else if (dto.status === "approved") {
      await this.registry.get(dto.targetType)?.onApproved(dto);
    }

    const notifications = await this.noti.createMany(items);
    return { line: dto, notifications };
  }

  private toInboxItem(
    row: LineRow,
    viewerId: string,
    targetCodes: Record<string, string>,
  ): ApprovalInboxItem | null {
    const decisionSteps = row.steps.filter((s) => isDecisionStep(s.type));
    const mine =
      decisionSteps.find((s) => s.userId === viewerId) ??
      row.steps.find((s) => s.userId === viewerId);
    if (!mine) return null;
    const myDecisionIndex = decisionSteps.findIndex((s) => s.id === mine.id);
    return {
      lineId: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      targetCode: targetCodes[targetKeyOf(row.targetType, row.targetId)] ?? null,
      title: row.title,
      submittedById: row.submittedById,
      submittedByName: row.submittedBy?.name ?? "",
      submittedByDept:
        row.steps.find((s) => s.userId === row.submittedById)?.dept ?? "",
      myStepOrder: myDecisionIndex >= 0 ? myDecisionIndex : 0,
      totalSteps: decisionSteps.length,
      myType: mine.type as ApprovalInboxItem["myType"],
      submittedAt: row.submittedAt.toISOString(),
      lineStatus: row.status as ApprovalInboxItem["lineStatus"],
      myStatus: mine.status as ApprovalInboxItem["myStatus"],
      myDecidedAt: mine.decidedAt?.toISOString() ?? null,
    };
  }

  /** 결재 대기함 — pending: 내 차례인 진행 중 라인, processed: 내가 처리한 라인(최근 30일). */
  async inbox(req: ApprovalInboxRequest): Promise<ApprovalInboxResponse> {
    const viewerId = req.viewerId;
    if (!viewerId) {
      throw new RpcException({ status: 401, message: "인증이 필요합니다" });
    }
    const tenantId = req.tenantContext?.tenantId;

    const pendingRows = (await this.prisma.approvalLine.findMany({
      where: {
        status: "pending",
        ...(tenantId ? { tenantId } : {}),
        steps: { some: { userId: viewerId, status: "pending" } },
      },
      include: lineInclude,
      orderBy: { submittedAt: "desc" },
    })) as unknown as LineRow[];

    const since = new Date(Date.now() - PROCESSED_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const processedRows = (await this.prisma.approvalLine.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        steps: { some: { userId: viewerId, decidedAt: { not: null } } },
        submittedAt: { gte: since },
      },
      include: lineInclude,
      orderBy: { submittedAt: "desc" },
    })) as unknown as LineRow[];

    const isMyTurn = (row: LineRow) => currentStepOf(row.steps)?.userId === viewerId;
    // 내 결재 단계가 아직 남아 있지만 앞 단계가 먼저인 라인 = 내 차례 예정.
    const hasMyPendingDecision = (row: LineRow) =>
      row.steps.some(
        (s) => s.userId === viewerId && isDecisionStep(s.type) && s.status === "pending",
      );

    const targetCodes = await this.resolveTargetCodes([...pendingRows, ...processedRows]);
    const toItems = (rows: LineRow[]) =>
      rows
        .map((row) => this.toInboxItem(row, viewerId, targetCodes))
        .filter((item): item is ApprovalInboxItem => item !== null);

    return {
      pending: toItems(pendingRows.filter(isMyTurn)),
      upcoming: toItems(pendingRows.filter((row) => !isMyTurn(row) && hasMyPendingDecision(row))),
      processed: toItems(processedRows),
    };
  }

  // targetType 별로 한 번씩 도메인 핸들러에 문서 번호를 묻는다. 핸들러가 없는 도메인은 번호 없음.
  private async resolveTargetCodes(rows: LineRow[]): Promise<Record<string, string>> {
    const idsByType = new Map<string, Set<string>>();
    for (const row of rows) {
      const ids = idsByType.get(row.targetType) ?? new Set<string>();
      ids.add(row.targetId);
      idsByType.set(row.targetType, ids);
    }
    const entries = await Promise.all(
      [...idsByType].map(async ([targetType, ids]) => {
        const handler = this.registry.get(targetType);
        const codes = handler ? await handler.getTargetCodes([...ids]) : {};
        return Object.entries(codes).map(
          ([targetId, code]) => [targetKeyOf(targetType, targetId), code] as const,
        );
      }),
    );
    return Object.fromEntries(entries.flat());
  }

  /** target 의 최신 라인 + 이전 라인 수. */
  async getActive(
    targetType: string,
    targetId: string,
  ): Promise<GetActiveApprovalResponse> {
    const row = (await this.prisma.approvalLine.findFirst({
      where: { targetType, targetId },
      include: lineInclude,
      orderBy: { submittedAt: "desc" },
    })) as unknown as LineRow | null;
    if (!row) return { line: null, historyCount: 0 };
    const total = await this.prisma.approvalLine.count({
      where: { targetType, targetId },
    });
    return { line: this.toLineDto(row), historyCount: Math.max(0, total - 1) };
  }
}
