import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsIn, IsString, MaxLength, ValidateNested } from "class-validator";

export class AssistantChatMessageDto {
  @ApiProperty({ enum: ["user", "assistant"] })
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @ApiProperty({ example: "오늘 내가 처리할 일 정리해줘" })
  @IsString()
  @MaxLength(2000)
  content!: string;
}

// AI 비서 대화. viewerId·테넌트는 JWT 에서 주입(바디로 받지 않음).
export class AssistantChatDto {
  @ApiProperty({ type: [AssistantChatMessageDto], description: "최근 대화(마지막은 사용자 메시지)" })
  @ValidateNested({ each: true })
  @Type(() => AssistantChatMessageDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  messages!: AssistantChatMessageDto[];

  @ApiProperty({ example: "대시보드", description: "사용자가 보고 있는 화면 이름" })
  @IsString()
  @MaxLength(50)
  screen!: string;
}
