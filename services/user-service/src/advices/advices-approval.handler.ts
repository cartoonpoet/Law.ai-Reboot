import { Injectable, OnModuleInit } from "@nestjs/common";
import { ADVICE_APPROVAL_TARGET, type ApprovalLineDto } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
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
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async onApproved(line: ApprovalLineDto): Promise<void> {
    await this.prisma.advice.updateMany({
      where: { id: line.targetId, status: "requestApproval", ownerId: { not: null } },
      data: { status: "reviewing" },
    });
    await this.prisma.advice.updateMany({
      where: { id: line.targetId, status: "requestApproval", ownerId: null },
      data: { status: "received" },
    });
  }

  async onRejected(line: ApprovalLineDto): Promise<void> {
    await this.prisma.advice.updateMany({
      where: { id: line.targetId, status: "requestApproval" },
      data: { status: "requestRejected" },
    });
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
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async onApproved(line: ApprovalLineDto): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.adviceMessage.updateMany({
        where: { adviceId: line.targetId, state: "pendingApproval" },
        data: { state: "published" },
      }),
      this.prisma.advice.updateMany({
        where: { id: line.targetId, status: "answerApproval" },
        data: { status: "answered", answeredAt: new Date() },
      }),
    ]);
  }

  async onRejected(line: ApprovalLineDto): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.adviceMessage.updateMany({
        where: { adviceId: line.targetId, state: "pendingApproval" },
        data: { state: "rejected" },
      }),
      this.prisma.advice.updateMany({
        where: { id: line.targetId, status: "answerApproval" },
        data: { status: "reviewing" },
      }),
    ]);
  }

  getTargetInfo(targetIds: string[]): Promise<Record<string, ApprovalTargetInfo>> {
    return getAdviceTargetInfo(this.prisma, targetIds);
  }
}
