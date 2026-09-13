import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

// 내 AI 연동 자격증명 저장/갱신. viewerId(=본인)는 JWT 에서 주입.
export class SaveMyAiCredentialDto {
  @ApiProperty({ example: "openai" })
  @IsString()
  provider!: string;

  @ApiProperty({ example: "gpt-4o-mini" })
  @IsString()
  model!: string;

  @ApiProperty({ description: "프로바이더 API 키(저장 시 암호화)" })
  @IsString()
  @MinLength(10)
  apiKey!: string;
}

// AI 분석 재시도 대상. targetType/targetId/kind 로 기존 분석 행을 식별한다.
export class RetryAiAnalysisDto {
  @ApiProperty({ example: "contract" })
  @IsString()
  targetType!: string;

  @ApiProperty({ example: "c1a2b3c4-..." })
  @IsString()
  targetId!: string;

  @ApiProperty({ example: "riskReview" })
  @IsString()
  kind!: string;
}
