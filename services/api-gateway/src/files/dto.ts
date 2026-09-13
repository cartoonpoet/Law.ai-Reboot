import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  type AllowedMimeType,
} from "@lawai/contracts";

// presign 요청 — fileName/size/mimeType/sha256(64자 hex) 검증.
export class PresignDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  contractId!: string;

  @ApiPropertyOptional({ description: "코멘트 첨부 후 첨부 시 코멘트 id(현 P3 흐름은 null)" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  commentId?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ description: "바이트", minimum: 1, maximum: MAX_FILE_SIZE_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE_BYTES)
  size!: number;

  @ApiProperty({ enum: ALLOWED_MIME_TYPES })
  @IsIn(ALLOWED_MIME_TYPES as readonly string[])
  mimeType!: AllowedMimeType;

  @ApiProperty({ description: "SHA-256 hex (64자)" })
  @Matches(/^[0-9a-f]{64}$/)
  sha256!: string;

  @ApiPropertyOptional({
    enum: ["contract", "attach", "ref", "etc", "signed"],
    description:
      "파일 역할 — 계약 본 파일은 contract/attach/ref, 코멘트 첨부는 생략(기본 attach).",
  })
  @IsOptional()
  @IsIn(["contract", "attach", "ref", "etc", "signed"])
  role?: "contract" | "attach" | "ref" | "etc" | "signed";
}

// 비교 보고서 다운로드 감사 — 두 fileId 가 같은 contractId 의 파일인지 + viewer 권한 서버에서 재검증.
export class AuditCompareReportDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  contractId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  fileAId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  fileAName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  fileBId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  fileBName!: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  addedLines!: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  removedLines!: number;
}

// confirm 요청 — 토큰 + R2 PUT 응답 ETag.
export class ConfirmDto {
  @ApiProperty({ description: "presign 응답의 uploadToken" })
  @IsString()
  @MinLength(1)
  uploadToken!: string;

  @ApiProperty({ description: "R2 PUT 응답 ETag (양끝 따옴표 제거 권장)" })
  @IsString()
  @MaxLength(256)
  etag!: string;
}
