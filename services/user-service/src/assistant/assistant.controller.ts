import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ASSISTANT_PATTERNS } from "@lawai/contracts";
import type { AssistantChatRequest, DashboardBriefRequest } from "@lawai/contracts";
import { AssistantService } from "./assistant.service";

@Controller()
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  // viewerId/tenantContext 는 게이트웨이가 JWT 에서 채워 보낸다 — 넘길 업무 데이터 범위의 유일한 기준.
  @MessagePattern(ASSISTANT_PATTERNS.CHAT)
  chat(@Payload() req: AssistantChatRequest) {
    return this.assistant.chat(req);
  }

  @MessagePattern(ASSISTANT_PATTERNS.BRIEF)
  brief(@Payload() req: DashboardBriefRequest) {
    return this.assistant.brief(req);
  }
}
