import { Module } from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { ContractQueryService } from "./contract-query.service";
import { ContractCommandService } from "./contract-command.service";
import { ContractLifecycleService } from "./contract-lifecycle.service";
import { ContractAiTriggers } from "./contract-ai-triggers";
import { AuditService } from "./contracts.audit";
import { ContractApprovalOutcomeHandler } from "./contract-approval.handler";
import { PublicStatsService } from "./public-stats.service";
import { FilesModule } from "../files/files.module";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AiAnalysisModule } from "../ai-analysis/ai-analysis.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ContractExpiryNotifier } from "./contract-expiry.notifier";

@Module({
  controllers: [ContractsController],
  // authz(contracts.authz)는 순수 함수 모듈이라 provider 불필요(import 만).
  // FilesModule 은 R2Client(파일 GC), ApprovalsModule 은 결재 상신/조회 + outcome 등록,
  // AiAnalysisModule 은 계약 상태 전이 시 AI 분석 잡 백그라운드 트리거에 사용.
  // PublicStatsService 는 로그인 화면 공개 통계(검토된 계약 수).
  // ContractExpiryNotifier 는 매일 만료 임박 계약 알림을 만든다(NotificationsModule 사용).
  imports: [FilesModule, ApprovalsModule, AiAnalysisModule, NotificationsModule],
  providers: [
    ContractsService,
    ContractQueryService,
    ContractCommandService,
    ContractLifecycleService,
    ContractAiTriggers,
    AuditService,
    ContractApprovalOutcomeHandler,
    PublicStatsService,
    ContractExpiryNotifier,
  ],
})
export class ContractsModule {}
