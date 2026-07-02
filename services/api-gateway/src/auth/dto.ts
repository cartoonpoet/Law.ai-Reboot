import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from "class-validator";
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
