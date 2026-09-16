import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

const SUBJECT_MAX = 120;
const BODY_MAX = 4000;

export class CreateSupportThreadDto {
  @ApiProperty({ description: "문의 제목" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SUBJECT_MAX)
  subject!: string;

  @ApiProperty({ description: "문의 내용" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(BODY_MAX)
  body!: string;

  @ApiPropertyOptional({ description: "오류 문의일 때 화면이 담아 보내는 정보(화면 주소·오류 메시지 등)" })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class AddSupportMessageDto {
  @ApiProperty({ description: "이어서 보낼 내용" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(BODY_MAX)
  body!: string;
}

export class ReplySupportDto {
  @ApiProperty({ description: "답변 내용" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(BODY_MAX)
  body!: string;

  @ApiPropertyOptional({ description: "답변하면서 문의를 종료할지" })
  @IsOptional()
  @IsBoolean()
  close?: boolean;
}
