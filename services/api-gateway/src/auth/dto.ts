import {
  IsEmail,
  IsString,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
} from "class-validator";

// 비밀번호 규칙 — 영문·숫자·특수문자를 모두 포함한 8자 이상(웹 utils/passwordRule 과 같음).
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
import { ApiProperty } from "@nestjs/swagger";

export class SignupDto {
  @ApiProperty({ example: "user@humaxit.com", format: "email" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "홍길동", minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: "P@ssw0rd!", minLength: 8, maxLength: 100 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: "user@humaxit.com", format: "email" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "P@ssw0rd!", minLength: 8, maxLength: 100 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}

export class PasswordResetRequestDto {
  @ApiProperty({
    example: "user@humaxit.com",
    format: "email",
    description: "가입한 회사 이메일. 존재 여부와 무관하게 200을 반환한다.",
  })
  @IsEmail()
  email!: string;
}

export class RefreshDto {
  @ApiProperty({ description: "발급받은 refresh token", example: "eyJhbGci..." })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class PasswordResetConfirmDto {
  @ApiProperty({
    description: "재설정 링크에 포함된 토큰",
    example: "a1b2c3...",
  })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ example: "N3wP@ssw0rd!", minLength: 8, maxLength: 100 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;
}

// 로그인한 사용자의 비밀번호 변경. userId 는 JWT sub.
export class ChangePasswordDto {
  @ApiProperty({ description: "현재 비밀번호" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  currentPassword!: string;

  @ApiProperty({ example: "N3wP@ssw0rd!", description: "영문·숫자·특수문자 포함 8자 이상" })
  @IsString()
  @MaxLength(100)
  @Matches(PASSWORD_RULE, { message: "영문·숫자·특수문자 포함 8자 이상이어야 합니다" })
  newPassword!: string;
}
