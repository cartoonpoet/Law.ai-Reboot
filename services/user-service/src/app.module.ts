import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";

@Module({
  imports: [PrismaModule, UsersModule, CompaniesModule],
})
export class AppModule {}
