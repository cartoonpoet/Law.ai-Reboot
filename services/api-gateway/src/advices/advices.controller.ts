import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  ADVICE_PATTERNS,
  type AddAdviceMessageRequest,
  type AdviceMutationResult,
  type AdviceResponse,
  type AssignAdviceRequest,
  type CloseAdviceRequest,
  type CreateAdviceRequest,
  type GetAdviceRequest,
  type JwtPayload,
  type ListAdvicesRequest,
  type ListAdvicesResponse,
  type ResubmitAdviceRequestApprovalRequest,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { extractTenantContext } from "../common/tenant-context";
import { rpcToHttp } from "../common/rpc-to-http";
import { NotificationHubService } from "../notifications/notification-hub.service";
import { AddAdviceMessageDto, AssignAdviceDto, CreateAdviceDto, ResubmitAdviceRequestApprovalDto } from "./dto";

const getViewerId = (req: Request): string => (req as Request & { user: JwtPayload }).user.sub;

// 쿼리스트링 숫자 — 숫자가 아니거나 1 미만이면 서버 기본값을 쓴다.
const toPositiveInt = (value?: string): number | undefined => {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
};

/** 법률자문 — 요청 · 조회 · 담당 배정 · 질의/회신 · 종결. */
@ApiTags("advices")
@Controller("advices")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdvicesController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    private readonly hub: NotificationHubService,
  ) {}

  @ApiOperation({
    summary: "자문 요청",
    description: "결재선에 결재자가 있으면 요청 결재를 올리고(결재자에게 실시간 알림), 없으면 바로 접수한다.",
  })
  @Post()
  create(@Body() dto: CreateAdviceDto, @Req() req: Request): Promise<AdviceResponse> {
    const payload: CreateAdviceRequest = {
      ...dto,
      ownerId: dto.ownerId ?? null,
      etcRequest: dto.etcRequest ?? null,
      dueDate: dto.dueDate ?? null,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.sendAndPush(ADVICE_PATTERNS.CREATE, payload);
  }

  @ApiOperation({ summary: "자문 목록", description: "statuses(쉼표 구분)·q·category·mine·페이지" })
  @Get()
  list(
    @Req() req: Request,
    @Query("statuses") statuses?: string,
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("mine") mine?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<ListAdvicesResponse> {
    const payload: ListAdvicesRequest = {
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
      statuses: statuses || undefined,
      q: q || undefined,
      category: category || undefined,
      mine: mine === "true",
      page: toPositiveInt(page),
      pageSize: toPositiveInt(pageSize),
    };
    return this.send<ListAdvicesResponse>(ADVICE_PATTERNS.LIST, payload);
  }

  @ApiOperation({ summary: "자문 상세", description: "질의·회신 전체와 보는 사람이 할 수 있는 일(permissions)을 함께 준다." })
  @Get(":id")
  get(@Param("id") id: string, @Req() req: Request): Promise<AdviceResponse> {
    const payload: GetAdviceRequest = { id, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<AdviceResponse>(ADVICE_PATTERNS.GET, payload);
  }

  @ApiOperation({ summary: "담당 배정·변경", description: "법무팀 전용. 접수 상태면 검토를 시작한다." })
  @Post(":id/assign")
  assign(@Param("id") id: string, @Body() dto: AssignAdviceDto, @Req() req: Request): Promise<AdviceResponse> {
    const payload: AssignAdviceRequest = {
      id,
      ownerId: dto.ownerId,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.send<AdviceResponse>(ADVICE_PATTERNS.ASSIGN, payload);
  }

  @ApiOperation({
    summary: "질의·회신 남기기",
    description: "followup(추가 질의)·reply(요청자 답변)·answer(회신). 회신에 결재선이 있으면 회신 결재를 올린다.",
  })
  @Post(":id/messages")
  addMessage(@Param("id") id: string, @Body() dto: AddAdviceMessageDto, @Req() req: Request): Promise<AdviceResponse> {
    const payload: AddAdviceMessageRequest = {
      id,
      kind: dto.kind,
      body: dto.body,
      approvers: dto.approvers,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.sendAndPush(ADVICE_PATTERNS.ADD_MESSAGE, payload);
  }

  @ApiOperation({ summary: "요청 결재 다시 올리기", description: "요청 결재가 반려된 자문을 작성자가 결재선을 고쳐 다시 올린다." })
  @Post(":id/request-approval")
  resubmitRequestApproval(
    @Param("id") id: string,
    @Body() dto: ResubmitAdviceRequestApprovalDto,
    @Req() req: Request,
  ): Promise<AdviceResponse> {
    const payload: ResubmitAdviceRequestApprovalRequest = {
      id,
      approvers: dto.approvers,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.sendAndPush(ADVICE_PATTERNS.RESUBMIT_REQUEST_APPROVAL, payload);
  }

  @ApiOperation({ summary: "종결", description: "회신 완료된 자문을 요청자나 담당자가 닫는다." })
  @Post(":id/close")
  close(@Param("id") id: string, @Req() req: Request): Promise<AdviceResponse> {
    const payload: CloseAdviceRequest = { id, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<AdviceResponse>(ADVICE_PATTERNS.CLOSE, payload);
  }

  // 결재 상신이 함께 일어나는 동작 — 만들어진 알림(결재 차례·참조)을 실시간으로 밀고 자문만 돌려준다.
  private async sendAndPush(pattern: string, payload: unknown): Promise<AdviceResponse> {
    const result = await this.send<AdviceMutationResult>(pattern, payload);
    result.notifications.forEach((item) => this.hub.push(item.recipientId, item.notification));
    return result.advice;
  }

  private send<T>(pattern: string, payload: unknown): Promise<T> {
    return firstValueFrom(this.userClient.send<T>(pattern, payload).pipe(rpcToHttp()));
  }
}
