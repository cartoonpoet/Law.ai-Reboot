import { z } from "zod";

// 사람·부서·프로젝트 선택값 — 계약 폼과 같은 ref(id+name) 형태.
const entity = z.object({ id: z.string(), name: z.string() });

// 에디터 HTML 에서 태그를 걷어낸 글자가 있어야 입력한 것으로 본다.
const richText = (message: string) =>
  z.string().refine((html) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0, message);

export const adviceRequestSchema = z
  .object({
    title: z.string().trim().min(1, "자문명을 입력해 주세요").max(200, "자문명은 200자까지 입력할 수 있어요"),
    categories: z.array(z.string()).min(1, "자문분류를 하나 이상 선택해 주세요"),
    securityLevel: z.enum(["top", "secure", "normal"]),
    // 기본값이 null 이라 nullable 로 두고, 제출할 때 superRefine 으로 필수 검사한다.
    requester: entity.nullable(),
    ccUsers: z.array(entity),
    ccDepts: z.array(entity),
    ccSecret: z.array(entity),
    owner: entity.nullable(),
    project: entity.nullable(),
    counterparty: z.string(),
    region: z.enum(["domestic", "overseas", "both"]),
    countries: z.array(z.string()).min(1, "국가를 선택해 주세요"),
    background: richText("사안의 배경을 입력해 주세요"),
    question: richText("질의의 요지를 입력해 주세요"),
    etcRequest: z.string(),
    dueDate: z.string().min(1, "자문 회신 기한을 선택해 주세요"),
  })
  .superRefine((form, ctx) => {
    if (form.requester === null) {
      ctx.addIssue({ code: "custom", path: ["requester"], message: "자문요청자를 선택해 주세요" });
    }
  });

export type AdviceRequestFormTypes = z.infer<typeof adviceRequestSchema>;

export const createAdviceRequestDefaults = (me: { id: string; name: string } | null): AdviceRequestFormTypes => ({
  title: "",
  categories: [],
  securityLevel: "secure",
  // 보통 본인이 요청하므로 로그인한 사람을 먼저 채워 둔다.
  requester: me,
  ccUsers: [],
  ccDepts: [],
  ccSecret: [],
  owner: null,
  project: null,
  counterparty: "",
  region: "domestic",
  countries: ["KR"],
  background: "",
  question: "",
  etcRequest: "",
  dueDate: "",
});
