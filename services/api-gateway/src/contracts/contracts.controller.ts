import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request } from "express";
import {
  CONTRACT_PATTERNS,
  type ContractResponse,
  type CreateContractRequest,
  type JwtPayload,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { CreateContractDto } from "./dto";

@ApiTags("contracts")
@Controller("contracts")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractsController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "계약검토 요청 생성" })
  @Post()
  create(
    @Body() dto: CreateContractDto,
    @Req() req: Request,
  ): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: CreateContractRequest = { ...dto, createdById: sub };
    return firstValueFrom(
      this.userClient
        .send<ContractResponse>(CONTRACT_PATTERNS.CREATE, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "계약 단건 조회" })
  @Get(":id")
  get(@Param("id") id: string): Promise<ContractResponse> {
    return firstValueFrom(
      this.userClient
        .send<ContractResponse>(CONTRACT_PATTERNS.GET, { id })
        .pipe(rpcToHttp()),
    );
  }
}
