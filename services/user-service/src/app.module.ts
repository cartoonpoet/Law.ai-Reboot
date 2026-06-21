import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { ContractsModule } from "./contracts/contracts.module";

@Module({
  imports: [PrismaModule, UsersModule, CompaniesModule, ContractsModule],
})
export class AppModule {}
