import { Module } from "@nestjs/common";
import { AiAnalysisController } from "./ai-analysis.controller";
import { AiAnalysisService } from "./ai-analysis.service";
import { AiCredentialsModule } from "../ai-credentials/ai-credentials.module";

@Module({
  controllers: [AiAnalysisController],
  imports: [AiCredentialsModule],
  providers: [AiAnalysisService],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}
