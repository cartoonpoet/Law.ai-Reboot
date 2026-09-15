import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  FILE_PATTERNS,
  type AuditCompareReportRequest,
  type ConfirmUploadRequest,
  type FileAttachmentDto,
  type GetDownloadUrlRequest,
  type GetDownloadUrlResponse,
  type GetFileContentSourceRequest,
  type GetFileContentSourceResponse,
  type GetUploadTargetRequest,
  type GetUploadTargetResponse,
  type PresignUploadRequest,
  type PresignUploadResponse,
} from "@lawai/contracts";
import { FilesService } from "./files.service";

@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @MessagePattern(FILE_PATTERNS.PRESIGN)
  presign(
    @Payload() req: PresignUploadRequest,
  ): Promise<PresignUploadResponse> {
    return this.files.presign(req);
  }

  @MessagePattern(FILE_PATTERNS.CONFIRM)
  confirm(
    @Payload() req: ConfirmUploadRequest,
  ): Promise<FileAttachmentDto> {
    return this.files.confirm(req);
  }

  @MessagePattern(FILE_PATTERNS.GET_DOWNLOAD_URL)
  getDownloadUrl(
    @Payload() req: GetDownloadUrlRequest,
  ): Promise<GetDownloadUrlResponse> {
    return this.files.getDownloadUrl(req);
  }

  @MessagePattern(FILE_PATTERNS.GET_CONTENT_SOURCE)
  getContentSource(
    @Payload() req: GetFileContentSourceRequest,
  ): Promise<GetFileContentSourceResponse> {
    return this.files.getContentSource(req);
  }

  @MessagePattern(FILE_PATTERNS.GET_UPLOAD_TARGET)
  getUploadTarget(
    @Payload() req: GetUploadTargetRequest,
  ): Promise<GetUploadTargetResponse> {
    return this.files.getUploadTarget(req);
  }

  @MessagePattern(FILE_PATTERNS.AUDIT_COMPARE_REPORT)
  auditCompareReport(
    @Payload() req: AuditCompareReportRequest,
  ): Promise<{ ok: true }> {
    return this.files.auditCompareReport(req);
  }
}
