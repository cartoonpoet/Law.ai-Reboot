import { Module } from "@nestjs/common";
import { AiCredentialsModule } from "../ai-credentials/ai-credentials.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [AiCredentialsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
