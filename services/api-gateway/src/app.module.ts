import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { GatewayClientsModule } from "./clients/clients.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { ContractsModule } from "./contracts/contracts.module";
import { FilesModule } from "./files/files.module";
import { DepartmentsModule } from "./departments/departments.module";
import { ContractCategoriesModule } from "./contractCategories/contractCategories.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { NotificationHubModule } from "./notifications/notification-hub.module";
import { AdminModule } from "./admin/admin.module";
import { TenantsGatewayModule } from "./tenants/tenants.module";
import { AiModule } from "./ai/ai.module";
import { PublicModule } from "./public/public.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    GatewayClientsModule,
    NotificationHubModule,
    ApprovalsModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    ContractsModule,
    FilesModule,
    DepartmentsModule,
    ContractCategoriesModule,
    NotificationsModule,
    AdminModule,
    TenantsGatewayModule,
    AiModule,
    PublicModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
