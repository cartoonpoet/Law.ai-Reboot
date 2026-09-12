import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AI_ANALYSIS_PATTERNS } from "@lawai/contracts";
import type { GetAiAnalysisRequest, RetryAiAnalysisRequest } from "@lawai/contracts";
import { AiAnalysisService } from "./ai-analysis.service";

@Controller()
export class AiAnalysisController {
  constructor(private readonly aiAnalysis: AiAnalysisService) {}

  @MessagePattern(AI_ANALYSIS_PATTERNS.GET)
  get(@Payload() req: GetAiAnalysisRequest) {
    return this.aiAnalysis.get(req.targetType, req.targetId, req.kind);
  }

  @MessagePattern(AI_ANALYSIS_PATTERNS.RETRY)
  retry(@Payload() req: RetryAiAnalysisRequest) {
    return this.aiAnalysis.retry(req.targetType, req.targetId, req.kind);
  }
}
