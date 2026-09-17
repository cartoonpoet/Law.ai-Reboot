import { Module } from "@nestjs/common";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AdviceAnswerApprovalHandler, AdviceRequestApprovalHandler } from "./advices-approval.handler";
import { AdvicesController } from "./advices.controller";
import { AdvicesService } from "./advices.service";

@Module({
  // ApprovalsModule: 요청·회신 결재 상신/조회 + 결재 확정 핸들러 등록.
  imports: [ApprovalsModule],
  controllers: [AdvicesController],
  providers: [AdvicesService, AdviceRequestApprovalHandler, AdviceAnswerApprovalHandler],
})
export class AdvicesModule {}
