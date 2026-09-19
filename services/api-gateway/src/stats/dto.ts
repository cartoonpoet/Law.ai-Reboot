import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import type { CycleTimeTargetTypes } from "@lawai/contracts";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_MAX = 64;

/** GET /stats/cycle-time 쿼리. 잘못된 값은 조용히 넘기지 않고 400 으로 돌려준다. */
export class CycleTimeQueryDto {
  @ApiPropertyOptional({ enum: ["contract", "advice"], default: "contract" })
  @IsOptional()
  @IsIn(["contract", "advice"], { message: "통계 대상은 contract 또는 advice 여야 합니다" })
  targetType?: CycleTimeTargetTypes;

  @ApiPropertyOptional({ example: "2026-04-01" })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: "시작일은 YYYY-MM-DD 형식이어야 합니다" })
  from?: string;

  @ApiPropertyOptional({ example: "2026-09-19" })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: "종료일은 YYYY-MM-DD 형식이어야 합니다" })
  to?: string;

  @ApiPropertyOptional({ description: "담당자 한 명만 볼 때" })
  @IsOptional()
  @IsString()
  @MaxLength(ID_MAX)
  ownerId?: string;
}
