import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  CONTRACT_CATEGORY_PATTERNS,
  type ListContractCategoriesRequest,
} from "@lawai/contracts";
import { ContractCategoriesService } from "./contractCategories.service";

@Controller()
export class ContractCategoriesController {
  constructor(
    private readonly contractCategories: ContractCategoriesService,
  ) {}

  @MessagePattern(CONTRACT_CATEGORY_PATTERNS.LIST)
  list(@Payload() req: ListContractCategoriesRequest = {}) {
    return this.contractCategories.list(req);
  }
}
