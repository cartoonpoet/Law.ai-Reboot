// 법률자문 상세 v2 시안 데이터 — 화면 확인 전용(실 API 연결 전).
import type { AvatarColor, TimelineItem } from "@lawkit/ui";
import type { Approver } from "../../../contract/request-schema";

/** 시안 기준일 — D-day 가 매일 바뀌지 않게 고정한다. */
export const MOCK_TODAY = "2026-09-16";

export const ADVICE = {
  code: "ADV-2026-0091",
  title: "해외 대리점 계약 준거법 문의",
  category: "계약해석",
  region: "해외",
  isSecure: true,
  viewerCount: 4,
  requesterName: "김수현",
  requesterDept: "영업1팀",
  ownerName: "박지훈",
  ownerTitle: "사내변호사",
  requestedAt: "2026-09-14",
  dueDate: "2026-09-18",
  dueReason: "9/18(금) 해외사업 임원 보고 전 회신 요청",
  background:
    "베트남 호찌민 소재 유통사(Saigon Retail JSC)와 2027년부터 3년간 독점 대리점 계약을 협의 중입니다. 상대방은 준거법을 베트남법으로, 분쟁해결은 호찌민 인민법원 관할로 하자는 입장이며, 계약 해지 시 대리점 보상금 조항 추가도 요구하고 있습니다.",
  question:
    "① 준거법을 대한민국 법으로 지정할 수 있는지, ② 어렵다면 법원 관할 대신 싱가포르 국제중재(SIAC)로 가는 편이 유리한지, ③ 베트남 법상 대리점 해지 제한·보상금 강행규정이 있다면 당사 해지권에 어떤 영향이 있는지 검토 부탁드립니다.",
  etcRequest: "상대방 수정안 회신 기한이 9/22이라, 그 전에 협상 포지션을 정해야 합니다.",
};

/* ── AI 자문 도우미 ── */

export const AI_SUMMARY =
  "당사자 합의로 한국법을 준거법으로 둘 수는 있으나, 베트남 상법상 대리점 보호 규정은 강행규정으로 적용될 여지가 큽니다. 집행 가능성을 고려하면 현지 법원보다 SIAC 중재가 유리합니다.";

export interface AiIssue {
  id: string;
  title: string;
  basis: string;
}

export const AI_ISSUES: AiIssue[] = [
  { id: "i1", title: "준거법 합의의 유효성", basis: "국제사법 제45조(당사자 자치) · 베트남 민법 제683조" },
  { id: "i2", title: "대리점 해지·보상 강행규정 적용", basis: "베트남 상법 제177조 이하(상사대리)" },
  { id: "i3", title: "중재판정의 현지 집행 가능성", basis: "뉴욕협약 가입국(베트남 1995년) · SIAC 규칙" },
];

export interface SimilarAdvice {
  id: string;
  code: string;
  title: string;
  answeredAt: string;
  conclusion: string;
}

export const SIMILAR_ADVICES: SimilarAdvice[] = [
  {
    id: "s1",
    code: "ADV-2026-0032",
    title: "인도네시아 총판 계약 분쟁해결 조항",
    answeredAt: "2026-03-11",
    conclusion: "SIAC 중재 + 한국법 준거 권고",
  },
  {
    id: "s2",
    code: "ADV-2025-0217",
    title: "베트남 합작법인 주주간계약 준거법",
    answeredAt: "2025-11-04",
    conclusion: "현지 강행규정 별도 검토 필요",
  },
];

/* ── 질의 · 회신 스레드 ── */

export type ThreadRoleTypes = "requester" | "legal";

export interface ThreadMessage {
  id: string;
  authorName: string;
  authorDept: string;
  role: ThreadRoleTypes;
  kind: string;
  sentAt: string;
  body: string;
  attachments: string[];
}

export const THREAD_MESSAGES: ThreadMessage[] = [
  {
    id: "m1",
    authorName: "김수현",
    authorDept: "영업1팀",
    role: "requester",
    kind: "최초 질의",
    sentAt: "09.14 (월) 10:12",
    body: "상대방이 보낸 수정안과 협의 메일 첨부드립니다. 준거법·분쟁해결 조항이 가장 급합니다.",
    attachments: ["Saigon Retail 수정안_v2.docx", "협의 메일_0912.pdf"],
  },
  {
    id: "m2",
    authorName: "박지훈",
    authorDept: "법무팀",
    role: "legal",
    kind: "추가 질의",
    sentAt: "09.15 (화) 14:40",
    body: "독점권 부여 범위가 베트남 전역인지, 최소 구매수량(MOQ) 미달 시 해지 조항이 초안에 있는지 확인 부탁드립니다. 해지 사유에 따라 보상금 쟁점이 달라집니다.",
    attachments: [],
  },
  {
    id: "m3",
    authorName: "김수현",
    authorDept: "영업1팀",
    role: "requester",
    kind: "답변",
    sentAt: "09.15 (화) 17:05",
    body: "베트남 전역 독점이고, MOQ는 연 12만 달러입니다. 2년 연속 미달 시 해지할 수 있도록 넣어 두었습니다. 중재로 가면 비용이 어느 정도인지도 알려주시면 보고에 반영하겠습니다.",
    attachments: [],
  },
  {
    id: "m4",
    authorName: "박지훈",
    authorDept: "법무팀",
    role: "legal",
    kind: "추가 질의",
    sentAt: "09.16 (수) 09:30",
    body: "기존 동남아 대리점 계약(인도네시아 총판)에서 실제 해지 보상금을 지급한 사례가 있는지 영업팀 기록 확인 부탁드립니다.",
    attachments: [],
  },
];

/* ── 결재선 ── */

export type ApproverStateTypes = "done" | "now" | "wait";

export interface AdviceApprover {
  id: string;
  name: string;
  dept: string;
  type: Approver["type"];
  state: ApproverStateTypes;
  decidedAt: string;
}

export const APPROVERS: AdviceApprover[] = [
  { id: "p1", name: "김수현", dept: "영업1팀 · 대리", type: "draft", state: "done", decidedAt: "09.14" },
  { id: "p2", name: "오세진", dept: "영업1팀 · 팀장", type: "agree", state: "done", decidedAt: "09.14" },
  { id: "p3", name: "한은정", dept: "법무팀 · 팀장", type: "approve", state: "wait", decidedAt: "" },
  { id: "p4", name: "정민규", dept: "해외사업본부 · 본부장", type: "refer", state: "wait", decidedAt: "" },
];

export const APPROVER_STATE_LABEL: Record<ApproverStateTypes, string> = {
  done: "완료",
  now: "진행 중",
  wait: "회신 후",
};

/* ── 첨부 · 관련 ── */

export interface AdviceFile {
  id: string;
  name: string;
  meta: string;
}

export const ATTACHMENTS: AdviceFile[] = [
  { id: "f1", name: "Saigon Retail 수정안_v2.docx", meta: "DOCX · 184KB · 김수현" },
  { id: "f2", name: "협의 메일_0912.pdf", meta: "PDF · 1.2MB · 김수현" },
  { id: "f3", name: "베트남 상법 발췌(국문).pdf", meta: "PDF · 640KB · 박지훈" },
];

export const RELATED_CONTRACT = {
  code: "CT-2026-0412",
  title: "Saigon Retail 독점 대리점계약(초안)",
  stage: "법무 검토 대기",
};

/* ── 이력 ── */

export const HISTORY: TimelineItem[] = [
  { id: "h5", date: "09.16 09:30", title: "추가 질의 발송", description: "박지훈 → 김수현", status: "current" },
  { id: "h4", date: "09.15 17:05", title: "요청자 답변 등록", description: "김수현", status: "done" },
  { id: "h3", date: "09.15 09:02", title: "법무 검토 시작", description: "박지훈", status: "done" },
  { id: "h2", date: "09.14 15:20", title: "담당자 배정", description: "한은정 → 박지훈", status: "done" },
  { id: "h1", date: "09.14 10:12", title: "자문 요청 접수", description: "김수현 · 결재 합의 완료", status: "done" },
];

export const ROLE_AVATAR_COLOR: Record<ThreadRoleTypes, AvatarColor> = {
  requester: "primary",
  legal: "info",
};
