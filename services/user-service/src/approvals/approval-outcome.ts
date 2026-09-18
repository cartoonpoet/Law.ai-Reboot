import { Injectable } from "@nestjs/common";
import type { ApprovalLineDto, PushNotification } from "@lawai/contracts";

// 결재 확정(승인/반려)을 대상 도메인으로 역전파하고, 대기함 표시에 필요한 대상 정보를 알려주는 핸들러 계약.
// approvals 모듈은 대상 도메인을 모른다 — 도메인 모듈이 onModuleInit 에서 register 한다.
export interface ApprovalOutcomeHandler {
  targetType: string;
  // 대상 도메인이 만든 알림을 돌려주면 approvals 가 결재 알림과 함께 게이트웨이로 넘겨 실시간으로 민다.
  onApproved(line: ApprovalLineDto): Promise<PushNotification[] | void>;
  onRejected(line: ApprovalLineDto, rejectedStepId: string): Promise<PushNotification[] | void>;
  // 대상 id → 문서 번호(계약 관리번호 등)와 삭제 여부. 없는 id 는 결과에서 빠진다.
  getTargetInfo(targetIds: string[]): Promise<Record<string, ApprovalTargetInfo>>;
}

export interface ApprovalTargetInfo {
  code: string;
  isDeleted: boolean;
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
