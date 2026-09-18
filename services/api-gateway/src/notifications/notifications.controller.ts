import {
  Controller,
  Get,
  Inject,
  type MessageEvent,
  Param,
  Patch,
  Query,
  Req,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Observable, firstValueFrom } from "rxjs";
import type { Request } from "express";
import {
  NOTIFICATION_PATTERNS,
  type JwtPayload,
  type ListNotificationsRequest,
  type ListNotificationsResponse,
  type MarkAllNotificationsReadRequest,
  type MarkNotificationReadRequest,
  type MarkNotificationReadResult,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SseJwtGuard } from "../auth/sse-jwt.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";
import { NotificationHubService } from "./notification-hub.service";

// 가드 배치: 헤더(Bearer) 검증 JwtAuthGuard 를 클래스 레벨에 두면
// 헤더 불가한 EventSource(stream)도 함께 막힌다(Nest 는 클래스+메서드 가드를 모두 실행).
// 따라서 클래스 가드를 제거하고 GET/PATCH 는 개별 JwtAuthGuard,
// stream 은 쿼리토큰 SseJwtGuard 만 적용한다.
@ApiTags("notifications")
@Controller("notifications")
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    private readonly hub: NotificationHubService,
  ) {}

  @ApiOperation({
    summary: "내 알림 실시간 스트림(SSE)",
    description:
      "EventSource 로 연결. 헤더 불가하므로 ?token=<accessToken> 쿼리로 인증. " +
      "코멘트 멘션 등 신규 알림을 즉시 push 한다.",
  })
  @Sse("stream")
  @UseGuards(SseJwtGuard)
  @SkipThrottle()
  stream(@Req() req: Request): Observable<MessageEvent> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    return this.hub.subscribe(sub);
  }

  @ApiOperation({
    summary: "내 알림 목록 조회",
    description: "본인 알림만 조회(viewerId=JWT sub). unreadCount 포함",
  })
  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Req() req: Request,
    @Query("limit") limit?: string,
  ): Promise<ListNotificationsResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ListNotificationsRequest = {
      viewerId: sub,
      limit: limit ? Number(limit) : undefined,
      tenantContext: extractTenantContext(req),
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
  @UseGuards(JwtAuthGuard)
  markAllRead(@Req() req: Request): Promise<MarkNotificationReadResult> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: MarkAllNotificationsReadRequest = {
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<MarkNotificationReadResult>(NOTIFICATION_PATTERNS.MARK_ALL_READ, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "알림 단건 읽음 처리",
    description: "본인 알림만 읽음 처리(타인 알림 id 는 무영향)",
  })
  @Patch(":id/read")
  @UseGuards(JwtAuthGuard)
  markRead(@Param("id") id: string, @Req() req: Request): Promise<MarkNotificationReadResult> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: MarkNotificationReadRequest = {
      id,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<MarkNotificationReadResult>(NOTIFICATION_PATTERNS.MARK_READ, payload)
        .pipe(rpcToHttp()),
    );
  }
}
