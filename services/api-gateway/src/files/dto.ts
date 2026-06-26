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
