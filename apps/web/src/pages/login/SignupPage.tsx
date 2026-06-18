import { useNavigate } from "react-router-dom";
import { AuthCard } from "./AuthCard";
import { SignupForm } from "./SignupForm";
import * as css from "./auth.css";

export function SignupPage() {
  const navigate = useNavigate();

  const loginLink = (
    <div className={css.belowRow}>
      이미 계정이 있으신가요?{" "}
      <button type="button" onClick={() => navigate("/login")} className={css.linkBtn}>
        로그인
      </button>
    </div>
  );

  return (
    <AuthCard wide belowCard={loginLink}>
      <h1 className={css.title}>회원가입</h1>
      <p className={css.subtitle}>
        휴맥스 법무시스템 계정을 신청합니다. 관리자 승인 후 이용할 수 있습니다.
      </p>
      <SignupForm />
    </AuthCard>
  );
}
