import { useNavigate } from "react-router-dom";
import { Button, EmptyState, Icon } from "@lawkit/ui";
import { getErrorView } from "./getErrorView";
import * as css from "./errorPage.css";

interface ErrorPageProps {
  error: unknown;
  // 다시 시도(에러 경계 리셋). 없으면 버튼을 숨긴다.
  onRetry: (() => void) | null;
}

/** 오류 페이지 — 권한 없음 / 찾을 수 없음 / 연결 끊김 / 일시적 오류를 lawkit EmptyState 로 안내한다. */
export const ErrorPage = ({ error, onRetry }: ErrorPageProps) => {
  const navigate = useNavigate();
  const view = getErrorView(error);
  const isRetryable = view.canRetry && onRetry !== null;

  return (
    <div className={css.wrap} role="alert">
      <EmptyState
        icon={<Icon name={view.icon} className={css.icon} />}
        title={view.title}
        description={
          <>
            {view.description}
            {view.detail && <span className={css.detail}>{view.detail}</span>}
          </>
        }
        action={
          <div className={css.actions}>
            {isRetryable ? (
              <>
                <Button onClick={onRetry}>다시 시도</Button>
                <Button variant="outline" color="secondary" onClick={() => navigate("/")}>
                  홈으로
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate("/")}>홈으로</Button>
                <Button variant="outline" color="secondary" onClick={() => navigate(-1)}>
                  이전 화면
                </Button>
              </>
            )}
          </div>
        }
      />
    </div>
  );
};
