import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request } from "express";
import {
  CONTRACT_CATEGORY_PATTERNS,
  type ContractCategoryDto,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";

@ApiTags("contract-categories")
@Controller("contract-categories")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractCategoriesController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "계약 분류 트리(flat) 목록" })
  @Get()
  list(@Req() req: Request): Promise<ContractCategoryDto[]> {
    return firstValueFrom(
      this.userClient
        .send<ContractCategoryDto[]>(CONTRACT_CATEGORY_PATTERNS.LIST, {
          tenantContext: extractTenantContext(req),
        })
        .pipe(rpcToHttp()),
    );
  }
}
