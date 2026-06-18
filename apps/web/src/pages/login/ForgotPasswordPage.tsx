import { useNavigate } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import { AuthCard } from "./AuthCard";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import * as css from "./auth.css";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  return (
    <AuthCard>
      <button type="button" onClick={() => navigate("/login")} className={css.backBtn}>
        <Icon name="chevronLeft" size="sm" />
        로그인으로
      </button>
      <h1 className={css.titleAfterBack}>비밀번호 찾기</h1>
      <p className={css.subtitle}>가입한 이메일로 재설정 링크를 보내드립니다.</p>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
