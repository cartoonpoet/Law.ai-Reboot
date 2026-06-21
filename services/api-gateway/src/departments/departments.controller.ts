import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { DEPARTMENT_PATTERNS, type DepartmentDto } from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";

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
  list(): Promise<DepartmentDto[]> {
    return firstValueFrom(
      this.userClient
        .send<DepartmentDto[]>(DEPARTMENT_PATTERNS.LIST, {})
        .pipe(rpcToHttp()),
    );
  }
}
