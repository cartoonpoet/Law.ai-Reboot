import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CONTRACT_PATTERNS } from "@lawai/contracts";
import type {
  CreateContractRequest,
  GetContractRequest,
  ListContractsRequest,
} from "@lawai/contracts";
import { ContractsService } from "./contracts.service";

@Controller()
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @MessagePattern(CONTRACT_PATTERNS.CREATE)
  create(@Payload() req: CreateContractRequest) {
    return this.contracts.create(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.GET)
  get(@Payload() req: GetContractRequest) {
    return this.contracts.get(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.LIST)
  list(@Payload() req: ListContractsRequest) {
    return this.contracts.list(req);
  }
}
