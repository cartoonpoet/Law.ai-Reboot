import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  USER_PATTERNS,
  type AcceptInvitationRpcRequest,
  type CancelInvitationRequest,
  type CreateInvitationRequest,
  type FindInvitationRequest,
  type RotateInvitationRequest,
} from "@lawai/contracts";
import { InvitationsService } from "./invitations.service";

@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @MessagePattern(USER_PATTERNS.CREATE_INVITATION)
  create(@Payload() req: CreateInvitationRequest) {
    return this.invitations.create(req);
  }

  @MessagePattern(USER_PATTERNS.ROTATE_INVITATION)
  rotate(@Payload() req: RotateInvitationRequest) {
    return this.invitations.rotate(req);
  }

  @MessagePattern(USER_PATTERNS.CANCEL_INVITATION)
  cancel(@Payload() req: CancelInvitationRequest) {
    return this.invitations.cancel(req);
  }

  @MessagePattern(USER_PATTERNS.FIND_INVITATION)
  find(@Payload() req: FindInvitationRequest) {
    return this.invitations.findValid(req);
  }

  @MessagePattern(USER_PATTERNS.ACCEPT_INVITATION)
  accept(@Payload() req: AcceptInvitationRpcRequest) {
    return this.invitations.accept(req);
  }
}
