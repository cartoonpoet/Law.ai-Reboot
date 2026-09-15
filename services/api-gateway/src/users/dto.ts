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

  @ApiPropertyOptional({ description: "결재 알림(내 차례·반려·완료·참조) 받기" })
  @IsOptional()
  @IsBoolean()
  notifyApproval?: boolean;

  @ApiPropertyOptional({ description: "코멘트 알림(나를 언급) 받기 — 끄면 이메일도 보내지 않는다" })
  @IsOptional()
  @IsBoolean()
  notifyComment?: boolean;
}
