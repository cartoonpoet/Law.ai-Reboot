import {
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request } from "express";
import {
  NOTIFICATION_PATTERNS,
  type JwtPayload,
  type ListNotificationsRequest,
  type ListNotificationsResponse,
  type MarkAllNotificationsReadRequest,
  type MarkNotificationReadRequest,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";

@ApiTags("notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({
    summary: "내 알림 목록 조회",
    description: "본인 알림만 조회(viewerId=JWT sub). unreadCount 포함",
  })
  @Get()
  list(
    @Req() req: Request,
    @Query("limit") limit?: string,
  ): Promise<ListNotificationsResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ListNotificationsRequest = {
      viewerId: sub,
      limit: limit ? Number(limit) : undefined,
    };
    return firstValueFrom(
      this.userClient
        .send<ListNotificationsResponse>(NOTIFICATION_PATTERNS.LIST, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "내 알림 전체 읽음 처리",
    description: "본인 알림 전체를 읽음 처리",
  })
  @Patch("read-all")
  markAllRead(@Req() req: Request): Promise<void> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: MarkAllNotificationsReadRequest = { viewerId: sub };
    return firstValueFrom(
      this.userClient
        .send<void>(NOTIFICATION_PATTERNS.MARK_ALL_READ, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "알림 단건 읽음 처리",
    description: "본인 알림만 읽음 처리(타인 알림 id 는 무영향)",
  })
  @Patch(":id/read")
  markRead(@Param("id") id: string, @Req() req: Request): Promise<void> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: MarkNotificationReadRequest = { id, viewerId: sub };
    return firstValueFrom(
      this.userClient
        .send<void>(NOTIFICATION_PATTERNS.MARK_READ, payload)
        .pipe(rpcToHttp()),
    );
  }
}
