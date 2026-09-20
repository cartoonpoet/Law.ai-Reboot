import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min, MaxLength } from "class-validator";
import type { TemplateCategoryTypes } from "@lawai/contracts";

const NAME_MAX = 100;
const CATEGORIES: TemplateCategoryTypes[] = ["nda", "service", "supply", "entrust", "license", "etc"];

export class CreateTemplateDto {
  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  categoryId!: TemplateCategoryTypes;

  @ApiProperty({ example: "비밀유지계약서(NDA) 표준" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX)
  name!: string;

  @ApiProperty({ description: "Tiptap JSON(에디터 정본)" })
  @IsObject()
  content!: Record<string, unknown>;
}

export class CreateTemplateVersionDto {
  @ApiProperty({ description: "Tiptap JSON(에디터 정본)" })
  @IsObject()
  content!: Record<string, unknown>;

  @ApiPropertyOptional({ description: "조항 수(있으면)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  clauseCount!: number | null;
}

export class RevertTemplateVersionDto {
  @ApiProperty({ description: "되돌릴 버전 번호" })
  @IsInt()
  @Min(1)
  toVersionNo!: number;
}
