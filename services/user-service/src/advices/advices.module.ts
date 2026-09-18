import { Module } from "@nestjs/common";
import { ApprovalsModule } from "../approvals/approvals.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AiAnalysisModule } from "../ai-analysis/ai-analysis.module";
import { AdviceAnswerApprovalHandler, AdviceRequestApprovalHandler } from "./advices-approval.handler";
import { AdvicesController } from "./advices.controller";
import { AdvicesService } from "./advices.service";

@Module({
  // ApprovalsModule: 요청·회신 결재 상신/조회 + 결재 확정 핸들러 등록.
  // NotificationsModule: 배정·질의·회신·종결 알림.
  // AiAnalysisModule: AI 자문 도우미(요청 접수 시 백그라운드 분석).
  imports: [ApprovalsModule, NotificationsModule, AiAnalysisModule],
  controllers: [AdvicesController],
  providers: [AdvicesService, AdviceRequestApprovalHandler, AdviceAnswerApprovalHandler],
})
export class AdvicesModule {}
