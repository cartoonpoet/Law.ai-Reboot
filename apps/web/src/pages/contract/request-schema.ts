import { z } from "zod";

export const contractRequestSchema = z.object({
  stage: z.enum(["new", "change"]),
  secure: z.enum(["top", "secure", "normal"]),
  name: z.string().min(1, "계약명을 입력하세요"),
  ctype: z.enum(["normal", "std"]),
  party: z.string().min(1, "계약 당사자를 선택하세요"),
  cat: z.string().min(1, "계약 대분류를 선택하세요"),
  period: z.string().min(1, "계약 기간을 입력하세요"),
  lang: z.enum(["ko", "en", "koen"]),
  legal: z.enum(["dom", "intl"]),
  amount: z.string().optional(),
  purpose: z.string().min(1, "계약의 배경 및 목적을 입력하세요"),
});

export type ContractRequestForm = z.infer<typeof contractRequestSchema>;

export const contractRequestDefaults: ContractRequestForm = {
  stage: "new",
  secure: "normal",
  name: "",
  ctype: "normal",
  party: "",
  cat: "",
  period: "",
  lang: "ko",
  legal: "dom",
  amount: "",
  purpose: "",
};
