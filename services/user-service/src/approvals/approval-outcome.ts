import { Injectable } from "@nestjs/common";
import type { ApprovalLineDto } from "@lawai/contracts";

// 결재 확정(승인/반려)을 대상 도메인으로 역전파하는 핸들러 계약.
// approvals 모듈은 대상 도메인을 모른다 — 도메인 모듈이 onModuleInit 에서 register 한다.
export interface ApprovalOutcomeHandler {
  targetType: string;
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
