import { useNavigate } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { AuthLayout } from "./AuthLayout";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <button
        type="button"
        onClick={() => navigate("/login")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: 700,
          color: T.muted,
          fontFamily: "Pretendard",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Icon name="chevronLeft" size="sm" style={{ width: 13, height: 13 }} />
        로그인으로
      </button>
      <h1
        style={{
          margin: "12px 0 0",
          fontSize: 21,
          fontWeight: 800,
          color: T.heading,
          letterSpacing: "-0.025em",
        }}
      >
        비밀번호 찾기
      </h1>
      <p style={{ margin: "7px 0 20px", fontSize: 13, color: T.muted }}>
        가입한 이메일로 재설정 링크를 보내드립니다.
      </p>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
