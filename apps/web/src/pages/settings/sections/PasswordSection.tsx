import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@lawkit/ui";
import { cx } from "../../contract/cx";
import { PASSWORD_CHECKS } from "../../../utils/passwordRule";
import { useChangePassword } from "../hooks/useChangePassword";
import { PASSWORD_CHANGE_DEFAULTS, passwordChangeSchema } from "../passwordChangeSchema";
import type { PasswordChangeValues } from "../passwordChangeSchema";
import { PasswordField } from "./PasswordField";
import * as css from "../settings.css";

/** 비밀번호 변경 — 현재 비밀번호 확인 + 새 비밀번호 조건을 입력하는 대로 보여준다. */
export const PasswordSection = () => {
  const { change, isChanging, serverError } = useChangePassword();
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: PASSWORD_CHANGE_DEFAULTS,
  });
  const newPassword = watch("newPassword");

  const handleValid = (values: PasswordChangeValues) =>
    change(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => reset(PASSWORD_CHANGE_DEFAULTS) },
    );

  return (
    <section className={css.card} aria-labelledby="settings-password-title">
      <div>
        <h2 id="settings-password-title" className={css.cardTitle}>비밀번호 변경</h2>
        <p className={css.cardDesc}>바꾼 뒤에도 지금 로그인은 그대로 유지돼요. 다음 로그인부터 새 비밀번호를 쓰세요.</p>
      </div>

      <form className={css.form} onSubmit={handleSubmit(handleValid)} noValidate>
        <PasswordField control={control} name="currentPassword" label="현재 비밀번호" error={errors.currentPassword?.message} />
        <div className={css.grid2}>
          <PasswordField control={control} name="newPassword" label="새 비밀번호" error={errors.newPassword?.message} />
          <PasswordField
            control={control}
            name="newPasswordConfirm"
            label="새 비밀번호 확인"
            error={errors.newPasswordConfirm?.message}
          />
        </div>

        <ul className={css.rules} aria-label="새 비밀번호 조건">
          {PASSWORD_CHECKS.map((check) => {
            const isMet = check.test(newPassword);
            return (
              <li key={check.label} className={cx(css.rule, isMet && css.ruleOk)}>
                {isMet ? "✓" : "○"} {check.label}
              </li>
            );
          })}
        </ul>

        {serverError && <p role="alert" className={css.errorText}>{serverError}</p>}

        <div className={css.actions}>
          <Button type="submit" disabled={isChanging}>
            {isChanging ? "변경 중…" : "비밀번호 변경"}
          </Button>
        </div>
      </form>
    </section>
  );
};
