import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request } from "express";
import {
  AUTH_PATTERNS,
  USER_PATTERNS,
  type CancelInvitationRequest,
  type InviteMembersRequest,
  type InviteMembersResponse,
  type JwtPayload,
  type ListTenantMembersResponse,
  type ResendInviteRequest,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";

/**
 * 활성 테넌트의 멤버·초대 관리 (Spec 4, 온보딩 2단계).
 * 초대 발송·재발송·취소 권한(contractManager/inHouseCounsel/시스템 admin)은
 * 서비스 단(auth/user)에서 activeRole 로 검사한다.
 */
@ApiTags("tenants")
@Controller("tenants")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantMembersController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    @Inject("AUTH_CLIENT") private readonly authClient: ClientProxy,
  ) {}

  private claims(req: Request): JwtPayload {
    return (req as Request & { user: JwtPayload }).user;
  }

  @ApiOperation({ summary: "활성 회사의 멤버 + 대기 중 초대 목록" })
  @Get("members")
  listMembers(@Req() req: Request): Promise<ListTenantMembersResponse> {
    return firstValueFrom(
      this.userClient
        .send<ListTenantMembersResponse>(USER_PATTERNS.LIST_TENANT_MEMBERS, {
          tenantContext: extractTenantContext(req),
        })
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "멤버 초대 발송 (다건, 단일 역할)" })
  @Post("invites")
  @HttpCode(200)
  invite(
    @Body() dto: Pick<InviteMembersRequest, "emails" | "role">,
    @Req() req: Request,
  ): Promise<InviteMembersResponse> {
    const user = this.claims(req);
    const payload: InviteMembersRequest = {
      emails: dto.emails,
      role: dto.role,
      tenantId: user.activeTenantId,
      invitedById: user.sub,
      inviterRole: user.activeRole,
      isSystemAdmin: user.isSystemAdmin,
    };
    return firstValueFrom(
      this.authClient
        .send<InviteMembersResponse>(AUTH_PATTERNS.INVITE_MEMBERS, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "초대 재발송 (토큰 회전)" })
  @Post("invites/:id/resend")
  @HttpCode(200)
  resend(@Param("id") id: string, @Req() req: Request): Promise<{ ok: true }> {
    const user = this.claims(req);
    const payload: ResendInviteRequest = {
      inviteId: id,
      tenantId: user.activeTenantId,
      invitedById: user.sub,
      inviterRole: user.activeRole,
      isSystemAdmin: user.isSystemAdmin,
    };
    return firstValueFrom(
      this.authClient
        .send<{ ok: true }>(AUTH_PATTERNS.RESEND_INVITE, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "초대 취소" })
  @Delete("invites/:id")
  cancel(@Param("id") id: string, @Req() req: Request): Promise<{ ok: true }> {
    const user = this.claims(req);
    const payload: CancelInvitationRequest = {
      inviteId: id,
      tenantContext: extractTenantContext(req),
      inviterRole: user.activeRole,
    };
    return firstValueFrom(
      this.userClient
        .send<{ ok: true }>(USER_PATTERNS.CANCEL_INVITATION, payload)
        .pipe(rpcToHttp()),
    );
  }
}
