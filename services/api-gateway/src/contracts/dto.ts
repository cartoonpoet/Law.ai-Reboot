import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  ApproverSnapshot,
  CcRecipientInput,
  ContractDetailsV1,
  ContractStatus,
  CounterpartyInput,
  FileInput,
  SecurityLevel,
  ReviewType,
} from "@lawai/contracts";

const CONTRACT_STATUSES = [
  "draft",
  "unassigned",
  "assigning",
  "legalReview",
  "requesterReview",
  "reviewDone",
  "signing",
  "signed",
  "fulfilling",
  "closed",
] as const;

// @lawai/contracts 의 CreateContractRequest 미러(createdById 제외 — gateway 가 JWT 에서 주입).
// details/counterparties 는 schemaVersion 이 소유하므로 통과(pass-through)시킨다.
export class CreateContractDto {
  @ApiProperty({ example: "2026년 SaaS 이용계약" })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: ["top", "secure", "normal"] })
  @IsIn(["top", "secure", "normal"])
  securityLevel!: SecurityLevel;

  @ApiProperty({ enum: ["normal", "std"] })
  @IsIn(["normal", "std"])
  reviewType!: ReviewType;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  party?: string | null;

  @ApiPropertyOptional({ description: "ContractCategory id(FK)" })
  @IsOptional() @IsString() @MaxLength(64)
  categoryId?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(64)
  requesterId?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(64)
  ownerId?: string | null;

  @ApiPropertyOptional({ description: "ISO 8601 또는 빈 문자열" })
  @IsOptional() @IsString() @MaxLength(40)
  periodStart?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  periodEnd?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  dueDate?: string | null;

  @ApiProperty({ example: 1 })
  @IsInt()
  schemaVersion!: number;

  @ApiProperty({ description: "schemaVersion 별 폼 상세(JSONB)" })
  @IsObject()
  details!: ContractDetailsV1;

  @ApiProperty({ description: "상대계약자 + 체결 스냅샷", isArray: true })
  @IsArray()
  counterparties!: CounterpartyInput[];

  @ApiProperty({ description: "결재선 단계(배열 순서 = 결재 순서)", isArray: true })
  @IsArray()
  approvers!: ApproverSnapshot[];

  @ApiProperty({ description: "첨부 파일 메타데이터(계약서/첨부/참고)", isArray: true })
  @IsArray()
  files!: FileInput[];

  @ApiProperty({ description: "참조수신자(cc): ccType+isSecret", isArray: true })
  @IsArray()
  references!: CcRecipientInput[];
}

// 필드 수정(부분). 관계는 변경하지 않는다.
export class UpdateContractDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: ["top", "secure", "normal"] })
  @IsOptional() @IsIn(["top", "secure", "normal"])
  securityLevel?: SecurityLevel;

  @ApiPropertyOptional({ enum: ["normal", "std"] })
  @IsOptional() @IsIn(["normal", "std"])
  reviewType?: ReviewType;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  party?: string | null;

  @ApiPropertyOptional({ description: "ContractCategory id(FK)" })
  @IsOptional() @IsString() @MaxLength(64)
  categoryId?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64)
  requesterId?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64)
  ownerId?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40)
  periodStart?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40)
  periodEnd?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40)
  dueDate?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  schemaVersion?: number;

  @ApiPropertyOptional({ description: "schemaVersion 별 폼 상세(JSONB)" })
  @IsOptional() @IsObject()
  details?: ContractDetailsV1;

  @ApiPropertyOptional({ description: "상대계약자(제공 시 전체 교체)", isArray: true })
  @IsOptional() @IsArray()
  counterparties?: CounterpartyInput[];

  @ApiPropertyOptional({ description: "결재선 단계(제공 시 전체 교체)", isArray: true })
  @IsOptional() @IsArray()
  approvers?: ApproverSnapshot[];

  @ApiPropertyOptional({ description: "첨부 파일(제공 시 전체 교체)", isArray: true })
  @IsOptional() @IsArray()
  files?: FileInput[];

  @ApiPropertyOptional({ description: "참조수신자(제공 시 전체 교체)", isArray: true })
  @IsOptional() @IsArray()
  references?: CcRecipientInput[];
}

export class UpdateContractStatusDto {
  @ApiProperty({ enum: CONTRACT_STATUSES })
  @IsIn(CONTRACT_STATUSES)
  status!: ContractStatus;

  @ApiPropertyOptional({ description: "배정 시 법무 담당자" })
  @IsOptional() @IsString() @MaxLength(64)
  ownerId?: string | null;
}

// 코멘트 생성. contractId 는 @Param, viewerId(=작성자)는 JWT sub 라 body+mentions 만 받는다.
export class CreateCommentDto {
  @ApiProperty({ description: "코멘트 본문", example: "검토 의견입니다." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;

  @ApiPropertyOptional({ description: "멘션 대상 userId 배열(계약 관련자 한정)", isArray: true })
  @IsOptional() @IsArray() @IsString({ each: true })
  mentions?: string[];

  @ApiPropertyOptional({ description: "선업로드된 첨부 파일 id 배열(코멘트당 ≤5)", isArray: true })
  @IsOptional() @IsArray() @IsString({ each: true })
  attachmentIds?: string[];
}

// 코멘트 수정. body 전체 교체 + mentions 전체 교체(작성자 본인만).
export class UpdateCommentDto {
  @ApiProperty({ description: "코멘트 본문", example: "수정한 의견입니다." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;

  @ApiPropertyOptional({ description: "멘션 대상 userId 배열(계약 관련자 한정)", isArray: true })
  @IsOptional() @IsArray() @IsString({ each: true })
  mentions?: string[];
}
