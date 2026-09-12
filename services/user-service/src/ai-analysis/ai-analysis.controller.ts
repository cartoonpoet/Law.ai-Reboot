import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AI_ANALYSIS_PATTERNS } from "@lawai/contracts";
import type { GetAiAnalysisRequest, RetryAiAnalysisRequest } from "@lawai/contracts";
import { AiAnalysisService } from "./ai-analysis.service";

@Controller()
export class AiAnalysisController {
  constructor(private readonly aiAnalysis: AiAnalysisService) {}

  // tenantContext/viewerId 는 게이트웨이가 JWT 에서 채워 보낸다 — 테넌트 격리와
  // 재시도 권한 판정의 유일한 입력이므로 반드시 서비스까지 전달한다.
  @MessagePattern(AI_ANALYSIS_PATTERNS.GET)
  get(@Payload() req: GetAiAnalysisRequest) {
    return this.aiAnalysis.get(req.targetType, req.targetId, req.kind, req.tenantContext!);
  }

  @MessagePattern(AI_ANALYSIS_PATTERNS.RETRY)
  retry(@Payload() req: RetryAiAnalysisRequest) {
    return this.aiAnalysis.retry(
      req.targetType,
      req.targetId,
      req.kind,
      req.viewerId,
      req.tenantContext!,
    );
  }
}
