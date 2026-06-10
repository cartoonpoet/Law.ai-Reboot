import { useState, useEffect, useActionState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, Input, InputGroup } from "@lawkit/ui";
import { requestOtp, verifyOtp } from "../../api/auth";
import { T } from "../../design/tokens";

const OTP_TTL = 180;

function formatRemaining(seconds: number) {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function OtpLoginForm() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!sent || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [sent, remaining]);

  const phoneTooShort = phone.replace(/\D/g, "").length < 10;

  async function handleSend() {
    setSendError(null);
    setSending(true);
    try {
      await requestOtp({ phone });
      setSent(true);
      setRemaining(OTP_TTL);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "인증번호 전송에 실패했습니다");
    } finally {
      setSending(false);
    }
  }

  const [error, verifyAction, isPending] = useActionState<string | null, FormData>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_prev: string | null, _formData: FormData) => {
      try {
        const data = await verifyOtp({ phone, code });
        localStorage.setItem("accessToken", data.tokens.accessToken);
        localStorage.setItem("refreshToken", data.tokens.refreshToken);
        navigate("/");
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "인증에 실패했습니다";
      }
    },
    null,
  );

  const codeHelper = !sent
    ? "휴대폰으로 받은 6자리 번호를 입력하세요"
    : remaining > 0
      ? `전송되었습니다 · ${formatRemaining(remaining)} 남음`
      : "인증 시간이 만료되었습니다. 재전송하세요.";

  return (
    <form
      action={verifyAction}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <InputGroup label="휴대폰 번호">
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input
              inputSize="large"
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={
                <Icon
                  name="messageSquare"
                  size="sm"
                  style={{ width: 15, height: 15, color: T.faint }}
                />
              }
            />
          </div>
          <Button
            type="button"
            variant="outline"
            color="secondary"
            size="large"
            disabled={sending || phoneTooShort}
            onClick={handleSend}
          >
            {sent ? "재전송" : "인증번호 전송"}
          </Button>
        </div>
      </InputGroup>
      {sendError && (
        <p
          role="alert"
          style={{ margin: 0, fontSize: 12.5, color: T.danger }}
        >
          {sendError}
        </p>
      )}

      <InputGroup label="인증번호" helperText={codeHelper}>
        <Input
          inputSize="large"
          type="text"
          inputMode="numeric"
          placeholder="6자리 인증번호"
          value={code}
          disabled={!sent}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          leftIcon={
            <Icon
              name="lock"
              size="sm"
              style={{ width: 15, height: 15, color: T.faint }}
            />
          }
        />
      </InputGroup>

      <div style={{ display: "grid", marginTop: 2 }}>
        <Button
          size="large"
          type="submit"
          disabled={!sent || code.length !== 6 || isPending || remaining === 0}
          iconRight={
            <Icon
              name="arrowRight"
              size="sm"
              style={{ width: 15, height: 15 }}
            />
          }
        >
          인증 후 로그인
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          style={{ margin: 0, fontSize: 13, color: T.danger, textAlign: "center" }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
