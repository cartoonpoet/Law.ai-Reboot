/**
 * API 호출 실패 — HTTP 상태코드를 담아 전역 오류 처리(토스트 / 오류 페이지)가 분기할 수 있게 한다.
 * status 0 = 네트워크 실패(서버에 닿지 못함). Error 를 상속해 기존 message 소비 코드는 그대로 동작한다.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const NETWORK_ERROR_STATUS = 0;
export const NETWORK_ERROR_MESSAGE = "서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요";

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const getErrorStatus = (error: unknown): number | null => (isApiError(error) ? error.status : null);

export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

// 실패 응답 → ApiError. NestJS 검증 오류는 message 가 배열이라 이어 붙인다.
export const toResponseError = async (res: Response): Promise<ApiError> => {
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
  return new ApiError(res.status, message || `요청 실패 (${res.status})`);
};
