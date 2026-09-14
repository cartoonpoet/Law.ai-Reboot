import type { StatValueColor } from "@lawkit/ui";

// 대시보드 시안용 mock — 날짜는 오늘 기준 상대값이라 DdayBadge 가 항상 의미 있는 D-day 를 보인다.
// 실제 연결 시: 결재 차례 = GET /approvals/inbox, 계약 목록·파이프라인 = GET /contracts(상태별),
// 알림 = GET /notifications, 계약 리스크 = AI 분석(aiAnalysis). 일정·공지·코파일럿 질의·AI 일정 배치는 후속 API.

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toYmd(d);
};

export const TODAY_LABEL = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
export const USER_NAME = "손준호";

/* --- 할 일(모든 항목에 AI 이유·준비물) --- */
export type TaskKindTypes = "approval" | "assign" | "review" | "advice" | "litigation";

export interface KpiItem {
  kind: TaskKindTypes | "all";
  label: string;
  value: number;
  color: StatValueColor;
}

export const KPIS: KpiItem[] = [
  { kind: "approval", label: "내 결재 차례", value: 1, color: "primary" },
  { kind: "assign", label: "배정 필요", value: 1, color: "danger" },
  { kind: "review", label: "내 검토 중", value: 1, color: "heading" },
  { kind: "all", label: "7일 내 기한", value: 5, color: "warning" },
];

export interface TaskItem {
  id: string;
  kind: TaskKindTypes;
  domain: "계약" | "자문" | "송무";
  title: string;
  sub: string;
  due: string;
  action: string;
  // AI 가 "왜 지금" 인지 판단한 근거
  aiReason: string;
  // AI 가 미리 준비해 둔 것(초안·추천)
  aiPrepared: string;
}

export const TASKS: TaskItem[] = [
  {
    id: "t1",
    kind: "approval",
    domain: "계약",
    title: "클라우드 서비스 이용계약",
    sub: "체결 품의 · 결재 2/3단계 · 상신 한지원",
    due: addDays(0),
    action: "결재하기",
    aiReason: "오늘 결재해야 9/20 체결 일정이 지켜져요",
    aiPrepared: "승인 의견 초안 준비됨",
  },
  {
    id: "t2",
    kind: "assign",
    domain: "계약",
    title: "통합검색 유지보수 계약",
    sub: "요청 박현경 · 사업개발팀",
    due: addDays(1),
    action: "배정하기",
    aiReason: "비슷한 IT 용역을 3번 맡은 김법무가 적임이에요",
    aiPrepared: "담당자 추천: 김법무 (적합도 92%)",
  },
  {
    id: "t3",
    kind: "review",
    domain: "계약",
    title: "한라산 EV 충전기 공급계약",
    sub: "법무 검토 · 요청 영업1팀",
    due: addDays(2),
    action: "검토하기",
    aiReason: "손해배상 한도가 계약금액의 300%로 표준(100%)보다 높아요",
    aiPrepared: "수정 문구 제안 2건",
  },
  {
    id: "t4",
    kind: "advice",
    domain: "자문",
    title: "개인정보 위수탁 처리 자문 회신",
    sub: "요청 정보보안팀",
    due: addDays(4),
    action: "회신하기",
    aiReason: "지난 분기 유사 자문 회신 2건을 찾았어요",
    aiPrepared: "회신 초안 준비됨",
  },
  {
    id: "t5",
    kind: "litigation",
    domain: "송무",
    title: "물품대금 청구 사건 준비서면",
    sub: "서울중앙지법 · 1차 변론기일 대비",
    due: addDays(6),
    action: "준비하기",
    aiReason: "상대방 답변서 쟁점 3개를 정리해 뒀어요",
    aiPrepared: "쟁점 요약 준비됨",
  },
];

export const AI_BRIEF =
  "오늘 기한인 결재 1건과 내일까지 배정할 계약 1건이 있어요. 두 건 모두 초안·추천을 준비해 뒀으니 확인만 하시면 되고, 남는 시간엔 '한라산 EV 충전기 공급계약'의 손해배상 조항부터 보세요.";

/* --- B. 코파일럿 --- */
export interface CopilotAnswer {
  question: string;
  answer: string;
  taskIds: string[];
}

export const COPILOT_ANSWERS: CopilotAnswer[] = [
  {
    question: "오늘 급한 일 정리해줘",
    answer: "오늘 마감인 결재 1건과 내일까지인 배정 1건이 가장 급해요. 결재 의견 초안과 담당자 추천을 준비해 뒀으니 확인만 하시면 됩니다.",
    taskIds: ["t1", "t2"],
  },
  {
    question: "한라산 EV 계약 리스크 요약해줘",
    answer: "손해배상 한도가 계약금액의 300%로 표준(100%)보다 높고, 지체상금 상한이 없어요. 두 조항 모두 수정 문구를 제안해 뒀어요.",
    taskIds: ["t3"],
  },
  {
    question: "이번 주 마감 일정 알려줘",
    answer: "이번 주 마감은 5건이에요. 주 후반에 자문 회신과 준비서면이 몰리니, 자문 회신을 먼저 끝내는 순서를 추천해요.",
    taskIds: ["t4", "t5"],
  },
  {
    question: "배정 대기 건 담당자 추천해줘",
    answer: "통합검색 유지보수 계약은 비슷한 IT 용역을 3번 맡았고 현재 검토 중인 건이 적은 김법무를 추천해요.",
    taskIds: ["t2"],
  },
];

export const COPILOT_FALLBACK =
  "질문을 이해했어요. 실제 서비스에서는 계약·자문·송무 데이터를 찾아 답하고 관련 항목을 아래에 모아 보여드려요. (시안에서는 추천 질문만 답변이 준비돼 있어요)";

/* --- C. 트리아지 --- */
export interface TriageCard {
  id: string;
  title: string;
  sub: string;
  ai: string;
  action: string;
  due: string;
}

export interface TriageLane {
  key: "ready" | "decide" | "waiting";
  title: string;
  description: string;
  cards: TriageCard[];
}

export const TRIAGE_LANES: TriageLane[] = [
  {
    key: "ready",
    title: "확인만 하면 끝",
    description: "AI 가 초안·추천을 끝내 둔 일이에요.",
    cards: [
      { id: "r1", title: "클라우드 서비스 이용계약", sub: "결재 2/3단계", ai: "승인 의견 초안 준비됨", action: "초안 확인", due: addDays(0) },
      { id: "r2", title: "통합검색 유지보수 계약", sub: "배정 대기", ai: "김법무 추천 (적합도 92%)", action: "추천대로 배정", due: addDays(1) },
      { id: "r3", title: "개인정보 위수탁 자문 회신", sub: "자문 · 정보보안팀", ai: "유사 회신 기반 초안 준비됨", action: "초안 확인", due: addDays(4) },
    ],
  },
  {
    key: "decide",
    title: "내 판단이 필요해요",
    description: "AI 가 쟁점만 추려 뒀어요. 결정은 직접.",
    cards: [
      { id: "d1", title: "한라산 EV 충전기 공급계약", sub: "법무 검토", ai: "손해배상 300% · 지체상금 상한 없음", action: "쟁점 보기", due: addDays(2) },
      { id: "d2", title: "물품대금 청구 사건 준비서면", sub: "송무 · 서울중앙지법", ai: "상대방 쟁점 3개 · 반박 포인트 정리", action: "쟁점 보기", due: addDays(6) },
    ],
  },
  {
    key: "waiting",
    title: "다른 사람을 기다리는 중",
    description: "AI 가 지연을 지켜보고 있어요.",
    cards: [
      { id: "w1", title: "SaaS 구독 갱신계약", sub: "요청자 검토 대기 3일째", ai: "리마인드 메시지 초안 준비됨", action: "리마인드", due: addDays(3) },
      { id: "w2", title: "공동마케팅 업무협약", sub: "재무팀 합의 대기", ai: "평소보다 1일 지연 — 오늘 중 응답 예상", action: "상태 보기", due: addDays(5) },
    ],
  },
];

/* --- D. 리스크 레이더 --- */
export type RiskLevelTypes = "high" | "medium" | "low";

export interface RiskItem {
  id: string;
  contract: string;
  clause: string;
  category: string;
  level: RiskLevelTypes;
  aiSuggestion: string;
}

export const RISKS: RiskItem[] = [
  { id: "k1", contract: "한라산 EV 충전기 공급계약", clause: "손해배상 한도 — 계약금액의 300%", category: "손해배상", level: "high", aiSuggestion: "100% 로 낮추는 수정 문구를 제안해 뒀어요" },
  { id: "k2", contract: "클라우드 서비스 이용계약", clause: "계약 종료 시 데이터 반환·파기 조항 없음", category: "데이터·보안", level: "high", aiSuggestion: "30일 내 반환·파기 확약 조항 추가를 제안해요" },
  { id: "k3", contract: "SaaS 구독 갱신계약", clause: "자동 갱신 · 해지 통지 60일 전", category: "갱신·해지", level: "medium", aiSuggestion: "만료 70일 전 알림을 걸어 둘까요?" },
  { id: "k4", contract: "사무실 임대차 계약 (본사 12F)", clause: "원상복구 범위 불명확", category: "손해배상", level: "medium", aiSuggestion: "표준 원상복구 범위 문구를 제안해요" },
  { id: "k5", contract: "공동마케팅 업무협약", clause: "준거법·관할 미기재", category: "기타", level: "low", aiSuggestion: "대한민국 법·서울중앙지법 관할 추가를 제안해요" },
];

export const RISK_LEVEL_LABEL: Record<RiskLevelTypes, string> = { high: "높음", medium: "주의", low: "낮음" };
export const RISK_LEVELS: RiskLevelTypes[] = ["high", "medium", "low"];

export const RENEWALS = [
  { id: "e1", title: "SaaS 구독 갱신계약", ai: "자동 갱신 — 해지하려면 이번 주에 통지해야 해요", due: addDays(5) },
  { id: "e2", title: "복합기 임대 계약", ai: "지난해보다 단가 8% 인상 조건이 있어요", due: addDays(21) },
  { id: "e3", title: "보안관제 서비스 계약", ai: "사용량이 줄어 하위 요금제 전환을 검토해 보세요", due: addDays(38) },
];

/* --- E. 데일리 플랜 --- */
export interface DayBlock {
  id: string;
  time: string;
  title: string;
  ai: string;
  status: "done" | "current" | "upcoming";
}

export const DAY_PLAN: DayBlock[] = [
  { id: "p1", time: "09:30", title: "AI 브리핑 확인", ai: "오늘 챙길 일 5건 정리 완료", status: "done" },
  { id: "p2", time: "10:00 – 11:00", title: "집중 · 한라산 EV 충전기 공급계약 검토", ai: "리스크 2건과 수정 문구부터 보세요 (예상 40분)", status: "current" },
  { id: "p3", time: "11:00", title: "클라우드 서비스 이용계약 결재", ai: "승인 의견 초안 준비됨 — 오늘 마감", status: "upcoming" },
  { id: "p4", time: "14:00", title: "한라산 EV 공급계약 검토 회의", ai: "회의 전 쟁점 요약 1장 준비됨", status: "upcoming" },
  { id: "p5", time: "16:30", title: "통합검색 유지보수 계약 배정", ai: "김법무 추천 — 버튼 한 번이면 끝", status: "upcoming" },
];

export const AI_SUGGESTIONS = [
  "주 후반 오후가 비어 있어요 — 자문 회신 초안 2건을 몰아서 확인해 보세요.",
  "결재 요청 후 체결까지 평균 1.4일 걸려요. 클라우드 계약은 오전에 결재하면 오늘 체결 처리까지 가능해요.",
  "요청자 검토가 3일째 멈춘 계약이 있어요. 리마인드 초안을 보내 둘까요?",
];

/* --- F. 파이프라인 --- */
export interface PipelineStage {
  status: string;
  label: string;
  count: number;
  color: StatValueColor;
  aiInsight: string;
}

export const PIPELINE: PipelineStage[] = [
  { status: "unassigned", label: "배정 대기", count: 3, color: "danger", aiInsight: "배정까지 평균 3.2일 — 지난달보다 1.5일 늘었어요. IT 용역이 몰려 김법무·이법무에게 나눠 배정하는 걸 추천해요." },
  { status: "legalReview", label: "법무 검토", count: 11, color: "primary", aiInsight: "손준호 님에게 5건이 몰려 있어요. 표준서식과 거의 같은 2건은 빠른 검토로 넘길 수 있어요." },
  { status: "requesterReview", label: "요청자 검토", count: 4, color: "heading", aiInsight: "3일 넘게 응답 없는 요청자 검토가 1건 있어요. 리마인드 초안을 준비해 뒀어요." },
  { status: "reviewDone", label: "검토 완료", count: 6, color: "heading", aiInsight: "상신만 남은 계약이 6건이에요. 결재선 초안을 계약별로 준비해 뒀어요." },
  { status: "signing", label: "체결 진행", count: 2, color: "warning", aiInsight: "오늘 결재 마감 1건 — 결재가 끝나면 인감 담당에게 바로 알림을 보낼게요." },
  { status: "signed", label: "체결 완료", count: 28, color: "success", aiInsight: "90일 안에 만료되는 계약이 3건 있어요. 갱신 여부를 미리 물어볼까요?" },
];

export interface ContractRow {
  id: string;
  code: string;
  title: string;
  counterparty: string;
  owner: string;
  status: string;
  statusLabel: string;
  due: string;
  aiHint: string;
}

export const CONTRACT_ROWS: ContractRow[] = [
  { id: "c1", code: "C20260912-6115", title: "통합검색 유지보수 계약", counterparty: "휴맥스 테스트", owner: "미배정", status: "unassigned", statusLabel: "미배정", due: addDays(1), aiHint: "김법무 추천" },
  { id: "c2", code: "C20260911-4930", title: "마케팅 대행 용역 계약", counterparty: "크리에이티브랩", owner: "미배정", status: "unassigned", statusLabel: "미배정", due: addDays(5), aiHint: "표준서식 98% 일치" },
  { id: "c3", code: "C20260910-0004", title: "한라산 EV 충전기 공급계약", counterparty: "AAA", owner: "손준호", status: "legalReview", statusLabel: "법무 검토 중", due: addDays(2), aiHint: "손해배상 리스크" },
  { id: "c4", code: "C20260909-0077", title: "공동마케팅 업무협약", counterparty: "리걸핀테크", owner: "김법무", status: "legalReview", statusLabel: "법무 검토 중", due: addDays(9), aiHint: "재무 합의 필요" },
  { id: "c5", code: "C20260905-0113", title: "SaaS 구독 갱신계약", counterparty: "데이터브릿지", owner: "이법무", status: "requesterReview", statusLabel: "요청자 검토 중", due: addDays(3), aiHint: "응답 3일째 없음" },
  { id: "c6", code: "C20260908-0142", title: "클라우드 서비스 이용계약", counterparty: "넥스트클라우드", owner: "김도윤", status: "signing", statusLabel: "체결 진행", due: addDays(0), aiHint: "오늘 결재 마감" },
  { id: "c7", code: "C20260902-0021", title: "사무실 임대차 계약 (본사 12F)", counterparty: "대성빌딩관리", owner: "손준호", status: "reviewDone", statusLabel: "검토 완료", due: addDays(12), aiHint: "결재선 초안 준비" },
];

/* --- G. 항상 떠 있는 AI 비서(모든 화면 공통) --- */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export const ASSISTANT_GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "안녕하세요, 손준호 님. 지금 보고 있는 화면을 알고 있어요. 궁금한 걸 묻거나 시킬 일을 말씀해 주세요.",
};

// 추천 명령 — 질문뿐 아니라 "시키는" 명령(배정·초안 작성·알림)도 받는다는 걸 보여준다.
export const ASSISTANT_COMMANDS = [
  {
    prompt: "통합검색 유지보수 계약 김법무로 배정해줘",
    reply: "통합검색 유지보수 계약을 김법무에게 배정할게요. 배정 전에 확인해 주세요 — [배정하기] [취소]",
  },
  {
    prompt: "클라우드 계약 결재 의견 초안 써줘",
    reply: "초안이에요: \"데이터 반환·파기 조항이 보완되어 승인합니다. 손해배상 상한은 업계 표준 범위로 판단됩니다.\" 이대로 결재 의견에 넣을까요?",
  },
  {
    prompt: "이번 주 만료되는 계약 알려줘",
    reply: "이번 주 만료·갱신 통지 기한은 SaaS 구독 갱신계약 1건이에요. 자동 갱신이라 해지하려면 이번 주에 통지해야 해요.",
  },
  {
    prompt: "요청자 검토 멈춘 건 리마인드 보내줘",
    reply: "SaaS 구독 갱신계약 요청자(데이터브릿지 담당 부서)에게 보낼 리마인드 초안을 만들었어요. 보낼까요?",
  },
];

export const ASSISTANT_FALLBACK =
  "알겠어요. 실제 서비스에서는 계약·자문·송무 데이터와 권한 안에서 찾아 답하거나, 실행 전 확인을 받고 처리해요. (시안에서는 추천 명령만 답변이 준비돼 있어요)";

/* --- 오른쪽 레일 공통 --- */
export interface ScheduleEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  domain: "계약" | "자문" | "송무";
}

export const SCHEDULE: ScheduleEntry[] = [
  { id: "s1", date: addDays(1), title: "한라산 EV 공급계약 검토 회의", body: "AAA · 회의실 4F · 14:00", domain: "계약" },
  { id: "s2", date: addDays(3), title: "물품대금 청구 1차 변론기일", body: "서울중앙지법 411호 · 10:00", domain: "송무" },
  { id: "s3", date: addDays(6), title: "개인정보 위수탁 자문 회신 마감", body: "요청: 정보보안팀", domain: "자문" },
];

export interface NoticeEntry {
  id: string;
  tag: string;
  title: string;
  date: string;
  isNew: boolean;
}

export const NOTICES: NoticeEntry[] = [
  { id: "n1", tag: "공지", title: "전자서명 모듈 v2.3 점검 안내 (6/14 02:00~04:00)", date: "09.12", isNew: true },
  { id: "n2", tag: "사규", title: "「계약관리 규정」 개정안 사내 의견 수렴", date: "09.10", isNew: true },
  { id: "n3", tag: "릴리즈", title: "계약 AI 리스크 분석 베타 오픈", date: "09.03", isNew: false },
];
