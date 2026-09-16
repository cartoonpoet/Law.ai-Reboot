import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
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
  AUTH_PATTERNS,
  type AdminAuditListRequest,
  type AdminAuditListResponse,
  type AdminStatsResponse,
  type AdminTenantDetailResponse,
  type AdminTenantListItem,
  type AdminTenantListResponse,
  type AdminTenantUpdateRequest,
  type AdminCreateTenantRequest,
  type AdminCreateTenantResponse,
  type AdminDeletedContractListResponse,
  type AdminRestoreContractRequest,
  type AdminRestoreContractResult,
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
    @Inject("AUTH_CLIENT") private readonly authClient: ClientProxy,
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
    @Query("offset") offset?: string,
    @Query("tenantId") tenantId?: string,
    @Query("action") action?: string,
    @Query("actorId") actorId?: string,
    @Query("targetId") targetId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<AdminAuditListResponse> {
    const payload: AdminAuditListRequest = {
      limit: this.toCount(limit),
      offset: this.toCount(offset),
      tenantId: tenantId || undefined,
      action: action || undefined,
      actorId: actorId || undefined,
      targetId: targetId || undefined,
      from: from || undefined,
      to: to || undefined,
    };
    return firstValueFrom(
      this.userClient
        .send<AdminAuditListResponse>(ADMIN_PATTERNS.GET_AUDIT, payload)
        .pipe(rpcToHttp()),
    );
  }

  // 쿼리스트링의 개수·시작 위치 — 숫자가 아니거나 음수면 무시하고 서버 기본값을 쓴다.
  private toCount(value?: string): number | undefined {
    const parsed = value ? Number(value) : undefined;
    return parsed !== undefined && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  @ApiOperation({ summary: "고객사 생성 + 첫 담당자 초대 (온보딩 1단계)" })
  @Post("tenants")
  createTenant(
    @Body() dto: Pick<AdminCreateTenantRequest, "name" | "plan" | "status" | "trialEndsAt" | "managerEmail">,
    @Req() req: Request,
  ): Promise<AdminCreateTenantResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: AdminCreateTenantRequest = { ...dto, actorId: sub };
    return firstValueFrom(
      this.authClient
        .send<AdminCreateTenantResponse>(AUTH_PATTERNS.ADMIN_CREATE_TENANT, payload)
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

  @ApiOperation({ summary: "삭제된 계약 목록", description: "전 고객사, 최근 삭제 순. 회사·작성자·삭제한 사람·삭제 시각." })
  @Get("contracts/deleted")
  listDeletedContracts(): Promise<AdminDeletedContractListResponse> {
    return firstValueFrom(
      this.userClient
        .send<AdminDeletedContractListResponse>(ADMIN_PATTERNS.LIST_DELETED_CONTRACTS, {})
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "삭제된 계약 복구", description: "삭제 표시를 지워 목록·검색·알림 링크에 다시 나오게 한다. 감사 기록을 남긴다." })
  @Post("contracts/:id/restore")
  restoreContract(@Param("id") id: string, @Req() req: Request): Promise<AdminRestoreContractResult> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: AdminRestoreContractRequest = { contractId: id, actorId: sub };
    return firstValueFrom(
      this.userClient
        .send<AdminRestoreContractResult>(ADMIN_PATTERNS.RESTORE_CONTRACT, payload)
        .pipe(rpcToHttp()),
    );
  }
}
