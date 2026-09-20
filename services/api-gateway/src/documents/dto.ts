import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsString, MaxLength } from "class-validator";

const FILE_NAME_MAX = 100;
const BASE64_MAX = 30_000_000; // 20MB 원본 기준 base64 팽창(~1.37배) 여유
const TEXT_MAX = 20_000;
const REQUEST_MAX = 500;

export class ExportDocumentDto {
  @ApiProperty({ description: "Tiptap JSON(에디터 정본)" })
  @IsObject()
  content!: Record<string, unknown>;

  @ApiProperty({ example: "비밀유지계약서" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(FILE_NAME_MAX)
  fileName!: string;
}

export class ImportDocumentDto {
  @ApiProperty({ description: ".docx 파일 바이트(base64)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(BASE64_MAX)
  base64!: string;

  @ApiProperty({ example: "업로드한파일.docx" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(FILE_NAME_MAX)
  fileName!: string;
}

export class AiDraftDto {
  @ApiProperty({ example: "비밀유지계약서 초안을 만들어 줘" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(REQUEST_MAX)
  request!: string;
}

export class AiRewriteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXT_MAX)
  selectedText!: string;

  @ApiProperty({ example: "다듬어줘" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(REQUEST_MAX)
  instruction!: string;
}

export class AiReviewDto {
  @ApiProperty({ description: "지금 편집기 전체 내용(HTML)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXT_MAX)
  html!: string;
}
