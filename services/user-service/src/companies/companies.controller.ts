import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { COMPANY_PATTERNS } from "@lawai/contracts";
import type { SearchCompaniesRequest, CreateCompanyRequest } from "@lawai/contracts";
import { CompaniesService } from "./companies.service";

@Controller()
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @MessagePattern(COMPANY_PATTERNS.SEARCH)
  search(@Payload() req: SearchCompaniesRequest) {
    return this.companies.search(req);
  }

  @MessagePattern(COMPANY_PATTERNS.CREATE)
  create(@Payload() req: CreateCompanyRequest) {
    return this.companies.create(req);
  }
}
