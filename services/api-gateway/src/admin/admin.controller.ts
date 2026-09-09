import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  ADMIN_PATTERNS,
  type AdminAuditListRequest,
  type AdminAuditListResponse,
  type AdminStatsResponse,
  type AdminTenantDetailResponse,
  type AdminTenantListItem,
  type AdminTenantListResponse,
  type AdminTenantUpdateRequest,
  type JwtPayload,
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

  @ApiOperation({ summary: "고객사 목록 + 전체 KPI" })
  @Get("tenants")
  listTenants(): Promise<AdminTenantListResponse> {
    return firstValueFrom(
      this.userClient
        .send<AdminTenantListResponse>(ADMIN_PATTERNS.LIST_TENANTS, {})
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "고객사 상세 집계" })
  @Get("tenants/:id")
  getTenant(@Param("id") id: string): Promise<AdminTenantDetailResponse> {
    return firstValueFrom(
      this.userClient
        .send<AdminTenantDetailResponse>(ADMIN_PATTERNS.GET_TENANT, { tenantId: id })
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "고객사 요금제/상태/체험판만료 변경" })
  @Patch("tenants/:id")
  updateTenant(
    @Param("id") id: string,
    @Body() dto: Pick<AdminTenantUpdateRequest, "plan" | "status" | "trialEndsAt">,
    @Req() req: Request,
  ): Promise<AdminTenantListItem> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: AdminTenantUpdateRequest & { actorId: string } = {
      tenantId: id,
      actorId: sub,
      plan: dto.plan,
      status: dto.status,
      trialEndsAt: dto.trialEndsAt,
    };
    return firstValueFrom(
      this.userClient
        .send<AdminTenantListItem>(ADMIN_PATTERNS.UPDATE_TENANT, payload)
        .pipe(rpcToHttp()),
    );
  }
}
