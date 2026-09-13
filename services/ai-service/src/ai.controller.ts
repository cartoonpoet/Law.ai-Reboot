import { Controller, Inject } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  AI_PATTERNS,
  type AiAnalyzeRequest,
  type AiAnalyzeResult,
  type AiListModelsRequest,
  type AiListModelsResult,
} from "@lawai/contracts";
import { AiProviderRegistry } from "./providers/provider";

@Controller()
export class AiController {
  constructor(
    @Inject(AiProviderRegistry)
    private readonly registry: AiProviderRegistry,
  ) {}

  @MessagePattern(AI_PATTERNS.ANALYZE)
  async analyze(@Payload() req: AiAnalyzeRequest): Promise<AiAnalyzeResult> {
    const provider = this.registry.get("openai");
    return provider.analyze({
      kind: req.kind,
      model: req.model,
      payload: req.payload,
      apiKey: req.apiKey,
    });
  }

  @MessagePattern(AI_PATTERNS.LIST_MODELS)
  async listModels(
    @Payload() req: AiListModelsRequest,
  ): Promise<AiListModelsResult> {
    const provider = this.registry.get(req.provider);
    const models = await provider.listModels();
    return { models };
  }
}
