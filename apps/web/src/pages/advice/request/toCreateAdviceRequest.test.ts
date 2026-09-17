import { describe, expect, it } from "vitest";
import { adviceRequestSchema, createAdviceRequestDefaults } from "./adviceRequestSchema";
import { toCreateAdviceRequest } from "./toCreateAdviceRequest";

const ME = { id: "u1", name: "김수현" };

const filledForm = () => ({
  ...createAdviceRequestDefaults(ME),
  title: "  해외 대리점 계약 준거법 문의 ",
  categories: ["계약해석"],
  region: "overseas" as const,
  countries: ["VN"],
  background: "<p>베트남 유통사와 협의 중</p>",
  question: "<p>준거법을 한국법으로 둘 수 있나요?</p>",
  etcRequest: "  ",
  dueDate: "2026-09-18",
  counterparty: " Saigon Retail ",
});

describe("자문 요청 폼", () => {
  it("로그인한 사람을 요청자로 채워 둔다", () => {
    expect(createAdviceRequestDefaults(ME).requester).toEqual(ME);
  });

  it("에디터에 글자 없이 빈 문단만 있으면 막는다", () => {
    const result = adviceRequestSchema.safeParse({ ...filledForm(), question: "<p></p>" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain("질의의 요지를 입력해 주세요");
  });

  it("요청자가 비면 막는다", () => {
    const result = adviceRequestSchema.safeParse({ ...filledForm(), requester: null });
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain("requester");
  });

  it("API 본문으로 바꿀 때 앞뒤 공백을 지우고 빈 값은 null 로 보낸다", () => {
    const body = toCreateAdviceRequest(adviceRequestSchema.parse(filledForm()));
    expect(body).toMatchObject({
      title: "해외 대리점 계약 준거법 문의",
      requesterId: "u1",
      ownerId: null,
      etcRequest: null,
      dueDate: "2026-09-18",
      details: { counterparty: "Saigon Retail", ccUsers: [], project: null },
    });
  });
});
