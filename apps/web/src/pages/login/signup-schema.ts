import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(1, "이름을 입력하세요"),
    employeeNo: z.string().min(1, "사번을 입력하세요"),
    email: z.email("올바른 이메일을 입력하세요"),
    department: z.string().min(1, "소속 부서를 선택하세요"),
    password: z
      .string()
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
        "영문·숫자·특수문자 포함 8자 이상이어야 합니다",
      ),
    passwordConfirm: z.string().min(1, "비밀번호를 다시 입력하세요"),
    agree: z
      .boolean()
      .refine((v) => v === true, { message: "약관에 동의해야 합니다" }),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다",
  });

export type SignupForm = z.infer<typeof signupSchema>;

export const signupDefaults: SignupForm = {
  name: "",
  employeeNo: "",
  email: "",
  department: "",
  password: "",
  passwordConfirm: "",
  agree: false,
};

export const DEPARTMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "legal", label: "법무팀" },
  { value: "sales", label: "영업본부" },
  { value: "dev", label: "개발본부" },
  { value: "infra", label: "인프라팀" },
  { value: "etc", label: "기타" },
];
