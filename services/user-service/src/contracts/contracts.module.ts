import { Module } from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { AuditService } from "./contracts.audit";
import { ContractApprovalOutcomeHandler } from "./contract-approval.handler";
import { FilesModule } from "../files/files.module";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AiAnalysisModule } from "../ai-analysis/ai-analysis.module";

@Module({
  controllers: [ContractsController],
  // authz(contracts.authz)는 순수 함수 모듈이라 provider 불필요(import 만).
  // FilesModule 은 R2Client(파일 GC), ApprovalsModule 은 결재 상신/조회 + outcome 등록,
  // AiAnalysisModule 은 계약 상태 전이 시 AI 분석 잡 백그라운드 트리거에 사용.
  imports: [FilesModule, ApprovalsModule, AiAnalysisModule],
  providers: [ContractsService, AuditService, ContractApprovalOutcomeHandler],
})
export class ContractsModule {}
