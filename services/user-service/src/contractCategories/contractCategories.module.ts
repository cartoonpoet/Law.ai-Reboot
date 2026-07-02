import { Module } from "@nestjs/common";
import { ContractCategoriesController } from "./contractCategories.controller";
import { ContractCategoriesService } from "./contractCategories.service";

@Module({
  controllers: [ContractCategoriesController],
  providers: [ContractCategoriesService],
})
export class ContractCategoriesModule {}
