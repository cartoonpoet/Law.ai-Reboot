import { useState, useActionState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, Input, InputGroup, Checkbox } from "@lawkit/ui";
import { login } from "../../api/auth";
import { setTokens } from "../../api/tokens";
import { T } from "../../design/tokens";

export function EmailLoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [keep, setKeep] = useState(true);

  const [error, submitAction, isPending] = useActionState<string | null, FormData>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_prev: string | null, _formData: FormData) => {
      try {
        const data = await login({ email, password });
        setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        navigate("/");
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "로그인에 실패했습니다";
      }
    },
    null,
  );

  return (
    <form
      action={submitAction}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <InputGroup label="이메일">
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
              style={{ width: 15, height: 15, color: T.faint }}
            />
          }
        />
      </InputGroup>
      <InputGroup label="비밀번호">
        <Input
          inputSize="large"
          type={showPw ? "text" : "password"}
          placeholder="비밀번호 입력"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={
            <Icon
              name="lock"
              size="sm"
              style={{ width: 15, height: 15, color: T.faint }}
            />
          }
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "inline-flex",
              }}
            >
              <Icon
                name={showPw ? "eyeOff" : "eye"}
                size="sm"
                style={{ width: 15, height: 15, color: T.faint }}
              />
            </button>
          }
        />
      </InputGroup>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Checkbox
          size="small"
          label="자동 로그인"
          checked={keep}
          onCheckedChange={setKeep}
        />
        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
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
          비밀번호 찾기
        </button>
      </div>
      <div style={{ display: "grid", marginTop: 2 }}>
        <Button
          size="large"
          type="submit"
          disabled={isPending}
          iconRight={
            <Icon
              name="arrowRight"
              size="sm"
              style={{ width: 15, height: 15 }}
            />
          }
        >
          로그인
        </Button>
      </div>
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: T.danger, textAlign: "center" }}>
          {error}
        </p>
      )}
    </form>
  );
}
