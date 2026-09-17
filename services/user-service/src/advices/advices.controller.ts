import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  ADVICE_PATTERNS,
  type AddAdviceMessageRequest,
  type AssignAdviceRequest,
  type CloseAdviceRequest,
  type CreateAdviceRequest,
  type GetAdviceRequest,
  type ListAdvicesRequest,
  type ResubmitAdviceRequestApprovalRequest,
} from "@lawai/contracts";
import { AdvicesService } from "./advices.service";

@Controller()
export class AdvicesController {
  constructor(private readonly advices: AdvicesService) {}

  @MessagePattern(ADVICE_PATTERNS.CREATE)
  create(@Payload() req: CreateAdviceRequest) {
    return this.advices.create(req);
  }

  @MessagePattern(ADVICE_PATTERNS.LIST)
  list(@Payload() req: ListAdvicesRequest) {
    return this.advices.list(req);
  }

  @MessagePattern(ADVICE_PATTERNS.GET)
  get(@Payload() req: GetAdviceRequest) {
    return this.advices.get(req);
  }

  @MessagePattern(ADVICE_PATTERNS.ASSIGN)
  assign(@Payload() req: AssignAdviceRequest) {
    return this.advices.assign(req);
  }

  @MessagePattern(ADVICE_PATTERNS.ADD_MESSAGE)
  addMessage(@Payload() req: AddAdviceMessageRequest) {
    return this.advices.addMessage(req);
  }

  @MessagePattern(ADVICE_PATTERNS.RESUBMIT_REQUEST_APPROVAL)
  resubmitRequestApproval(@Payload() req: ResubmitAdviceRequestApprovalRequest) {
    return this.advices.resubmitRequestApproval(req);
  }

  @MessagePattern(ADVICE_PATTERNS.CLOSE)
  close(@Payload() req: CloseAdviceRequest) {
    return this.advices.close(req);
  }
}
