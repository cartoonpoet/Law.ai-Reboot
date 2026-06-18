import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@lawkit/ui";
import { AuthCard } from "./AuthCard";
import { ResetPasswordForm } from "./ResetPasswordForm";
import * as css from "./auth.css";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  return (
    <AuthCard>
      <h1 className={css.title}>새 비밀번호 설정</h1>
      <p className={css.subtitle}>
        {token ? "사용할 새 비밀번호를 입력하세요." : "유효하지 않은 접근입니다."}
      </p>

      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className={css.fallbackCol}>
          <p className={css.fallbackText}>
            재설정 링크가 올바르지 않거나 만료되었습니다. 비밀번호 찾기를 다시 시도해 주세요.
          </p>
          <div className={css.fallbackBtn}>
            <Button size="large" variant="outline" color="secondary" onClick={() => navigate("/forgot-password")}>
              비밀번호 찾기로 이동
            </Button>
          </div>
        </div>
      )}
    </AuthCard>
  );
}
