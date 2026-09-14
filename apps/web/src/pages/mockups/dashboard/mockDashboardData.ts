import type { StatValueColor } from "@lawkit/ui";

// 대시보드 시안용 mock — 날짜는 오늘 기준 상대값이라 DdayBadge 가 항상 의미 있는 D-day 를 보인다.
// 실제 연결 시: 결재 차례 = GET /approvals/inbox, 계약 목록·파이프라인 = GET /contracts(상태별),
// 알림 = GET /notifications. 일정·공지·AI 브리핑은 아직 API 가 없다(후속).

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toYmd(d);
};

export const TODAY_LABEL = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
export const USER_NAME = "손준호";

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
}

export const TASKS: TaskItem[] = [
  { id: "t1", kind: "approval", domain: "계약", title: "클라우드 서비스 이용계약", sub: "체결 품의 · 결재 2/3단계 · 상신 한지원", due: addDays(0), action: "결재하기" },
  { id: "t2", kind: "assign", domain: "계약", title: "통합검색 유지보수 계약", sub: "요청 박현경 · 사업개발팀", due: addDays(1), action: "배정하기" },
  { id: "t3", kind: "review", domain: "계약", title: "한라산 EV 충전기 공급계약", sub: "법무 검토 · AI 리스크 2건 감지", due: addDays(2), action: "검토하기" },
  { id: "t4", kind: "advice", domain: "자문", title: "개인정보 위수탁 처리 자문 회신", sub: "요청 정보보안팀", due: addDays(4), action: "회신하기" },
  { id: "t5", kind: "litigation", domain: "송무", title: "물품대금 청구 사건 준비서면", sub: "서울중앙지법 · 1차 변론기일 대비", due: addDays(6), action: "준비하기" },
];

export interface PipelineStage {
  status: string;
  label: string;
  count: number;
  color: StatValueColor;
}

export const PIPELINE: PipelineStage[] = [
  { status: "unassigned", label: "배정 대기", count: 3, color: "danger" },
  { status: "legalReview", label: "법무 검토", count: 11, color: "primary" },
  { status: "requesterReview", label: "요청자 검토", count: 4, color: "heading" },
  { status: "reviewDone", label: "검토 완료", count: 6, color: "heading" },
  { status: "signing", label: "체결 진행", count: 2, color: "warning" },
  { status: "signed", label: "체결 완료", count: 28, color: "success" },
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
}

export const CONTRACT_ROWS: ContractRow[] = [
  { id: "c1", code: "C20260912-6115", title: "통합검색 유지보수 계약", counterparty: "휴맥스 테스트", owner: "미배정", status: "unassigned", statusLabel: "미배정", due: addDays(1) },
  { id: "c2", code: "C20260911-4930", title: "마케팅 대행 용역 계약", counterparty: "크리에이티브랩", owner: "미배정", status: "unassigned", statusLabel: "미배정", due: addDays(5) },
  { id: "c3", code: "C20260910-0004", title: "한라산 EV 충전기 공급계약", counterparty: "AAA", owner: "손준호", status: "legalReview", statusLabel: "법무 검토 중", due: addDays(2) },
  { id: "c4", code: "C20260909-0077", title: "공동마케팅 업무협약", counterparty: "리걸핀테크", owner: "김법무", status: "legalReview", statusLabel: "법무 검토 중", due: addDays(9) },
  { id: "c5", code: "C20260905-0113", title: "SaaS 구독 갱신계약", counterparty: "데이터브릿지", owner: "이법무", status: "requesterReview", statusLabel: "요청자 검토 중", due: addDays(3) },
  { id: "c6", code: "C20260908-0142", title: "클라우드 서비스 이용계약", counterparty: "넥스트클라우드", owner: "김도윤", status: "signing", statusLabel: "체결 진행", due: addDays(0) },
  { id: "c7", code: "C20260902-0021", title: "사무실 임대차 계약 (본사 12F)", counterparty: "대성빌딩관리", owner: "손준호", status: "reviewDone", statusLabel: "검토 완료", due: addDays(12) },
];

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

export const AI_BRIEF =
  "오늘 기한인 결재 1건과 내일까지 배정해야 할 계약 1건이 있어요. '한라산 EV 충전기 공급계약'의 손해배상 한도 조항 리스크를 먼저 확인하세요.";
