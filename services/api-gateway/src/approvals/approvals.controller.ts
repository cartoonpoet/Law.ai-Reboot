import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom, map } from "rxjs";
import type { Request } from "express";
import {
  APPROVAL_PATTERNS,
  type ApprovalInboxRequest,
  type ApprovalInboxResponse,
  type ApprovalLineDto,
  type DecideApprovalRequest,
  type DecideApprovalResult,
  type JwtPayload,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";
import { NotificationHubService } from "../notifications/notification-hub.service";
import { DecideApprovalDto } from "./dto";

@ApiTags("approvals")
@Controller("approvals")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApprovalsController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    private readonly hub: NotificationHubService,
  ) {}

  @ApiOperation({
    summary: "결재 대기함",
    description: "내 차례인 진행 중 결재(pending)와 내가 처리한 결재(processed·최근 30일)",
  })
  @Get("inbox")
  inbox(@Req() req: Request): Promise<ApprovalInboxResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ApprovalInboxRequest = {
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<ApprovalInboxResponse>(APPROVAL_PATTERNS.INBOX, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "결재 승인/반려",
    description: "현재 차례의 결재자만 가능. 반려 시 대상 도메인 상태가 복귀된다.",
  })
  @Post(":lineId/decide")
  decide(
    @Param("lineId") lineId: string,
    @Body() dto: DecideApprovalDto,
    @Req() req: Request,
  ): Promise<ApprovalLineDto> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: DecideApprovalRequest = {
      lineId,
      decision: dto.decision,
      comment: dto.comment,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<DecideApprovalResult>(APPROVAL_PATTERNS.DECIDE, payload)
        .pipe(
          rpcToHttp(),
          map((result: DecideApprovalResult) => {
            result.notifications.forEach((n) =>
              this.hub.push(n.recipientId, n.notification),
            );
            return result.line;
          }),
        ),
    );
  }
}
