import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request } from "express";
import {
  AI_ANALYSIS_PATTERNS,
  AI_CREDENTIAL_PATTERNS,
  AI_PATTERNS,
  type AiAnalysisDto,
  type AiListModelsRequest,
  type AiListModelsResult,
  type GetAiAnalysisRequest,
  type GetMyAiCredentialRequest,
  type JwtPayload,
  type MyAiCredentialDto,
  type RetryAiAnalysisRequest,
  type SaveMyAiCredentialRequest,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";
import { RetryAiAnalysisDto, SaveMyAiCredentialDto } from "./dto";

@ApiTags("ai")
@Controller("ai")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    @Inject("AI_CLIENT") private readonly aiClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "내 AI 연동 자격증명 조회", description: "미설정 시 null" })
  @Get("my-credential")
  getMyCredential(@Req() req: Request): Promise<MyAiCredentialDto | null> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: GetMyAiCredentialRequest = {
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<MyAiCredentialDto | null>(AI_CREDENTIAL_PATTERNS.GET, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "내 AI 연동 자격증명 저장/갱신",
    description: "API 키를 실제 프로바이더 호출로 검증한 뒤 암호화 저장",
  })
  @Put("my-credential")
  saveMyCredential(
    @Body() dto: SaveMyAiCredentialDto,
    @Req() req: Request,
  ): Promise<MyAiCredentialDto> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: SaveMyAiCredentialRequest = {
      ...dto,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<MyAiCredentialDto>(AI_CREDENTIAL_PATTERNS.SAVE, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "프로바이더별 사용 가능 모델 목록",
    description: "설정 화면 모델 드롭다운용 — ai-service.ai.listModels 프록시",
  })
  @Get("my-credential/models")
  listModels(@Query("provider") provider: string): Promise<AiListModelsResult> {
    const payload: AiListModelsRequest = { provider };
    return firstValueFrom(
      this.aiClient
        .send<AiListModelsResult>(AI_PATTERNS.LIST_MODELS, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "AI 분석 결과 조회", description: "대상(targetType/targetId)의 kind 별 최신 분석 결과. 없으면 null" })
  @Get("analysis")
  getAnalysis(
    @Query("targetType") targetType: string,
    @Query("targetId") targetId: string,
    @Query("kind") kind: string,
    @Req() req: Request,
  ): Promise<AiAnalysisDto | null> {
    const payload: GetAiAnalysisRequest = {
      targetType,
      targetId,
      kind,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<AiAnalysisDto | null>(AI_ANALYSIS_PATTERNS.GET, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "AI 분석 재시도", description: "기존 분석 행을 다시 트리거(비동기 처리)" })
  @Post("analysis/retry")
  retryAnalysis(
    @Body() dto: RetryAiAnalysisDto,
    @Req() req: Request,
  ): Promise<void> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: RetryAiAnalysisRequest = {
      ...dto,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<void>(AI_ANALYSIS_PATTERNS.RETRY, payload)
        .pipe(rpcToHttp()),
    );
  }
}
