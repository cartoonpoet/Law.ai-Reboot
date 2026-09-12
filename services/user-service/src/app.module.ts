import { Module } from "@nestjs/common";
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

@Module({
  imports: [
    PrismaModule,
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
    AiCredentialsModule,
  ],
})
export class AppModule {}
