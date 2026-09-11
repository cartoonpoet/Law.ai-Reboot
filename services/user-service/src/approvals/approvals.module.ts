import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";
import { ApprovalOutcomeRegistry } from "./approval-outcome";

@Module({
  imports: [NotificationsModule],
  controllers: [ApprovalsController],
  // 대상 도메인(contracts 등)이 submit 호출·outcome 핸들러 등록에 쓰므로 둘 다 export.
  providers: [ApprovalsService, ApprovalOutcomeRegistry],
  exports: [ApprovalsService, ApprovalOutcomeRegistry],
})
export class ApprovalsModule {}
