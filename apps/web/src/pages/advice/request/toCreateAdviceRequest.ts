import type { CreateAdviceBody } from "../../../api/advices";
import type { AdviceRequestFormTypes } from "./adviceRequestSchema";

/** 검증을 통과한 폼 값 → 자문 요청 API 본문. */
export const toCreateAdviceRequest = (form: AdviceRequestFormTypes): CreateAdviceBody => ({
  title: form.title.trim(),
  categories: form.categories,
  securityLevel: form.securityLevel,
  // 스키마가 제출 전에 요청자를 필수로 막는다.
  requesterId: form.requester?.id ?? "",
  ownerId: form.owner?.id ?? null,
  region: form.region,
  countries: form.countries,
  background: form.background,
  question: form.question,
  etcRequest: form.etcRequest.trim() || null,
  dueDate: form.dueDate || null,
  details: {
    ccUsers: form.ccUsers,
    ccDepts: form.ccDepts,
    ccSecret: form.ccSecret,
    project: form.project,
    counterparty: form.counterparty.trim(),
  },
});
