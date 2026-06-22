import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { CONTRACT_CATEGORY_PATTERNS } from "@lawai/contracts";
import { ContractCategoriesService } from "./contractCategories.service";

@Controller()
export class ContractCategoriesController {
  constructor(
    private readonly contractCategories: ContractCategoriesService,
  ) {}

  @MessagePattern(CONTRACT_CATEGORY_PATTERNS.LIST)
  list() {
    return this.contractCategories.list();
  }
}
