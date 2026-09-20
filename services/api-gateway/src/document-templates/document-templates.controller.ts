import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  DOCUMENT_TEMPLATE_PATTERNS,
  type CreateTemplateRequest,
  type CreateTemplateResponse,
  type CreateTemplateVersionRequest,
  type GetTemplateRequest,
  type JwtPayload,
  type ListTemplatesRequest,
  type ListTemplatesResponse,
  type ListTemplateVersionsRequest,
  type ListTemplateVersionsResponse,
  type RevertTemplateVersionRequest,
  type TemplateCategoryTypes,
  type TemplateDetailDto,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { extractTenantContext } from "../common/tenant-context";
import { rpcToHttp } from "../common/rpc-to-http";
import { CreateTemplateDto, CreateTemplateVersionDto, RevertTemplateVersionDto } from "./dto";

const getViewerId = (req: Request): string => (req as Request & { user: JwtPayload }).user.sub;

/** 표준양식 관리 — 회사별 계약서 템플릿 CRUD·버전·되돌리기. */
@ApiTags("document-templates")
@Controller("document-templates")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentTemplatesController {
  constructor(@Inject("USER_CLIENT") private readonly userClient: ClientProxy) {}

  @ApiOperation({ summary: "템플릿 만들기", description: "표준양식 관리 권한(inHouseCounsel·시스템관리자)만." })
  @Post()
  create(@Body() dto: CreateTemplateDto, @Req() req: Request): Promise<CreateTemplateResponse> {
    const payload: CreateTemplateRequest = {
      ...dto,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.send<CreateTemplateResponse>(DOCUMENT_TEMPLATE_PATTERNS.CREATE, payload);
  }

  @ApiOperation({ summary: "템플릿 목록", description: "categoryId·q(이름 검색). 회사 구성원 누구나 볼 수 있다." })
  @Get()
  list(
    @Req() req: Request,
    @Query("categoryId") categoryId?: TemplateCategoryTypes,
    @Query("q") q?: string,
  ): Promise<ListTemplatesResponse> {
    const payload: ListTemplatesRequest = {
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
      categoryId,
      q,
    };
    return this.send<ListTemplatesResponse>(DOCUMENT_TEMPLATE_PATTERNS.LIST, payload);
  }

  @ApiOperation({ summary: "템플릿 상세", description: "현재(최신) 버전 내용을 함께 준다." })
  @Get(":id")
  get(@Param("id") id: string, @Req() req: Request): Promise<TemplateDetailDto> {
    const payload: GetTemplateRequest = { id, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<TemplateDetailDto>(DOCUMENT_TEMPLATE_PATTERNS.GET, payload);
  }

  @ApiOperation({ summary: "새 버전 저장", description: "저장할 때마다 새 버전이 쌓인다(불변 이력)." })
  @Post(":id/versions")
  createVersion(
    @Param("id") id: string,
    @Body() dto: CreateTemplateVersionDto,
    @Req() req: Request,
  ): Promise<TemplateDetailDto> {
    const payload: CreateTemplateVersionRequest = {
      id,
      content: dto.content,
      clauseCount: dto.clauseCount ?? null,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.send<TemplateDetailDto>(DOCUMENT_TEMPLATE_PATTERNS.CREATE_VERSION, payload);
  }

  @ApiOperation({ summary: "버전 이력", description: "최신이 먼저." })
  @Get(":id/versions")
  listVersions(@Param("id") id: string, @Req() req: Request): Promise<ListTemplateVersionsResponse> {
    const payload: ListTemplateVersionsRequest = { id, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<ListTemplateVersionsResponse>(DOCUMENT_TEMPLATE_PATTERNS.LIST_VERSIONS, payload);
  }

  @ApiOperation({ summary: "되돌리기", description: "옛 버전 내용을 새 버전으로 다시 저장한다(이력이 지워지지 않는다)." })
  @Post(":id/revert")
  revert(@Param("id") id: string, @Body() dto: RevertTemplateVersionDto, @Req() req: Request): Promise<TemplateDetailDto> {
    const payload: RevertTemplateVersionRequest = {
      id,
      toVersionNo: dto.toVersionNo,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.send<TemplateDetailDto>(DOCUMENT_TEMPLATE_PATTERNS.REVERT, payload);
  }

  private send<T>(pattern: string, payload: unknown): Promise<T> {
    return firstValueFrom(this.userClient.send<T>(pattern, payload).pipe(rpcToHttp()));
  }
}
