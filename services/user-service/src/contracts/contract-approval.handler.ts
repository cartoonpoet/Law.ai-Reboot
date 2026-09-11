import { Injectable, OnModuleInit } from "@nestjs/common";
import type { ApprovalLineDto } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import {
  ApprovalOutcomeRegistry,
  ApprovalOutcomeHandler,
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
}
