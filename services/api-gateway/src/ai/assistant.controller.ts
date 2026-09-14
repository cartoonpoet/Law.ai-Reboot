import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request } from "express";
import {
  ASSISTANT_PATTERNS,
  type AssistantChatRequest,
  type AssistantChatResponse,
  type JwtPayload,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";
import { AssistantChatDto } from "./assistant.dto";

@ApiTags("ai")
@Controller("ai/assistant")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssistantController {
  constructor(@Inject("USER_CLIENT") private readonly userClient: ClientProxy) {}

  @ApiOperation({
    summary: "AI 비서 대화",
    description: "내 AI 연동 키로 답한다. 내가 볼 수 있는 계약·결재만 근거로 쓰고, 실행은 검증된 제안(actions)으로만 돌려준다.",
  })
  @Post("chat")
  chat(@Body() dto: AssistantChatDto, @Req() req: Request): Promise<AssistantChatResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: AssistantChatRequest = {
      messages: dto.messages,
      screen: dto.screen,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient.send<AssistantChatResponse>(ASSISTANT_PATTERNS.CHAT, payload).pipe(rpcToHttp()),
    );
  }
}
