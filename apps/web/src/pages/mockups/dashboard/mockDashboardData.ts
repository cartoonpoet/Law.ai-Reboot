// 현재 대시보드(pages/dashboard) 목업을 기준으로 AI 보조 문구만 더한 개선안용 데이터.
// 실제 연결 시: 할 일·결재 = GET /approvals/inbox·/contracts, 계약 리스크 = AI 분석(aiAnalysis),
// AI 요약·병목 분석·일정 AI 준비물·AI 비서 대화는 후속 API.

export const TODAY_LABEL = new Date().toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

/* --- D-day 표기(현재 대시보드 dday() 규칙 그대로: 당일·3일 이내 빨강, 7일 이내 주황) --- */
export type DdayToneTypes = "danger" | "warning" | "muted" | "faint";

export const getDday = (daysLeft: number): { label: string; tone: DdayToneTypes } => {
  if (daysLeft === 0) return { label: "D-DAY", tone: "danger" };
  if (daysLeft < 0) return { label: `D+${-daysLeft}`, tone: "faint" };
  if (daysLeft <= 3) return { label: `D-${daysLeft}`, tone: "danger" };
  if (daysLeft <= 7) return { label: `D-${daysLeft}`, tone: "warning" };
  return { label: `D-${daysLeft}`, tone: "muted" };
};

export type DomainTypes = "계약" | "자문" | "송무";

export const DOMAIN_TAG_COLOR: Record<DomainTypes, "primary" | "secondary" | "neutral"> = {
  계약: "primary",
  자문: "secondary",
  송무: "neutral",
};

/* --- AI 요약: 공통 버튼 3개 대신 항목마다 바로 처리 액션 --- */
export interface BriefPoint {
  id: string;
  tone: "danger" | "primary" | "warning";
  text: string;
  action: string;
}

export const AI_BRIEF: { headline: string; points: BriefPoint[] } = {
  headline: "오늘 손준호 님이 챙겨야 할 일은 3건입니다.",
  points: [
    {
      id: "b1",
      tone: "danger",
      text: "미배정 계약 12건 중 '유지보수 계약' 검토기한이 D-1로 가장 급합니다. 비슷한 IT 용역을 맡았던 김법무를 추천해요.",
      action: "추천대로 배정",
    },
    {
      id: "b2",
      tone: "primary",
      text: "'한라산 EV 공급계약'에서 손해배상 한도·지체상금 조항 리스크가 감지됐어요. 수정 문구 2건을 준비해 뒀어요.",
      action: "수정 문구 보기",
    },
    {
      id: "b3",
      tone: "warning",
      text: "물품대금 청구 사건 변론기일이 3일 뒤입니다. 상대방 답변서 쟁점 3개를 정리해 뒀어요.",
      action: "쟁점 요약 보기",
    },
  ],
};

/* --- 파이프라인(현재와 동일) + AI 병목 분석 --- */
export interface FlowStage {
  id: string;
  label: string;
  count: number;
  bottleneck: boolean;
  tone: "danger" | "primary" | "success" | "neutral";
}

export const FLOW_STAGES: FlowStage[] = [
  { id: "request", label: "검토 의뢰", count: 6, bottleneck: false, tone: "neutral" },
  { id: "assign", label: "배정", count: 12, bottleneck: true, tone: "danger" },
  { id: "legal", label: "법무 검토", count: 22, bottleneck: true, tone: "primary" },
  { id: "requester", label: "요청자 검토", count: 9, bottleneck: false, tone: "neutral" },
  { id: "review", label: "검토 완료", count: 18, bottleneck: false, tone: "success" },
  { id: "sign", label: "체결 진행", count: 7, bottleneck: false, tone: "neutral" },
];

export const PIPELINE_AI = {
  text: "배정 단계가 평균 3.2일로 지난달보다 1.5일 늘었어요. IT 용역 계약이 몰려 있어 김법무·이법무에게 나눠 배정하는 걸 추천해요.",
  action: "추천 배정안 보기",
};

/* --- 내 할일(현재와 동일한 항목) + AI 이유·준비물 --- */
export interface TodoItem {
  id: string;
  type: DomainTypes;
  title: string;
  status: string;
  action: string;
  daysLeft: number;
  aiReason: string;
  aiPrepared: string;
}

export const TODOS: TodoItem[] = [
  { id: "C20260609-0002", type: "계약", title: "[hkpark2] 유지보수계약서 검토 의뢰", status: "미배정", action: "배정 필요", daysLeft: 0, aiReason: "오늘이 검토기한", aiPrepared: "담당자 추천: 김법무" },
  { id: "C20250710-0004", type: "계약", title: "한라산 EV 충전기 공급계약 (AAA)", status: "법무 검토 중", action: "법무 검토", daysLeft: 2, aiReason: "손해배상 한도 300% 리스크", aiPrepared: "수정 문구 2건 준비" },
  { id: "A20260531-0011", type: "자문", title: "개인정보 위수탁 관련 자문 회신", status: "법무 검토 중", action: "회신 작성", daysLeft: 1, aiReason: "유사 자문 2건 발견", aiPrepared: "회신 초안 준비" },
  { id: "C20260601-0007", type: "계약", title: "사후계약관리 표준 NDA 결재", status: "요청자 검토 중", action: "결재 대기", daysLeft: 3, aiReason: "표준 NDA 와 조항 차이 없음", aiPrepared: "승인 의견 초안 준비" },
  { id: "L20260520-0003", type: "송무", title: "물품대금 청구 사건 준비서면 검토", status: "법무 검토 중", action: "기일 준비", daysLeft: 1, aiReason: "변론기일 대비", aiPrepared: "쟁점 3개 요약 준비" },
];

/* --- 진행 중 계약(현재와 동일) + AI 한 줄 --- */
export interface ContractRow {
  id: string;
  name: string;
  counter: string;
  owner: string;
  due: string;
  status: string;
  secure: boolean;
  aiHint: string;
}

export const CONTRACTS: ContractRow[] = [
  { id: "C20250710-0004", name: "한라산 EV 충전기 공급계약", counter: "AAA", owner: "김기찬", due: "2025-09-22", status: "법무 검토 중", secure: true, aiHint: "손해배상 한도 리스크" },
  { id: "C20250902-0001", name: "한라산용역계약서", counter: "AAA", owner: "김다함", due: "—", status: "법무 검토 중", secure: false, aiHint: "표준서식과 95% 일치" },
  { id: "C20260609-0002", name: "[hkpark2] 통합검색 유지보수", counter: "휴맥스 테스트", owner: "미배정", due: "2026-07-06", status: "미배정", secure: true, aiHint: "김법무 배정 추천" },
  { id: "C20260602-0018", name: "통합검색 다운로드 로직 계약서", counter: "휴맥스 테스트", owner: "박현경", due: "2026-05-12", status: "검토 완료", secure: false, aiHint: "상신만 남음 · 결재선 초안 준비" },
  { id: "C20260601-0007", name: "사후계약관리 표준 NDA", counter: "(주)온테스트", owner: "이법무", due: "2026-06-18", status: "요청자 검토 중", secure: false, aiHint: "요청자 응답 3일째 없음" },
];

/* --- 일정(현재와 동일) + AI 준비물 --- */
export interface ScheduleEntry {
  id: string;
  date: string;
  daysLeft: number;
  title: string;
  body: string;
  tag: DomainTypes;
  ai: string | null;
}

export const SCHEDULE: ScheduleEntry[] = [
  { id: "s1", date: "06.10", daysLeft: 1, title: "한라산 EV 공급계약 검토 회의", body: "AAA · 회의실 4F · 14:00", tag: "계약", ai: "회의 전 쟁점 요약 1장 준비됨" },
  { id: "s2", date: "06.12", daysLeft: 3, title: "물품대금 청구 1차 변론기일", body: "서울중앙지법 411호 · 10:00", tag: "송무", ai: "준비서면 쟁점 3개 정리됨" },
  { id: "s3", date: "06.15", daysLeft: 6, title: "개인정보 위수탁 자문 회신 마감", body: "요청자: 정보보안팀", tag: "자문", ai: null },
];

export interface NoticeEntry {
  id: string;
  tag: string;
  title: string;
  date: string;
  isNew: boolean;
}

export const NOTICES: NoticeEntry[] = [
  { id: "n1", tag: "공지", title: "전자서명 모듈 v2.3 점검 안내 (6/14 02:00~04:00)", date: "06.08", isNew: true },
  { id: "n2", tag: "사규", title: "「계약관리 규정」 개정안 사내 의견 수렴", date: "06.05", isNew: true },
  { id: "n3", tag: "릴리즈", title: "계약 AI 리스크 분석 베타 오픈 — 검토 화면에서 사용", date: "06.03", isNew: false },
];

/* --- 항상 떠 있는 AI 비서(모든 화면 공통) --- */
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

// 추천 명령 — 질문뿐 아니라 "시키는" 명령(배정·초안 작성·리마인드)도 받는다는 걸 보여준다.
export const ASSISTANT_COMMANDS = [
  {
    prompt: "유지보수 계약 김법무로 배정해줘",
    reply: "'[hkpark2] 유지보수계약서 검토 의뢰'를 김법무에게 배정할게요. 실행 전에 확인해 주세요 — [배정하기] [취소]",
  },
  {
    prompt: "NDA 결재 의견 초안 써줘",
    reply: "초안이에요: \"표준 NDA 와 조항 차이가 없어 승인합니다.\" 이대로 결재 의견에 넣을까요?",
  },
  {
    prompt: "한라산 EV 계약 리스크 요약해줘",
    reply: "손해배상 한도가 계약금액의 300%로 표준(100%)보다 높고, 지체상금 상한이 없어요. 수정 문구 2건을 준비해 뒀어요.",
  },
  {
    prompt: "NDA 요청자에게 리마인드 보내줘",
    reply: "사후계약관리 표준 NDA 요청자에게 보낼 리마인드 초안을 만들었어요. 보낼까요?",
  },
];

export const ASSISTANT_FALLBACK =
  "알겠어요. 실제 서비스에서는 권한 안의 계약·자문·송무 데이터를 찾아 답하거나, 실행 전 확인을 받고 처리해요. (시안에서는 추천 명령만 답변이 준비돼 있어요)";
