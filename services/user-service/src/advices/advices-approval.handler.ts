import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  ADVICE_APPROVAL_TARGET,
  ADVICE_NOTIFICATION_TARGET,
  ADVICE_NOTIFICATION_TYPE,
  type ApprovalLineDto,
  type PushNotification,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notifications.service";
import { StatusEventsService } from "../common/status-events/status-events.service";
import {
  ApprovalOutcomeRegistry,
  type ApprovalOutcomeHandler,
  type ApprovalTargetInfo,
} from "../approvals/approval-outcome";

// 결재 대기함의 "관리번호 · 자문" 표시와 삭제 여부. 대기함 라인은 이미 테넌트로 한정돼 있어 id 로만 조회한다.
const getAdviceTargetInfo = async (
  prisma: PrismaService,
  targetIds: string[],
): Promise<Record<string, ApprovalTargetInfo>> => {
  if (targetIds.length === 0) return {};
  const rows = await prisma.advice.findMany({
    where: { id: { in: targetIds } },
    select: { id: true, code: true, deletedAt: true },
  });
  return Object.fromEntries(rows.map((row) => [row.id, { code: row.code, isDeleted: row.deletedAt !== null }]));
};

/**
 * 결재로 상태가 바뀐 자문을 통계용으로 기록한다.
 * updateMany 가 실제로 바꾼 건수(changed)가 0 이면 이 결재로 바뀐 것이 아니므로 아무것도 남기지 않는다 —
 * 그 사이 다른 경로로 상태가 바뀐 자문에 일어나지 않은 전이를 적지 않기 위함이다.
 */
const recordAdviceStatus = async (
  prisma: PrismaService,
  statusEvents: StatusEventsService,
  adviceId: string,
  fromStatus: string,
  changed: number,
): Promise<void> => {
  if (changed === 0) return;
  // 통계를 위해서만 하는 조회다 — 여기서 나는 오류가 결재 확정을 깨면 안 되므로 조회까지 통째로 감싼다.
  try {
    const row = await prisma.advice.findUnique({
      where: { id: adviceId },
      select: { id: true, tenantId: true, ownerId: true, status: true },
    });
    if (!row || row.status === fromStatus) return;
    await statusEvents.record({
      tenantId: row.tenantId,
      targetType: "advice",
      targetId: row.id,
      fromStatus,
      toStatus: row.status,
      ownerId: row.ownerId,
      actorId: null,
    });
  } catch {
    // 기록 실패는 삼킨다(StatusEventsService 안에서 이미 로깅한다).
  }
};

/**
 * 요청 결재 확정 → 자문 상태 역전파.
 * 승인: 담당이 정해져 있으면 바로 검토, 아니면 접수. 반려: 요청 반려(작성자가 결재선을 고쳐 다시 올린다).
 * 상태 조건을 걸어 갱신하므로 그 사이 다른 흐름으로 바뀐 자문은 건드리지 않는다.
 */
@Injectable()
export class AdviceRequestApprovalHandler implements ApprovalOutcomeHandler, OnModuleInit {
  readonly targetType = ADVICE_APPROVAL_TARGET.REQUEST;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ApprovalOutcomeRegistry,
    private readonly statusEvents: StatusEventsService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async onApproved(line: ApprovalLineDto): Promise<void> {
    const toReviewing = await this.prisma.advice.updateMany({
      where: { id: line.targetId, status: "requestApproval", ownerId: { not: null } },
      data: { status: "reviewing" },
    });
    const toReceived = await this.prisma.advice.updateMany({
      where: { id: line.targetId, status: "requestApproval", ownerId: null },
      data: { status: "received" },
    });
    await recordAdviceStatus(
      this.prisma,
      this.statusEvents,
      line.targetId,
      "requestApproval",
      toReviewing.count + toReceived.count,
    );
  }

  async onRejected(line: ApprovalLineDto): Promise<void> {
    const { count } = await this.prisma.advice.updateMany({
      where: { id: line.targetId, status: "requestApproval" },
      data: { status: "requestRejected" },
    });
    await recordAdviceStatus(this.prisma, this.statusEvents, line.targetId, "requestApproval", count);
  }

  getTargetInfo(targetIds: string[]): Promise<Record<string, ApprovalTargetInfo>> {
    return getAdviceTargetInfo(this.prisma, targetIds);
  }
}

/**
 * 회신 결재 확정 → 자문 상태·회신 공개 역전파.
 * 승인: 회신 완료 + 결재 중이던 회신을 요청자에게 공개. 반려: 다시 검토 중으로 돌리고 그 회신은 반려로 남긴다.
 */
@Injectable()
export class AdviceAnswerApprovalHandler implements ApprovalOutcomeHandler, OnModuleInit {
  readonly targetType = ADVICE_APPROVAL_TARGET.ANSWER;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ApprovalOutcomeRegistry,
    private readonly notifications: NotificationService,
    private readonly statusEvents: StatusEventsService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async onApproved(line: ApprovalLineDto): Promise<PushNotification[]> {
    const [, adviceUpdate] = await this.prisma.$transaction([
      this.prisma.adviceMessage.updateMany({
        where: { adviceId: line.targetId, state: "pendingApproval" },
        data: { state: "published" },
      }),
      this.prisma.advice.updateMany({
        where: { id: line.targetId, status: "answerApproval" },
        data: { status: "answered", answeredAt: new Date() },
      }),
    ]);
    await recordAdviceStatus(this.prisma, this.statusEvents, line.targetId, "answerApproval", adviceUpdate.count);
    return this.notifyAnswered(line);
  }

  // 결재를 거친 회신이 공개되면 요청자 쪽에 알린다. 만든 알림은 approvals 가 실시간으로 밀어 준다.
  private async notifyAnswered(line: ApprovalLineDto): Promise<PushNotification[]> {
    const advice = await this.prisma.advice.findUnique({
      where: { id: line.targetId },
      select: { id: true, code: true, title: true, tenantId: true, requesterId: true, createdById: true, ownerId: true },
    });
    if (!advice) return [];
    const recipients = Array.from(new Set([advice.requesterId, advice.createdById])).filter(
      (id) => id !== advice.ownerId,
    );
    return this.notifications.createMany(
      recipients.map((recipientId) => ({
        recipientId,
        type: ADVICE_NOTIFICATION_TYPE.ANSWERED,
        actorId: advice.ownerId ?? recipientId,
        targetType: ADVICE_NOTIFICATION_TARGET,
        targetId: advice.id,
        tenantId: advice.tenantId,
        detail: { adviceId: advice.id, code: advice.code, title: advice.title },
      })),
    );
  }

  async onRejected(line: ApprovalLineDto): Promise<void> {
    const [, adviceUpdate] = await this.prisma.$transaction([
      this.prisma.adviceMessage.updateMany({
        where: { adviceId: line.targetId, state: "pendingApproval" },
        data: { state: "rejected" },
      }),
      this.prisma.advice.updateMany({
        where: { id: line.targetId, status: "answerApproval" },
        data: { status: "reviewing" },
      }),
    ]);
    await recordAdviceStatus(this.prisma, this.statusEvents, line.targetId, "answerApproval", adviceUpdate.count);
  }

  getTargetInfo(targetIds: string[]): Promise<Record<string, ApprovalTargetInfo>> {
    return getAdviceTargetInfo(this.prisma, targetIds);
  }
}
