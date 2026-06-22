import { Module } from "@nestjs/common";
import { ContractCategoriesController } from "./contractCategories.controller";

@Module({ controllers: [ContractCategoriesController] })
export class ContractCategoriesModule {}
