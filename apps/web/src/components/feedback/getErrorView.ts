import type { IconName } from "@lawkit/ui";
import { NETWORK_ERROR_STATUS, getErrorStatus, isApiError } from "../../api/apiError";

export type ErrorKindTypes = "forbidden" | "notFound" | "network" | "server";

export interface ErrorView {
  kind: ErrorKindTypes;
  icon: IconName;
  title: string;
  description: string;
  // 서버가 준 사유(ApiError message). 렌더 크래시 등 내부 메시지는 노출하지 않는다.
  detail: string | null;
  // 다시 시도해 결과가 달라질 수 있는 오류인지(403·404 는 같은 결과라 제외)
  canRetry: boolean;
}

/** 오류 → 오류 페이지 표시 뷰모델. */
export const getErrorView = (error: unknown): ErrorView => {
  const status = getErrorStatus(error);
  const detail = isApiError(error) && error.message ? error.message : null;

  if (status === 403) {
    return {
      kind: "forbidden",
      icon: "lock",
      title: "접근 권한이 없어요",
      description: "이 화면을 볼 수 있는 권한이 없습니다. 필요하면 관리자에게 권한을 요청하세요.",
      detail,
      canRetry: false,
    };
  }
  if (status === 404) {
    return {
      kind: "notFound",
      icon: "fileFind",
      title: "페이지를 찾을 수 없어요",
      description: "주소가 잘못되었거나 삭제·이동된 항목입니다.",
      detail,
      canRetry: false,
    };
  }
  if (status === NETWORK_ERROR_STATUS) {
    return {
      kind: "network",
      icon: "cloud",
      title: "서버에 연결할 수 없어요",
      description: "네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
      detail: null,
      canRetry: true,
    };
  }
  return {
    kind: "server",
    icon: "alertTriangle",
    title: "일시적인 오류가 발생했어요",
    description: "잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 알려 주세요.",
    detail,
    canRetry: true,
  };
};
