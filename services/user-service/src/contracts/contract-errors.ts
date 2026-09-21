// 계약 서비스 공통 오류 변환(순수).
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";

export const STALE_CONTRACT_MESSAGE = "이미 처리되었거나 상태가 변경된 계약입니다";

// CAS(where 에 상태 조건을 다시 넣은 update)가 실패해 대상 행이 없을 때 Prisma 는 P2025 를 던진다.
// 그 경우 409 RpcException 을 던지고, 그 외 오류는 원본 그대로 다시 던진다. 항상 던지므로 never.
export function raiseStaleConflict(error: unknown, message: string = STALE_CONTRACT_MESSAGE): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    throw new RpcException({ status: 409, message });
  }
  throw error;
}
