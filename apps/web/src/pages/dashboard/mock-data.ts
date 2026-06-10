export interface FlowStage {
  id: string;
  label: string;
  count: number;
  bottleneck?: boolean;
  tone?: "danger" | "primary" | "success" | "warning" | "neutral";
}

export interface Todo {
  id: string;
  type: "계약" | "자문" | "송무";
  title: string;
  who: string;
  role: string;
  action: string;
  urgency: number;
  status: string;
}

export interface Contract {
  id: string;
  name: string;
  sub: string;
  counter: string;
  owner: string;
  due: string;
  status: string;
  secure: boolean;
}

export interface ScheduleItem {
  date: string;
  dleft: number;
  title: string;
  body: string;
  tag: "계약" | "송무" | "자문";
}

export interface Notice {
  tag: string;
  title: string;
  date: string;
  isNew: boolean;
}

export interface AiBriefPoint {
  tone: "danger" | "primary" | "warning";
  text: string;
}

export const FLOW_STAGES: FlowStage[] = [
  { id: "request",   label: "검토 의뢰",   count: 6 },
  { id: "assign",    label: "배정",        count: 12, bottleneck: true, tone: "danger" },
  { id: "legal",     label: "법무 검토",   count: 22, bottleneck: true, tone: "primary" },
  { id: "requester", label: "요청자 검토", count: 9 },
  { id: "review",    label: "검토 완료",   count: 18, tone: "success" },
  { id: "sign",      label: "체결 진행",   count: 7 },
];

export const TODOS: Todo[] = [
  { id: "C20260609-0002", type: "계약", title: "[hkpark2] 유지보수계약서 검토 의뢰", who: "박현경", role: "요청자", action: "배정 필요", urgency: 0, status: "미배정" },
  { id: "C20250710-0004", type: "계약", title: "한라산 EV 충전기 공급계약 (AAA)",    who: "김기찬", role: "법무팀", action: "법무 검토",  urgency: 2, status: "법무 검토 중" },
  { id: "A20260531-0011", type: "자문", title: "개인정보 위수탁 관련 자문 회신",     who: "이법무", role: "법무팀", action: "회신 작성",  urgency: 1, status: "법무 검토 중" },
  { id: "C20260601-0007", type: "계약", title: "사후계약관리 표준 NDA 결재",         who: "관리자1",role: "결재자", action: "결재 대기",  urgency: 3, status: "요청자 검토 중" },
  { id: "L20260520-0003", type: "송무", title: "물품대금 청구 사건 준비서면 검토",   who: "정송무", role: "법무팀", action: "기일 준비",  urgency: 1, status: "법무 검토 중" },
];

export const CONTRACTS: Contract[] = [
  { id: "C20250710-0004", name: "한라산 EV 충전기 공급계약",    sub: "용역",   counter: "AAA",            owner: "김기찬", due: "2025-09-22", status: "법무 검토 중",   secure: true },
  { id: "C20250902-0001", name: "한라산용역계약서",              sub: "LOI/MOU",counter: "AAA",            owner: "김다함", due: "—",          status: "법무 검토 중",   secure: false },
  { id: "C20260609-0002", name: "[hkpark2] 통합검색 유지보수",  sub: "LOI/MOU",counter: "휴맥스 테스트",  owner: "미배정", due: "2026-07-06", status: "미배정",         secure: true },
  { id: "C20260602-0018", name: "통합검색 다운로드 로직 계약서", sub: "LOI/MOU",counter: "휴맥스 테스트",  owner: "박현경", due: "2026-05-12", status: "검토 완료",       secure: false },
  { id: "C20260601-0007", name: "사후계약관리 표준 NDA",         sub: "LOI/MOU",counter: "(주)온테스트",   owner: "이법무", due: "2026-06-18", status: "요청자 검토 중", secure: false },
];

export const SCHEDULE: ScheduleItem[] = [
  { date: "2026.06.10", dleft: 1, title: "한라산 EV 공급계약 검토 회의",       body: "AAA · 회의실 4F · 14:00",    tag: "계약" },
  { date: "2026.06.12", dleft: 3, title: "물품대금 청구 1차 변론기일",          body: "서울중앙지법 411호 · 10:00", tag: "송무" },
  { date: "2026.06.15", dleft: 6, title: "개인정보 위수탁 자문 회신 마감",      body: "요청자: 정보보안팀",         tag: "자문" },
];

export const NOTICES: Notice[] = [
  { tag: "공지",   title: "전자서명 모듈 v2.3 점검 안내 (6/14 02:00~04:00)",     date: "06.08", isNew: true },
  { tag: "사규",   title: "「계약관리 규정」 개정안 사내 의견 수렴",              date: "06.05", isNew: true },
  { tag: "릴리즈", title: "계약 AI 리스크 분석 베타 오픈 — 검토 화면에서 사용", date: "06.03", isNew: false },
];

export const AI_BRIEF = {
  headline: "오늘 손준호 님이 챙겨야 할 일은 3건입니다.",
  points: [
    { tone: "danger"  as const, text: "미배정 계약 12건 중 '유지보수 계약' 검토기한이 D-1로 가장 급합니다." },
    { tone: "primary" as const, text: "'한라산 EV 공급계약'에서 손해배상 한도·지체상금 조항 리스크가 감지됐어요." },
    { tone: "warning" as const, text: "물품대금 청구 사건 변론기일이 3일 뒤입니다. 준비서면 검토가 필요합니다." },
  ] satisfies AiBriefPoint[],
};
