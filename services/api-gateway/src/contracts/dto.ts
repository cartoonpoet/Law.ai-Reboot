import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  ApproverSnapshot,
  ContractDetailsV1,
  CounterpartyInput,
  SecurityLevel,
  ReviewType,
} from "@lawai/contracts";

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

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  catMajor?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  catMinor?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  catSub?: string | null;

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
}
