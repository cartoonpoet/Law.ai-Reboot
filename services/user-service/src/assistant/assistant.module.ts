import { Module } from "@nestjs/common";
import { AiCredentialsModule } from "../ai-credentials/ai-credentials.module";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AssistantController } from "./assistant.controller";
import { AssistantService } from "./assistant.service";

@Module({
  controllers: [AssistantController],
  imports: [AiCredentialsModule, ApprovalsModule],
  providers: [AssistantService],
})
export class AssistantModule {}
