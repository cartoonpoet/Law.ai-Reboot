import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request } from "express";
import { DEPARTMENT_PATTERNS, type DepartmentDto } from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";

@ApiTags("departments")
@Controller("departments")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepartmentsController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "부서 목록" })
  @Get()
  list(@Req() req: Request): Promise<DepartmentDto[]> {
    return firstValueFrom(
      this.userClient
        .send<DepartmentDto[]>(DEPARTMENT_PATTERNS.LIST, {
          tenantContext: extractTenantContext(req),
        })
        .pipe(rpcToHttp()),
    );
  }
}
