import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { APPROVAL_PATTERNS } from "@lawai/contracts";
import type {
  ApprovalInboxRequest,
  DecideApprovalRequest,
  GetActiveApprovalRequest,
} from "@lawai/contracts";
import { ApprovalsService } from "./approvals.service";

@Controller()
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @MessagePattern(APPROVAL_PATTERNS.DECIDE)
  decide(@Payload() req: DecideApprovalRequest) {
    return this.approvals.decide(req);
  }

  @MessagePattern(APPROVAL_PATTERNS.INBOX)
  inbox(@Payload() req: ApprovalInboxRequest) {
    return this.approvals.inbox(req);
  }

  @MessagePattern(APPROVAL_PATTERNS.GET_ACTIVE)
  getActive(@Payload() req: GetActiveApprovalRequest) {
    return this.approvals.getActive(req.targetType, req.targetId);
  }
}
