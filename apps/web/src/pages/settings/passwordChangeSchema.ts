import { z } from "zod";
import { PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from "../../utils/passwordRule";

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력하세요"),
    newPassword: z.string().regex(PASSWORD_RULE, PASSWORD_RULE_MESSAGE),
    newPasswordConfirm: z.string().min(1, "새 비밀번호를 다시 입력하세요"),
  })
  .refine((values) => values.newPassword === values.newPasswordConfirm, {
    path: ["newPasswordConfirm"],
    message: "새 비밀번호와 같지 않아요",
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "현재 비밀번호와 다른 비밀번호를 입력하세요",
  });

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

export const PASSWORD_CHANGE_DEFAULTS: PasswordChangeValues = {
  currentPassword: "",
  newPassword: "",
  newPasswordConfirm: "",
};
