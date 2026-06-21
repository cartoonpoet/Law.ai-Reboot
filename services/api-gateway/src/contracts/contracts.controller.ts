import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
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
  type UpdateContractRequest,
  type UpdateContractStatusRequest,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import {
  CreateContractDto,
  UpdateContractDto,
  UpdateContractStatusDto,
} from "./dto";

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

  @ApiOperation({ summary: "계약 단건 조회", description: "권한 없는 조회자는 비밀참조·상대회사 PII 마스킹" })
  @Get(":id")
  get(@Param("id") id: string, @Req() req: Request): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    return firstValueFrom(
      this.userClient
        .send<ContractResponse>(CONTRACT_PATTERNS.GET, { id, viewerId: sub })
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "계약 필드 수정", description: "관계(상대계약자/결재선/파일/참조)는 변경하지 않음" })
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateContractDto,
  ): Promise<ContractResponse> {
    const payload: UpdateContractRequest = { ...dto, id };
    return firstValueFrom(
      this.userClient
        .send<ContractResponse>(CONTRACT_PATTERNS.UPDATE, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "계약 상태 전이", description: "허용된 전이만 가능" })
  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateContractStatusDto,
  ): Promise<ContractResponse> {
    const payload: UpdateContractStatusRequest = { ...dto, id };
    return firstValueFrom(
      this.userClient
        .send<ContractResponse>(CONTRACT_PATTERNS.UPDATE_STATUS, payload)
        .pipe(rpcToHttp()),
    );
  }
}
