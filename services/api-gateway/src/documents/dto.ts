import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsString, MaxLength } from "class-validator";

const FILE_NAME_MAX = 100;
const BASE64_MAX = 30_000_000; // 20MB 원본 기준 base64 팽창(~1.37배) 여유
const TEXT_MAX = 20_000;
const REQUEST_MAX = 500;
// 초안 검토(AiReviewDto.html)는 편집기 "전체" HTML을 담는다 — 선택 문장 하나(TEXT_MAX)와는
// 성격이 다르다. 표준계약서는 8~10쪽만 넘어도 TEXT_MAX(20,000자)를 넘기므로, 순수 텍스트
// 기준 MAX_CONTRACT_TEXT_LENGTH(user-service, 60,000자)보다 HTML 마크업 오버헤드를 감안해
// 넉넉히 잡는다. user-service의 aiReview도 이보다 짧은 길이로 한 번 더 잘라 AI에 보낸다.
const REVIEW_HTML_MAX = 150_000;

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
  @MaxLength(REVIEW_HTML_MAX)
  html!: string;
}
