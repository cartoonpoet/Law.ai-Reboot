import { Module } from "@nestjs/common";
import { AiAnalysisController } from "./ai-analysis.controller";
import { AiAnalysisService } from "./ai-analysis.service";
import { ContractTextExtractor } from "./contract-text.extractor";
import { ScannedPdfReader } from "./scanned-pdf.reader";
import { AiCredentialsModule } from "../ai-credentials/ai-credentials.module";
import { FilesModule } from "../files/files.module";

@Module({
  controllers: [AiAnalysisController],
  // FilesModule 은 계약서 원본 파일을 내려받아 본문을 뽑는 데(R2Client) 사용.
  imports: [AiCredentialsModule, FilesModule],
  providers: [AiAnalysisService, ContractTextExtractor, ScannedPdfReader],
  exports: [AiAnalysisService, ContractTextExtractor],
})
export class AiAnalysisModule {}
