import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  DOCUMENT_PATTERNS,
  type AiDraftRequest,
  type AiDraftResponse,
  type AiRewriteRequest,
  type AiRewriteResponse,
  type AiReviewRequest,
  type AiReviewResponse,
  type ExportDocumentRequest,
  type ExportDocumentResponse,
  type ImportDocumentRequest,
  type ImportDocumentResponse,
  type JwtPayload,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { extractTenantContext } from "../common/tenant-context";
import { rpcToHttp } from "../common/rpc-to-http";
import { AiDraftDto, AiRewriteDto, AiReviewDto, ExportDocumentDto, ImportDocumentDto } from "./dto";

const getViewerId = (req: Request): string => (req as Request & { user: JwtPayload }).user.sub;

/** 문서 편집기 — Tiptap JSON↔docx 변환, DOCX 들여오기, 로아이 AI 3종. */
@ApiTags("documents")
@Controller("documents")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(@Inject("USER_CLIENT") private readonly userClient: ClientProxy) {}

  @ApiOperation({ summary: "docx로 내보내기", description: "Tiptap JSON을 실제 .docx 바이트(base64)로 변환한다(저장하지 않음)." })
  @Post("export")
  export(@Body() dto: ExportDocumentDto, @Req() req: Request): Promise<ExportDocumentResponse> {
    const payload: ExportDocumentRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<ExportDocumentResponse>(DOCUMENT_PATTERNS.EXPORT, payload);
  }

  @ApiOperation({ summary: "DOCX 들여오기", description: ".docx 업로드를 에디터에 채울 HTML로 변환한다(원본은 저장하지 않음)." })
  @Post("import")
  import(@Body() dto: ImportDocumentDto, @Req() req: Request): Promise<ImportDocumentResponse> {
    const payload: ImportDocumentRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<ImportDocumentResponse>(DOCUMENT_PATTERNS.IMPORT, payload);
  }

  @ApiOperation({ summary: "로아이 — 초안 생성" })
  @Post("ai-draft")
  aiDraft(@Body() dto: AiDraftDto, @Req() req: Request): Promise<AiDraftResponse> {
    const payload: AiDraftRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<AiDraftResponse>(DOCUMENT_PATTERNS.AI_DRAFT, payload);
  }

  @ApiOperation({ summary: "로아이 — 선택 문장 다듬기/조항 작성" })
  @Post("ai-rewrite")
  aiRewrite(@Body() dto: AiRewriteDto, @Req() req: Request): Promise<AiRewriteResponse> {
    const payload: AiRewriteRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<AiRewriteResponse>(DOCUMENT_PATTERNS.AI_REWRITE, payload);
  }

  @ApiOperation({ summary: "로아이 — 초안 검토" })
  @Post("ai-review")
  aiReview(@Body() dto: AiReviewDto, @Req() req: Request): Promise<AiReviewResponse> {
    const payload: AiReviewRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<AiReviewResponse>(DOCUMENT_PATTERNS.AI_REVIEW, payload);
  }

  private send<T>(pattern: string, payload: unknown): Promise<T> {
    return firstValueFrom(this.userClient.send<T>(pattern, payload).pipe(rpcToHttp()));
  }
}
