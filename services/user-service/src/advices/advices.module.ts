import { Module } from "@nestjs/common";
import { ApprovalsModule } from "../approvals/approvals.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdviceAnswerApprovalHandler, AdviceRequestApprovalHandler } from "./advices-approval.handler";
import { AdvicesController } from "./advices.controller";
import { AdvicesService } from "./advices.service";

@Module({
  // ApprovalsModule: 요청·회신 결재 상신/조회 + 결재 확정 핸들러 등록.
  // NotificationsModule: 배정·질의·회신·종결 알림.
  imports: [ApprovalsModule, NotificationsModule],
  controllers: [AdvicesController],
  providers: [AdvicesService, AdviceRequestApprovalHandler, AdviceAnswerApprovalHandler],
})
export class AdvicesModule {}
