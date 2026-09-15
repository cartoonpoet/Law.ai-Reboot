import { Injectable, OnModuleInit } from "@nestjs/common";
import type { ApprovalLineDto } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import {
  ApprovalOutcomeRegistry,
  ApprovalOutcomeHandler,
  ApprovalTargetInfo,
} from "../approvals/approval-outcome";

/**
 * 결재 확정 → 계약 상태 역전파 핸들러.
 * 반려 시 signing→reviewDone 복귀(내부 경로 — 사용자 updateStatus authz 와 무관).
 * 승인 완료 시 계약은 signing 유지 — 날인(signing→signed)은 별도 조각(sealManager).
 */
@Injectable()
export class ContractApprovalOutcomeHandler
  implements ApprovalOutcomeHandler, OnModuleInit
{
  readonly targetType = "contract";

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ApprovalOutcomeRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async onApproved(): Promise<void> {
    // no-op: 결재 완료 후에도 signing 유지.
  }

  async onRejected(line: ApprovalLineDto): Promise<void> {
    await this.prisma.contract.updateMany({
      where: { id: line.targetId, status: "signing" },
      data: { status: "reviewDone" },
    });
  }

  // 결재 대기함의 "관리번호 · 계약" 표시와 삭제된 계약 구분용. 대기함 라인은 이미 테넌트로 한정돼 있어 id 로만 조회한다.
  async getTargetInfo(targetIds: string[]): Promise<Record<string, ApprovalTargetInfo>> {
    if (targetIds.length === 0) return {};
    const rows = await this.prisma.contract.findMany({
      where: { id: { in: targetIds } },
      select: { id: true, code: true, deletedAt: true },
    });
    return Object.fromEntries(
      rows.map((r) => [r.id, { code: r.code, isDeleted: r.deletedAt !== null }]),
    );
  }
}
