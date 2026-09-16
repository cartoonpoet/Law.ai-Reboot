import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  SUPPORT_PATTERNS,
  type AddSupportMessageRequest,
  type CreateSupportThreadRequest,
  type GetSupportThreadRequest,
  type JwtPayload,
  type ListMySupportThreadsRequest,
  type ListMySupportThreadsResponse,
  type SupportContext,
  type SupportThreadDetail,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { extractTenantContext } from "../common/tenant-context";
import { rpcToHttp } from "../common/rpc-to-http";
import { AddSupportMessageDto, CreateSupportThreadDto } from "./dto";

/** 문의·상담(사용자) — AI 비서의 "문의" 탭이 쓰는 엔드포인트. */
@ApiTags("support")
@Controller("support")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(@Inject("USER_CLIENT") private readonly userClient: ClientProxy) {}

  @ApiOperation({ summary: "문의 남기기", description: "오류 문의면 화면 주소·오류 메시지를 context 로 함께 보낸다." })
  @Post()
  create(@Body() dto: CreateSupportThreadDto, @Req() req: Request): Promise<SupportThreadDetail> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: CreateSupportThreadRequest = {
      userId: sub,
      tenantContext: extractTenantContext(req),
      subject: dto.subject,
      body: dto.body,
      context: dto.context as SupportContext | undefined,
    };
    return firstValueFrom(
      this.userClient.send<SupportThreadDetail>(SUPPORT_PATTERNS.CREATE_THREAD, payload).pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "내 문의 목록" })
  @Get()
  listMine(@Req() req: Request): Promise<ListMySupportThreadsResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ListMySupportThreadsRequest = { userId: sub, tenantContext: extractTenantContext(req) };
    return firstValueFrom(
      this.userClient
        .send<ListMySupportThreadsResponse>(SUPPORT_PATTERNS.LIST_MY_THREADS, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "문의 한 건(주고받은 내용 전체)" })
  @Get(":id")
  get(@Param("id") id: string, @Req() req: Request): Promise<SupportThreadDetail> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: GetSupportThreadRequest = {
      userId: sub,
      threadId: id,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient.send<SupportThreadDetail>(SUPPORT_PATTERNS.GET_THREAD, payload).pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "문의에 이어서 쓰기" })
  @Post(":id/messages")
  addMessage(
    @Param("id") id: string,
    @Body() dto: AddSupportMessageDto,
    @Req() req: Request,
  ): Promise<SupportThreadDetail> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: AddSupportMessageRequest = {
      userId: sub,
      threadId: id,
      body: dto.body,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient.send<SupportThreadDetail>(SUPPORT_PATTERNS.ADD_MESSAGE, payload).pipe(rpcToHttp()),
    );
  }
}
