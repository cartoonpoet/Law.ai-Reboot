import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import { NETWORK_ERROR_STATUS, getErrorMessage, getErrorStatus } from "../api/apiError";
import { showToast } from "./toast/toastStore";

/**
 * 쿼리·뮤테이션 meta 로 오류 처리 방식을 지정한다.
 *  - "toast"(기본): 우측 상단 토스트
 *  - "page": 페이지 주 데이터 — 데이터가 아직 없을 때 실패하면 에러 경계로 던져 본문을 ErrorPage 로(토스트 없음).
 *            이미 데이터가 있는 상태의 재조회 실패는 화면을 유지하고 토스트만 띄운다.
 *  - "silent": 호출부가 이미 인라인으로 보여주는 곳(폼 오류 등) — 토스트 없음
 * errorTitle 로 토스트 제목을 바꿀 수 있다(예: "결재를 처리하지 못했어요").
 */
export type ErrorModeTypes = "toast" | "page" | "silent";

export interface AppQueryMeta extends Record<string, unknown> {
  errorMode?: ErrorModeTypes;
  errorTitle?: string;
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: AppQueryMeta;
    mutationMeta: AppQueryMeta;
  }
}

export const QUERY_ERROR_TITLE = "데이터를 불러오지 못했어요";
export const MUTATION_ERROR_TITLE = "요청을 처리하지 못했어요";
const FALLBACK_MESSAGE = "알 수 없는 오류가 발생했습니다";
const MAX_RETRIES = 1;

// 세션 만료(401)는 api client 인터셉터가 로그인으로 보내므로 따로 알리지 않는다.
const isSessionExpired = (error: unknown) => getErrorStatus(error) === 401;

// 쿼리 제네릭(데이터·에러 타입)과 무관하게 meta·data 존재 여부만 본다.
type AnyQuery = { meta: Query["meta"]; state: { data: unknown } };

// 페이지 모드라도 이미 데이터가 있으면(재조회 실패) 화면을 지우지 않고 토스트로 알린다.
export const getQueryErrorMode = (query: AnyQuery): ErrorModeTypes => {
  const mode = query.meta?.errorMode ?? "toast";
  if (mode === "page" && query.state.data !== undefined) return "toast";
  return mode;
};

export const shouldThrowQueryError = (error: unknown, query: AnyQuery) =>
  getQueryErrorMode(query) === "page" && !isSessionExpired(error);

// 4xx 는 다시 해도 같은 결과라 재시도하지 않고, 네트워크·5xx·알 수 없는 오류만 1회 재시도한다.
export const shouldRetry = (failureCount: number, error: unknown) => {
  const status = getErrorStatus(error);
  const isRetriable = status === null || status === NETWORK_ERROR_STATUS || status >= 500;
  return isRetriable && failureCount < MAX_RETRIES;
};

const toastError = (error: unknown, mode: ErrorModeTypes, title: string) => {
  if (mode !== "toast" || isSessionExpired(error)) return;
  showToast({ intent: "error", title, description: getErrorMessage(error, FALLBACK_MESSAGE) });
};

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => toastError(error, getQueryErrorMode(query), query.meta?.errorTitle ?? QUERY_ERROR_TITLE),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) =>
        toastError(error, mutation.meta?.errorMode ?? "toast", mutation.meta?.errorTitle ?? MUTATION_ERROR_TITLE),
    }),
    defaultOptions: {
      queries: { retry: shouldRetry, throwOnError: shouldThrowQueryError },
      mutations: { retry: false },
    },
  });

/**
 * 앱 전역 단일 QueryClient.
 *
 * main.tsx의 QueryClientProvider와, tiptap suggestion 드롭다운처럼 React 트리
 * 밖에서 createRoot로 마운트되는 포털 컴포넌트가 동일 캐시를 공유하도록 모듈로 분리한다.
 */
export const queryClient = createQueryClient();
