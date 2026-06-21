import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
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
  type ContractStatus,
  type CreateContractRequest,
  type JwtPayload,
  type ListContractsRequest,
  type ListContractsResponse,
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

  @ApiOperation({ summary: "계약 목록 조회", description: "필터(q·status·party·mine)·페이지네이션" })
  @Get()
  list(
    @Req() req: Request,
    @Query("q") q?: string,
    @Query("status") status?: ContractStatus,
    @Query("party") party?: string,
    @Query("mine") mine?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<ListContractsResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ListContractsRequest = {
      q: q || undefined,
      status: status || undefined,
      party: party || undefined,
      mineOf: mine === "true" ? sub : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    };
    return firstValueFrom(
      this.userClient
        .send<ListContractsResponse>(CONTRACT_PATTERNS.LIST, payload)
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
