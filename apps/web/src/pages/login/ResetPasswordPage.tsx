import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { AuthLayout } from "./AuthLayout";
import { ResetPasswordForm } from "./ResetPasswordForm";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  return (
    <AuthLayout>
      <h1
        style={{
          margin: 0,
          fontSize: 21,
          fontWeight: 800,
          color: T.heading,
          letterSpacing: "-0.025em",
        }}
      >
        새 비밀번호 설정
      </h1>
      <p style={{ margin: "7px 0 20px", fontSize: 13, color: T.muted }}>
        {token
          ? "사용할 새 비밀번호를 입력하세요."
          : "유효하지 않은 접근입니다."}
      </p>

      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
            재설정 링크가 올바르지 않거나 만료되었습니다. 비밀번호 찾기를 다시
            시도해 주세요.
          </p>
          <div style={{ display: "grid" }}>
            <Button
              size="large"
              variant="outline"
              color="secondary"
              onClick={() => navigate("/forgot-password")}
            >
              비밀번호 찾기로 이동
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
