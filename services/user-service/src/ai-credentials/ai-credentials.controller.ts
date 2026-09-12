import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AI_CREDENTIAL_PATTERNS } from "@lawai/contracts";
import type { GetMyAiCredentialRequest, SaveMyAiCredentialRequest } from "@lawai/contracts";
import { AiCredentialsService } from "./ai-credentials.service";

@Controller()
export class AiCredentialsController {
  constructor(private readonly aiCredentials: AiCredentialsService) {}

  @MessagePattern(AI_CREDENTIAL_PATTERNS.GET)
  get(@Payload() req: GetMyAiCredentialRequest) {
    return this.aiCredentials.get(req.viewerId!, req.tenantContext!);
  }

  @MessagePattern(AI_CREDENTIAL_PATTERNS.SAVE)
  save(@Payload() req: SaveMyAiCredentialRequest) {
    return this.aiCredentials.save(req);
  }
}
