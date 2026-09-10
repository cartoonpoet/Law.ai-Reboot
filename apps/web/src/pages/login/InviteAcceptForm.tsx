import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, InputGroup } from "@lawkit/ui";
import { acceptInvite } from "../../api/auth";
import { setTokens } from "../../api/tokens";
import * as inviteCss from "./inviteAccept.css";

const inviteAcceptSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해주세요"),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다",
  });

type InviteAcceptValues = z.infer<typeof inviteAcceptSchema>;

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div role="alert" className={inviteCss.errText}>
      {msg}
    </div>
  );
}

interface InviteAcceptFormProps {
  token: string;
  tenantName: string;
}

export function InviteAcceptForm({ token, tenantName }: InviteAcceptFormProps) {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteAcceptValues>({
    resolver: zodResolver(inviteAcceptSchema),
    defaultValues: { name: "", password: "", passwordConfirm: "" },
  });

  const onValid = async (values: InviteAcceptValues) => {
    setServerError(null);
    try {
      const res = await acceptInvite({
        token,
        name: values.name,
        password: values.password,
      });
      if (res.existingUser || !res.tokens) {
        setIsExistingUser(true);
        return;
      }
      setTokens(res.tokens.accessToken, res.tokens.refreshToken);
      navigate("/");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "가입에 실패했습니다");
    }
  };

  if (isExistingUser) {
    return (
      <div className={inviteCss.successCol}>
        <p className={inviteCss.successText}>
          이미 가입된 이메일입니다. 기존 계정에 <strong>{tenantName}</strong> 소속이
          추가되었습니다. 로그인 후 사이드바 하단에서 회사를 전환할 수 있습니다.
        </p>
        <Button onClick={() => navigate("/login")}>로그인하러 가기</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className={inviteCss.form}>
      <div>
        <InputGroup label="이름" required>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="홍길동" />
            )}
          />
        </InputGroup>
        <ErrText msg={errors.name?.message} />
      </div>
      <div>
        <InputGroup label="비밀번호" required helperText="8자 이상">
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input {...field} type="password" placeholder="••••••••" />
            )}
          />
        </InputGroup>
        <ErrText msg={errors.password?.message} />
      </div>
      <div>
        <InputGroup label="비밀번호 확인" required>
          <Controller
            name="passwordConfirm"
            control={control}
            render={({ field }) => (
              <Input {...field} type="password" placeholder="••••••••" />
            )}
          />
        </InputGroup>
        <ErrText msg={errors.passwordConfirm?.message} />
      </div>
      {serverError ? <ErrText msg={serverError} /> : null}
      <Button type="submit" disabled={isSubmitting}>
        가입하고 시작하기
      </Button>
    </form>
  );
}
