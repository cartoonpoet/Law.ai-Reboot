import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  SUPPORT_PATTERNS,
  type AdminGetSupportThreadRequest,
  type AdminReplySupportRequest,
  type AdminReplySupportResult,
  type AdminSupportListRequest,
  type AdminSupportListResponse,
  type AdminSupportThreadDetail,
  type JwtPayload,
  type SupportStatusTypes,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { NotificationHubService } from "../notifications/notification-hub.service";
import { ReplySupportDto } from "./dto";

/**
 * 문의함(관리자) — 전 고객사 문의를 보고 답한다.
 * 답변하면 user-service 가 만든 알림을 SSE 로 밀어, 문의한 사람 화면에 바로 뜬다.
 */
@ApiTags("admin")
@Controller("admin/support")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth()
export class SupportAdminController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    private readonly hub: NotificationHubService,
  ) {}

  @ApiOperation({ summary: "문의 목록", description: "상태로 거르고 offset 으로 페이지를 넘긴다." })
  @Get()
  list(
    @Query("status") status?: SupportStatusTypes,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<AdminSupportListResponse> {
    const payload: AdminSupportListRequest = {
      status: status || undefined,
      limit: this.toCount(limit),
      offset: this.toCount(offset),
    };
    return firstValueFrom(
      this.userClient.send<AdminSupportListResponse>(SUPPORT_PATTERNS.ADMIN_LIST, payload).pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "문의 한 건(주고받은 내용 전체)" })
  @Get(":id")
  get(@Param("id") id: string): Promise<AdminSupportThreadDetail> {
    const payload: AdminGetSupportThreadRequest = { threadId: id };
    return firstValueFrom(
      this.userClient.send<AdminSupportThreadDetail>(SUPPORT_PATTERNS.ADMIN_GET, payload).pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "문의에 답변", description: "답변 알림을 문의한 사람에게 실시간(SSE)으로 민다." })
  @Post(":id/reply")
  async reply(
    @Param("id") id: string,
    @Body() dto: ReplySupportDto,
    @Req() req: Request,
  ): Promise<AdminSupportThreadDetail> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: AdminReplySupportRequest = {
      threadId: id,
      actorId: sub,
      body: dto.body,
      close: dto.close,
    };
    const result = await firstValueFrom(
      this.userClient.send<AdminReplySupportResult>(SUPPORT_PATTERNS.ADMIN_REPLY, payload).pipe(rpcToHttp()),
    );
    result.notifications.forEach((n) => this.hub.push(n.recipientId, n.notification));
    return result.thread;
  }

  // 쿼리스트링의 개수·시작 위치 — 숫자가 아니거나 음수면 무시하고 서버 기본값을 쓴다.
  private toCount(value?: string): number | undefined {
    const parsed = value ? Number(value) : undefined;
    return parsed !== undefined && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }
}
