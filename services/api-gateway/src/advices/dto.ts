import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { AdviceDetails, AdviceMessageKindTypes, AdviceRegionTypes, ApproverSnapshot, SecurityLevel } from "@lawai/contracts";

const TITLE_MAX = 200;
const RICH_TEXT_MAX = 50_000;
const TEXT_MAX = 4000;
const ID_MAX = 64;
const LIST_MAX = 30;
const APPROVER_MAX = 20;

// @lawai/contracts 의 CreateAdviceRequest 미러(viewerId·tenantContext 는 게이트웨이가 JWT 에서 넣는다).
export class CreateAdviceDto {
  @ApiProperty({ example: "해외 대리점 계약 준거법 문의" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX)
  title!: string;

  @ApiProperty({ description: "자문분류(내용)", isArray: true, example: ["계약해석"] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LIST_MAX)
  @IsString({ each: true })
  categories!: string[];

  @ApiProperty({ enum: ["top", "secure", "normal"] })
  @IsIn(["top", "secure", "normal"])
  securityLevel!: SecurityLevel;

  @ApiProperty({ description: "자문요청자 사용자 id" })
  @IsString()
  @MaxLength(ID_MAX)
  requesterId!: string;

  @ApiPropertyOptional({ description: "업무담당자 사용자 id — 정하면 바로 법무 검토로 시작" })
  @IsOptional()
  @IsString()
  @MaxLength(ID_MAX)
  ownerId!: string | null;

  @ApiProperty({ enum: ["domestic", "overseas", "both"] })
  @IsIn(["domestic", "overseas", "both"])
  region!: AdviceRegionTypes;

  @ApiProperty({ isArray: true, example: ["VN"] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(LIST_MAX)
  @IsString({ each: true })
  countries!: string[];

  @ApiProperty({ description: "사안의 배경(에디터 HTML)" })
  @IsString()
  @MaxLength(RICH_TEXT_MAX)
  background!: string;

  @ApiProperty({ description: "질의의 요지(에디터 HTML)" })
  @IsString()
  @MaxLength(RICH_TEXT_MAX)
  question!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  etcRequest!: string | null;

  @ApiPropertyOptional({ example: "2026-09-18" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  dueDate!: string | null;

  @ApiProperty({ description: "참조수신자·관련 프로젝트·상대방" })
  @IsObject()
  details!: AdviceDetails;

  @ApiProperty({ description: "요청 결재선(기안자 포함, 배열 순서 = 결재 순서). 결재·합의 단계가 없으면 결재 없이 접수", isArray: true })
  @IsArray()
  @ArrayMaxSize(APPROVER_MAX)
  approvers!: ApproverSnapshot[];
}

export class AssignAdviceDto {
  @ApiProperty({ description: "담당자 사용자 id(법무팀·외부 변호사)" })
  @IsString()
  @MaxLength(ID_MAX)
  ownerId!: string;
}

export class AddAdviceMessageDto {
  @ApiProperty({ enum: ["followup", "reply", "answer"] })
  @IsIn(["followup", "reply", "answer"])
  kind!: AdviceMessageKindTypes;

  @ApiProperty({ description: "내용(에디터 HTML)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(RICH_TEXT_MAX)
  body!: string;

  @ApiPropertyOptional({ description: "회신(answer) 결재선. 결재·합의 단계가 있으면 회신 결재를 거친다", isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(APPROVER_MAX)
  approvers?: ApproverSnapshot[];
}

export class ResubmitAdviceRequestApprovalDto {
  @ApiProperty({ description: "고친 요청 결재선", isArray: true })
  @IsArray()
  @ArrayMaxSize(APPROVER_MAX)
  approvers!: ApproverSnapshot[];
}
