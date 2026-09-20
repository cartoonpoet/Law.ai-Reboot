import { Module } from "@nestjs/common";
import { StatsModule } from "./stats/stats.module";
import { StatusEventsModule } from "./common/status-events/status-events.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { ContractsModule } from "./contracts/contracts.module";
import { CommentsModule } from "./comments/comments.module";
import { FilesModule } from "./files/files.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { DepartmentsModule } from "./departments/departments.module";
import { ContractCategoriesModule } from "./contractCategories/contractCategories.module";
import { AdminModule } from "./admin/admin.module";
import { TenantsModule } from "./tenants/tenants.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { AiCredentialsModule } from "./ai-credentials/ai-credentials.module";
import { AiClientModule } from "./ai-client/ai-client.module";
import { AssistantModule } from "./assistant/assistant.module";
import { SupportModule } from "./support/support.module";
import { AdvicesModule } from "./advices/advices.module";
import { DocumentTemplatesModule } from "./document-templates/document-templates.module";

@Module({
  imports: [
    PrismaModule,
    StatusEventsModule,
    StatsModule,
    UsersModule,
    CompaniesModule,
    ContractsModule,
    CommentsModule,
    FilesModule,
    NotificationsModule,
    ApprovalsModule,
    DepartmentsModule,
    ContractCategoriesModule,
    AdminModule,
    TenantsModule,
    InvitationsModule,
    AiClientModule,
    AiCredentialsModule,
    AssistantModule,
    SupportModule,
    AdvicesModule,
    DocumentTemplatesModule,
  ],
})
export class AppModule {}
