import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

// 내 정보 수정 — 바꿀 값만 보낸다. 이메일·부서·역할은 받지 않는다.
export class UpdateMyProfileDto {
  @ApiPropertyOptional({ example: "손준호", minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: "이메일로도 알림 받기" })
  @IsOptional()
  @IsBoolean()
  emailNotify?: boolean;
}
