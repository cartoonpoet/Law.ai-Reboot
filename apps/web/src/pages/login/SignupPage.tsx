import { useNavigate } from "react-router-dom";
import { T } from "../../design/tokens";
import { AuthLayout } from "./AuthLayout";
import { SignupForm } from "./SignupForm";

export function SignupPage() {
  const navigate = useNavigate();

  const loginLink = (
    <div
      style={{
        marginTop: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 12.5,
        color: T.muted,
      }}
    >
      이미 계정이 있으신가요?{" "}
      <button
        type="button"
        onClick={() => navigate("/login")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: 700,
          color: T.primary,
          fontFamily: "Pretendard",
          padding: 0,
        }}
      >
        로그인
      </button>
    </div>
  );

  return (
    <AuthLayout cardMaxWidth={440} belowCard={loginLink}>
      <h1
        style={{
          margin: "0 0 6px",
          fontSize: 21,
          fontWeight: 800,
          color: T.heading,
          letterSpacing: "-0.025em",
          lineHeight: 1.3,
        }}
      >
        회원가입
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: T.muted }}>
        휴맥스 법무시스템 계정을 신청합니다. 관리자 승인 후 이용할 수 있습니다.
      </p>
      <SignupForm />
    </AuthLayout>
  );
}
