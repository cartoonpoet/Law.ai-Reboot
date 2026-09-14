import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorPage } from "./ErrorPage";

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

/**
 * 라우트 본문 에러 경계 — 렌더 크래시와 errorMode:"page" 쿼리 실패(throwOnError)를 잡아
 * 본문 자리에 ErrorPage 를 보여준다(주소·사이드바·상단바 유지).
 * - 다른 경로로 이동하면 resetKeys 로 자동 초기화
 * - "다시 시도"는 경계와 함께 실패한 쿼리(QueryErrorResetBoundary)도 리셋해 재조회
 */
export const RouteErrorBoundary = ({ children }: RouteErrorBoundaryProps) => {
  const { pathname } = useLocation();

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          resetKeys={[pathname]}
          fallbackRender={({ error, resetErrorBoundary }) => <ErrorPage error={error} onRetry={resetErrorBoundary} />}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
