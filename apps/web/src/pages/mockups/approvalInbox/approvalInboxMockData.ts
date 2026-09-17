// 결재 대기함 시안용 표시 데이터 — 화면 비교 전용(실제 API 와 무관).

export type MockKindTypes = "contractSign" | "adviceRequest" | "adviceAnswer";
export type MockRoleTypes = "approve" | "agree";
export type MockStepStateTypes = "done" | "now" | "wait";

export interface MockApprovalStep {
  id: string;
  name: string;
  dept: string;
  role: "기안" | "결재" | "합의";
  state: MockStepStateTypes;
  decidedAt: string | null;
  comment: string | null;
}

export interface MockInboxItem {
  id: string;
  kind: MockKindTypes;
  title: string;
  code: string;
  submitterName: string;
  submitterDept: string;
  submittedAt: string; // MM-DD HH:mm
  waitingDays: number; // 상신 후 지난 날
  myRole: MockRoleTypes;
  myStep: number;
  totalSteps: number;
  // 문서마다 결재자가 먼저 봐야 할 핵심 정보 두세 줄.
  facts: { label: string; value: string }[];
  aiSummary: string | null;
  aiTone: "warning" | "danger" | "info";
  steps: MockApprovalStep[];
}

export const KIND_LABEL: Record<MockKindTypes, string> = {
  contractSign: "체결 품의",
  adviceRequest: "자문 요청",
  adviceAnswer: "자문 회신",
};

export const KIND_ORDER: MockKindTypes[] = ["contractSign", "adviceRequest", "adviceAnswer"];

export const ROLE_LABEL: Record<MockRoleTypes, string> = { approve: "결재", agree: "합의" };

export const PENDING_ITEMS: MockInboxItem[] = [
  {
    id: "p1",
    kind: "contractSign",
    title: "클라우드 서비스 이용계약",
    code: "C20260908-0142",
    submitterName: "한지원",
    submitterDept: "사업개발팀",
    submittedAt: "09-14 10:20",
    waitingDays: 3,
    myRole: "approve",
    myStep: 2,
    totalSteps: 3,
    facts: [
      { label: "상대방", value: "(주)넥스트클라우드" },
      { label: "금액", value: "월 18,400,000원 · 36개월" },
      { label: "계약 기간", value: "2026-10-01 ~ 2029-09-30" },
    ],
    aiSummary: "손해배상 상한이 월 이용료 1개월분으로 낮아요. 법무 검토 의견에서 상향을 권고했어요.",
    aiTone: "danger",
    steps: [
      { id: "s1", name: "한지원", dept: "사업개발팀", role: "기안", state: "done", decidedAt: "09-14 10:20", comment: null },
      { id: "s2", name: "오세진", dept: "사업개발팀", role: "합의", state: "done", decidedAt: "09-15 09:02", comment: "예산 확보 확인" },
      { id: "s3", name: "정민규", dept: "경영지원본부", role: "결재", state: "now", decidedAt: null, comment: null },
    ],
  },
  {
    id: "p2",
    kind: "adviceAnswer",
    title: "해외 대리점 계약 준거법 문의",
    code: "ADV-2026-0091",
    submitterName: "박지훈",
    submitterDept: "법무팀",
    submittedAt: "09-16 17:05",
    waitingDays: 1,
    myRole: "approve",
    myStep: 1,
    totalSteps: 1,
    facts: [
      { label: "요청자", value: "김수현 · 영업1팀" },
      { label: "회신 기한", value: "09-18 (D-1)" },
      { label: "회신 요지", value: "한국법 지정은 가능하나 SIAC 중재 권고" },
    ],
    aiSummary: "베트남 상법 강행규정 근거 조문이 회신에 빠져 있어요.",
    aiTone: "warning",
    steps: [
      { id: "s1", name: "박지훈", dept: "법무팀", role: "기안", state: "done", decidedAt: "09-16 17:05", comment: null },
      { id: "s2", name: "정민규", dept: "경영지원본부", role: "결재", state: "now", decidedAt: null, comment: null },
    ],
  },
  {
    id: "p3",
    kind: "adviceRequest",
    title: "하도급 대금 지급 기한 위반 여부",
    code: "ADV-2026-0095",
    submitterName: "박현우",
    submitterDept: "구매팀",
    submittedAt: "09-17 09:40",
    waitingDays: 0,
    myRole: "agree",
    myStep: 1,
    totalSteps: 2,
    facts: [
      { label: "자문분류", value: "공정거래 · 국내" },
      { label: "회신 희망일", value: "09-25" },
      { label: "질의 요지", value: "협력사 대금 60일 초과 지급이 하도급법 위반인지" },
    ],
    aiSummary: null,
    aiTone: "info",
    steps: [
      { id: "s1", name: "박현우", dept: "구매팀", role: "기안", state: "done", decidedAt: "09-17 09:40", comment: null },
      { id: "s2", name: "정민규", dept: "경영지원본부", role: "합의", state: "now", decidedAt: null, comment: null },
      { id: "s3", name: "최서연", dept: "구매팀", role: "결재", state: "wait", decidedAt: null, comment: null },
    ],
  },
  {
    id: "p4",
    kind: "contractSign",
    title: "물류센터 임대차 계약 갱신",
    code: "C20260911-0231",
    submitterName: "이도윤",
    submitterDept: "물류운영팀",
    submittedAt: "09-17 11:12",
    waitingDays: 0,
    myRole: "approve",
    myStep: 2,
    totalSteps: 2,
    facts: [
      { label: "상대방", value: "한빛자산운용(주)" },
      { label: "금액", value: "보증금 5억 · 월 42,000,000원" },
      { label: "계약 기간", value: "2026-11-01 ~ 2028-10-31" },
    ],
    aiSummary: "임대료 인상률이 기존 계약보다 6%p 높아요.",
    aiTone: "warning",
    steps: [
      { id: "s1", name: "이도윤", dept: "물류운영팀", role: "기안", state: "done", decidedAt: "09-17 11:12", comment: null },
      { id: "s2", name: "정민규", dept: "경영지원본부", role: "결재", state: "now", decidedAt: null, comment: null },
    ],
  },
];

export const UPCOMING_COUNT = 2;
export const PROCESSED_COUNT = 14;
