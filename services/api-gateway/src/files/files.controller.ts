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
  FILE_PATTERNS,
  type AuditCompareReportRequest,
  type ConfirmUploadRequest,
  type FileAttachmentDto,
  type GetDownloadUrlResponse,
  type JwtPayload,
  type PresignUploadRequest,
  type PresignUploadResponse,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";
import { AuditCompareReportDto, ConfirmDto, PresignDto } from "./dto";

/**
 * 파일 업로드/다운로드 게이트웨이.
 *
 * - presign: 클라이언트가 SubtleCrypto 로 sha256 계산 후 호출 → R2 PUT URL + uploadToken 발급.
 * - confirm: 클라이언트가 R2 PUT 후 ETag 와 함께 호출 → user-service 가 HeadObject 검증 + File row.
 * - download: 권한 검증 후 단기 presigned GET URL 을 JSON 으로 반환.
 *   (302 리다이렉트는 fetch 의 opaqueredirect 로 Location 헤더가 가려져 프론트가 2회 호출하게 됨 → JSON 으로 단일 호출.)
 */
@ApiTags("files")
@Controller("files")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "R2 업로드 URL 발급(presigned PUT)" })
  @Post("presign")
  presign(
    @Body() dto: PresignDto,
    @Req() req: Request,
  ): Promise<PresignUploadResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: PresignUploadRequest = {
      ...dto,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<PresignUploadResponse>(FILE_PATTERNS.PRESIGN, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "업로드 확정(HeadObject 검증 + File row 생성)" })
  @Post("confirm")
  confirm(
    @Body() dto: ConfirmDto,
    @Req() req: Request,
  ): Promise<FileAttachmentDto> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ConfirmUploadRequest = {
      ...dto,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<FileAttachmentDto>(FILE_PATTERNS.CONFIRM, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "파일 다운로드 URL 발급",
    description: "권한 검증 후 단기 presigned GET URL 을 JSON 으로 반환. 프론트는 url 을 window.open 으로 연다.",
  })
  @Get(":id/download")
  async download(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<GetDownloadUrlResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    return firstValueFrom(
      this.userClient
        .send<GetDownloadUrlResponse>(FILE_PATTERNS.GET_DOWNLOAD_URL, {
          fileId: id,
          viewerId: sub,
          tenantContext: extractTenantContext(req),
        })
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "비교 보고서 다운로드 감사 기록",
    description:
      "클라이언트가 변경 보고서 PDF 생성 직후 best-effort 로 호출. 두 fileId/contractId 와 viewer 권한을 서버가 재검증한다.",
  })
  @Post("audit/compare-report")
  async auditCompareReport(
    @Body() dto: AuditCompareReportDto,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: AuditCompareReportRequest = {
      ...dto,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<{ ok: true }>(FILE_PATTERNS.AUDIT_COMPARE_REPORT, payload)
        .pipe(rpcToHttp()),
    );
  }
}
