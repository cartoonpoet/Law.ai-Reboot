import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { ContractsModule } from "./contracts/contracts.module";
import { CommentsModule } from "./comments/comments.module";
import { DepartmentsModule } from "./departments/departments.module";
import { ContractCategoriesModule } from "./contractCategories/contractCategories.module";

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    CompaniesModule,
    ContractsModule,
    CommentsModule,
    DepartmentsModule,
    ContractCategoriesModule,
  ],
})
export class AppModule {}
