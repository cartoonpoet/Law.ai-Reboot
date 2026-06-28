import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  ADMIN_PATTERNS,
  type AdminAuditListRequest,
  type AdminAuditListResponse,
  type AdminStatsResponse,
} from "@lawai/contracts";
import { AdminService } from "./admin.service";

@Controller()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @MessagePattern(ADMIN_PATTERNS.GET_STATS)
  getStats(): Promise<AdminStatsResponse> {
    return this.admin.getStats();
  }

  @MessagePattern(ADMIN_PATTERNS.GET_AUDIT)
  getAudit(
    @Payload() req: AdminAuditListRequest,
  ): Promise<AdminAuditListResponse> {
    return this.admin.getRecentAudit(req.limit);
  }
}
