import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// @lawai/contracts 의 CreateCompanyRequest 를 미러링한다(class-validator 데코레이터 추가용).
// contracts 쪽에 필수 필드가 추가되면 이 DTO도 함께 갱신할 것.
export class CreateCompanyDto {
  @ApiProperty({ enum: ["company", "individual"], example: "company" })
  @IsIn(["company", "individual"])
  type!: "company" | "individual";

  @ApiProperty({ example: "삼성전자(주)" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: "124-81-00998", description: "미지정 시 임시번호 자동 생성" })
  @IsOptional() @IsString() @MaxLength(40)
  bizNo?: string;

  @ApiPropertyOptional({ example: "한종희" })
  @IsOptional() @IsString() @MaxLength(50)
  ceo?: string;

  @ApiPropertyOptional({ example: "02-2255-0114" })
  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  addressDetail?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  managerName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  managerPhone?: string;

  @ApiPropertyOptional({ example: "name@company.com" })
  @IsOptional() @IsEmail() @MaxLength(120)
  managerEmail?: string;
}
