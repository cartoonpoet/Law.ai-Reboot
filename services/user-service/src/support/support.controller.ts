import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  SUPPORT_PATTERNS,
  type AddSupportMessageRequest,
  type AdminGetSupportThreadRequest,
  type AdminReplySupportRequest,
  type AdminSupportListRequest,
  type CreateSupportThreadRequest,
  type GetSupportThreadRequest,
  type ListMySupportThreadsRequest,
} from "@lawai/contracts";
import { SupportService } from "./support.service";

@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @MessagePattern(SUPPORT_PATTERNS.CREATE_THREAD)
  createThread(@Payload() req: CreateSupportThreadRequest) {
    return this.support.createThread(req);
  }

  @MessagePattern(SUPPORT_PATTERNS.LIST_MY_THREADS)
  listMyThreads(@Payload() req: ListMySupportThreadsRequest) {
    return this.support.listMyThreads(req);
  }

  @MessagePattern(SUPPORT_PATTERNS.GET_THREAD)
  getThread(@Payload() req: GetSupportThreadRequest) {
    return this.support.getThread(req);
  }

  @MessagePattern(SUPPORT_PATTERNS.ADD_MESSAGE)
  addMessage(@Payload() req: AddSupportMessageRequest) {
    return this.support.addMessage(req);
  }

  @MessagePattern(SUPPORT_PATTERNS.ADMIN_LIST)
  adminList(@Payload() req: AdminSupportListRequest) {
    return this.support.adminList(req);
  }

  @MessagePattern(SUPPORT_PATTERNS.ADMIN_GET)
  adminGet(@Payload() req: AdminGetSupportThreadRequest) {
    return this.support.adminGet(req);
  }

  @MessagePattern(SUPPORT_PATTERNS.ADMIN_REPLY)
  adminReply(@Payload() req: AdminReplySupportRequest) {
    return this.support.adminReply(req);
  }
}
