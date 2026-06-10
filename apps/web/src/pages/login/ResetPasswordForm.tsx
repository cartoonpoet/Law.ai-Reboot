import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon, Button, Input, InputGroup, Alert } from "@lawkit/ui";
import { confirmPasswordReset } from "../../api/auth";
import { T } from "../../design/tokens";

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .regex(PASSWORD_RULE, "영문·숫자·특수문자 포함 8자 이상이어야 합니다"),
    newPasswordConfirm: z.string().min(1, "비밀번호를 다시 입력하세요"),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, {
    path: ["newPasswordConfirm"],
    message: "비밀번호가 일치하지 않습니다",
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div role="alert" style={{ marginTop: 5, fontSize: 12, color: T.danger }}>
      {msg}
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", newPasswordConfirm: "" },
  });

  const onValid = async (values: ResetPasswordValues) => {
    setServerError(null);
    try {
      await confirmPasswordReset({ token, newPassword: values.newPassword });
      setDone(true);
    } catch (e) {
      setServerError(
        e instanceof Error ? e.message : "비밀번호 재설정에 실패했습니다",
      );
    }
  };

  if (done) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Alert.type "success"는 @lawkit/ui에 없어 "info"로 대체. */}
        <Alert type="info" title="비밀번호를 변경했습니다">
          새 비밀번호로 다시 로그인해 주세요.
        </Alert>
        <div style={{ display: "grid" }}>
          <Button size="large" onClick={() => navigate("/login")}>
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  const lockIcon = (
    <Icon name="lock" size="sm" style={{ width: 16, height: 16, color: T.faint }} />
  );

  return (
    <form
      onSubmit={handleSubmit(onValid)}
      style={{ display: "flex", flexDirection: "column", gap: 15 }}
    >
      <InputGroup label="새 비밀번호">
        <Controller
          name="newPassword"
          control={control}
          render={({ field }) => (
            <Input
              inputSize="large"
              type={showPw ? "text" : "password"}
              placeholder="새 비밀번호"
              value={field.value}
              onChange={field.onChange}
              leftIcon={lockIcon}
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
                    style={{ width: 16, height: 16, color: T.faint }}
                  />
                </button>
              }
            />
          )}
        />
        <div style={{ marginTop: 5, fontSize: 12, color: T.faint }}>
          영문·숫자·특수문자 포함 8자 이상
        </div>
        <ErrText msg={errors.newPassword?.message} />
      </InputGroup>

      <InputGroup label="새 비밀번호 확인">
        <Controller
          name="newPasswordConfirm"
          control={control}
          render={({ field }) => (
            <Input
              inputSize="large"
              type="password"
              placeholder="새 비밀번호 재입력"
              value={field.value}
              onChange={field.onChange}
              leftIcon={lockIcon}
            />
          )}
        />
        <ErrText msg={errors.newPasswordConfirm?.message} />
      </InputGroup>

      <div style={{ display: "grid", marginTop: 2 }}>
        <Button
          size="large"
          type="submit"
          disabled={isSubmitting}
          iconRight={
            <Icon name="arrowRight" size="sm" style={{ width: 15, height: 15 }} />
          }
        >
          비밀번호 변경
        </Button>
      </div>

      {serverError && (
        <p
          role="alert"
          style={{ margin: 0, fontSize: 13, color: T.danger, textAlign: "center" }}
        >
          {serverError}
        </p>
      )}
    </form>
  );
}
