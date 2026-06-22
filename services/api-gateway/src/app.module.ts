import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { GatewayClientsModule } from "./clients/clients.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { ContractsModule } from "./contracts/contracts.module";
import { DepartmentsModule } from "./departments/departments.module";
import { ContractCategoriesModule } from "./contractCategories/contractCategories.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { NotificationHubModule } from "./notifications/notification-hub.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    GatewayClientsModule,
    NotificationHubModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    ContractsModule,
    DepartmentsModule,
    ContractCategoriesModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
