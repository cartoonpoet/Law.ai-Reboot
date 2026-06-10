import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon, Button, Input, InputGroup, Dropdown, Checkbox } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { signup } from "../../api/auth";
import {
  signupSchema,
  signupDefaults,
  DEPARTMENT_OPTIONS,
} from "./signup-schema";
import type { SignupForm as SignupFormValues } from "./signup-schema";

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div role="alert" style={{ marginTop: 5, fontSize: 12, color: T.danger }}>
      {msg}
    </div>
  );
}

export function SignupForm() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: signupDefaults,
  });

  const onValid = async (values: SignupFormValues) => {
    setServerError(null);
    try {
      // employeeNo와 department는 백엔드 DTO가 지원될 때까지 전송하지 않음
      const data = await signup({
        email: values.email,
        name: values.name,
        password: values.password,
      });
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      navigate("/");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "가입 신청에 실패했습니다");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onValid)}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      {/* 이름 + 사번 — 2-col grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
      >
        <InputGroup label="이름" required>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                placeholder="홍길동"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <ErrText msg={errors.name?.message} />
        </InputGroup>

        <InputGroup label="사번" required>
          <Controller
            name="employeeNo"
            control={control}
            render={({ field }) => (
              <Input
                placeholder="HX-00000"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <ErrText msg={errors.employeeNo?.message} />
        </InputGroup>
      </div>

      {/* 회사 이메일 */}
      <InputGroup label="회사 이메일" required>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              type="email"
              placeholder="email@humaxit.com"
              value={field.value}
              onChange={field.onChange}
              leftIcon={
                <Icon
                  name="mail"
                  size="sm"
                  style={{ width: 15, height: 15, color: T.faint }}
                />
              }
            />
          )}
        />
        <ErrText msg={errors.email?.message} />
      </InputGroup>

      {/* 소속 부서 */}
      <InputGroup label="소속 부서" required>
        <Controller
          name="department"
          control={control}
          render={({ field }) => (
            <Dropdown
              options={DEPARTMENT_OPTIONS}
              placeholder="부서 선택"
              value={field.value}
              onChange={(v) =>
                field.onChange(Array.isArray(v) ? (v[0] ?? "") : v)
              }
            />
          )}
        />
        <ErrText msg={errors.department?.message} />
      </InputGroup>

      {/* 비밀번호 */}
      <InputGroup label="비밀번호" required>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input
              type={showPw ? "text" : "password"}
              placeholder="비밀번호"
              value={field.value}
              onChange={field.onChange}
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
          )}
        />
        <div style={{ marginTop: 4, fontSize: 11.5, color: T.muted }}>
          영문·숫자·특수문자 포함 8자 이상
        </div>
        <ErrText msg={errors.password?.message} />
      </InputGroup>

      {/* 비밀번호 확인 */}
      <InputGroup label="비밀번호 확인" required>
        <Controller
          name="passwordConfirm"
          control={control}
          render={({ field }) => (
            <Input
              type="password"
              placeholder="비밀번호 재입력"
              value={field.value}
              onChange={field.onChange}
              leftIcon={
                <Icon
                  name="lock"
                  size="sm"
                  style={{ width: 15, height: 15, color: T.faint }}
                />
              }
            />
          )}
        />
        <ErrText msg={errors.passwordConfirm?.message} />
      </InputGroup>

      {/* 약관 동의 */}
      <Controller
        name="agree"
        control={control}
        render={({ field }) => (
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              background: T.surfaceAlt,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Checkbox
              size="small"
              label="이용약관 및 개인정보 처리방침에 동의합니다"
              checked={!!field.value}
              onCheckedChange={field.onChange}
            />
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: T.primary,
                fontFamily: "Pretendard",
                padding: 0,
                flexShrink: 0,
              }}
            >
              보기
            </button>
          </div>
        )}
      />
      <ErrText msg={errors.agree?.message} />

      {/* 제출 */}
      <div style={{ display: "grid", marginTop: 2 }}>
        <Button
          size="large"
          type="submit"
          disabled={isSubmitting}
          iconRight={
            <Icon
              name="arrowRight"
              size="sm"
              style={{ width: 15, height: 15 }}
            />
          }
        >
          가입 신청
        </Button>
      </div>

      {serverError && (
        <p
          role="alert"
          style={{
            margin: 0,
            fontSize: 13,
            color: T.danger,
            textAlign: "center",
          }}
        >
          {serverError}
        </p>
      )}
    </form>
  );
}
