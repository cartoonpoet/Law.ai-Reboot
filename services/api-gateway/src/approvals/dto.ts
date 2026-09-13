import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

// 승인/반려 요청 body. 대상 스텝은 서버가 현재 차례로 파생하므로 결정·의견만 받는다.
export class DecideApprovalDto {
  @IsIn(["approve", "reject"])
  decision!: "approve" | "reject";

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
