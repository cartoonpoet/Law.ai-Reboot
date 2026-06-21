import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CONTRACT_PATTERNS } from "@lawai/contracts";
import type {
  CreateContractRequest,
  GetContractRequest,
  ListContractsRequest,
  UpdateContractRequest,
  UpdateContractStatusRequest,
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

  @MessagePattern(CONTRACT_PATTERNS.UPDATE)
  update(@Payload() req: UpdateContractRequest) {
    return this.contracts.update(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.UPDATE_STATUS)
  updateStatus(@Payload() req: UpdateContractStatusRequest) {
    return this.contracts.updateStatus(req);
  }
}
