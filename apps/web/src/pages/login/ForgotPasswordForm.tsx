import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, Input, InputGroup, Alert } from "@lawkit/ui";
import { T } from "../../design/tokens";

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Alert.type "success"는 @lawkit/ui에 없음 → "info"로 대체.
            실제 API 연동 시 useActionState로 승격 예정. */}
        <Alert type="info" title="메일을 전송했습니다">
          {email || "입력하신 이메일"} 주소로 비밀번호 재설정 링크를 보냈습니다.
          메일함을 확인해 주세요.
        </Alert>
        <div style={{ display: "grid" }}>
          <Button
            size="large"
            variant="outline"
            color="secondary"
            onClick={() => navigate("/login")}
          >
            로그인으로 돌아가기
          </Button>
        </div>
        <div style={{ textAlign: "center", fontSize: 12.5, color: T.muted }}>
          메일이 오지 않았나요?{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
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
            다시 전송
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // 백엔드 재설정 엔드포인트 부재 → 프런트 stub. 성공 화면으로 전환만.
        // 실제 API 연동 시 useActionState로 승격.
        setSent(true);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <InputGroup label="이메일" helperText="회사 이메일(@humaxit.com)을 입력하세요">
        <Input
          inputSize="large"
          type="email"
          placeholder="email@humaxit.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={
            <Icon
              name="mail"
              size="sm"
              style={{ width: 16, height: 16, color: T.faint }}
            />
          }
        />
      </InputGroup>
      <div style={{ display: "grid" }}>
        <Button
          size="large"
          type="submit"
          iconLeft={
            <Icon name="sendSolid" size="sm" style={{ width: 15, height: 15 }} />
          }
        >
          재설정 링크 전송
        </Button>
      </div>
    </form>
  );
}
