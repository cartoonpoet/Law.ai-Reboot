import { HttpException, HttpStatus } from "@nestjs/common";
import { catchError, throwError, type MonoTypeOperatorFunction } from "rxjs";

interface RpcError {
  status?: number;
  message?: string;
}

// TCP 서비스가 던진 RpcException 페이로드를 HTTP 예외로 변환
export function rpcToHttp<T>(): MonoTypeOperatorFunction<T> {
  return catchError((err: RpcError) => {
    const status = err?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message = err?.message ?? "서비스 오류";
    return throwError(() => new HttpException(message, status));
  });
}
