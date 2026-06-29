import {
  Body, Controller, Get, Inject, Post, Query, Req, UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request } from "express";
import { COMPANY_PATTERNS, type Company } from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";
import { CreateCompanyDto } from "./dto";

@ApiTags("companies")
@Controller("companies")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "회사 검색", description: "이름·사업자번호·대표자 부분일치 검색" })
  @Get()
  search(
    @Req() req: Request,
    @Query("q") q = "",
    @Query("limit") limit?: string,
  ): Promise<Company[]> {
    return firstValueFrom(
      this.userClient
        .send<Company[]>(COMPANY_PATTERNS.SEARCH, {
          q,
          limit: limit ? Math.min(Number(limit), 100) : undefined,
          tenantContext: extractTenantContext(req),
        })
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "회사 신규 등록" })
  @Post()
  create(@Body() dto: CreateCompanyDto, @Req() req: Request): Promise<Company> {
    return firstValueFrom(
      this.userClient
        .send<Company>(COMPANY_PATTERNS.CREATE, {
          ...dto,
          tenantContext: extractTenantContext(req),
        })
        .pipe(rpcToHttp()),
    );
  }
}
