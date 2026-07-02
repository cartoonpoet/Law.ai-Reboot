import {
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  ADMIN_PATTERNS,
  type AdminAuditListRequest,
  type AdminAuditListResponse,
  type AdminStatsResponse,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { rpcToHttp } from "../common/rpc-to-http";

/**
 * 어드민 콘솔 전용 엔드포인트.
 * 가드: JwtAuthGuard → AdminRoleGuard (둘 다 통과해야 함).
 */
@ApiTags("admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "대시보드 통계" })
  @Get("stats")
  getStats(): Promise<AdminStatsResponse> {
    return firstValueFrom(
      this.userClient
        .send<AdminStatsResponse>(ADMIN_PATTERNS.GET_STATS, {})
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "최근 감사 로그" })
  @Get("audit")
  getAudit(
    @Query("limit") limit?: string,
  ): Promise<AdminAuditListResponse> {
    const parsed = limit ? Number(limit) : undefined;
    const payload: AdminAuditListRequest = {
      limit: Number.isFinite(parsed) ? parsed : undefined,
    };
    return firstValueFrom(
      this.userClient
        .send<AdminAuditListResponse>(ADMIN_PATTERNS.GET_AUDIT, payload)
        .pipe(rpcToHttp()),
    );
  }
}
