// 대시보드 데이터 — 집계·AI API 가 아직 없어 목업.
// 실제 연결 시: 할 일·결재 = GET /approvals/inbox·/contracts, 계약 리스크 = AI 분석(aiAnalysis),
// 업무 종류별 파이프라인 집계·AI 요약·병목 분석·일정 준비물은 후속 API.

export const TODAY_LABEL = new Date().toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

// 사이드바 법무 업무와 같은 단위. 기능이 늘면 여기에 한 줄씩 추가.
export type DomainTypes = "계약" | "결재" | "자문" | "송무" | "인감" | "지식재산";

export const DOMAIN_TAG_COLOR: Record<DomainTypes, "primary" | "secondary" | "neutral" | "info" | "warning" | "success"> = {
  계약: "primary",
  결재: "info",
  자문: "secondary",
  송무: "neutral",
  인감: "warning",
  지식재산: "success",
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

/* --- 파이프라인: 현재 계약 검토 파이프라인 UI 그대로, 업무 종류만 바꿔 볼 수 있게 + AI 병목 분석 --- */
export type StageToneTypes = "danger" | "primary" | "success" | "neutral";

export interface FlowStage {
  label: string;
  count: number;
  bottleneck: boolean;
  tone: StageToneTypes;
}

export interface Pipeline {
  domain: DomainTypes;
  title: string;
  stages: FlowStage[];
  ai: { text: string; action: string } | null;
}

export const PIPELINES: Pipeline[] = [
  {
    domain: "계약",
    title: "계약 검토 파이프라인",
    stages: [
      { label: "검토 의뢰", count: 6, bottleneck: false, tone: "neutral" },
      { label: "배정", count: 12, bottleneck: true, tone: "danger" },
      { label: "법무 검토", count: 22, bottleneck: true, tone: "primary" },
      { label: "요청자 검토", count: 9, bottleneck: false, tone: "neutral" },
      { label: "검토 완료", count: 18, bottleneck: false, tone: "success" },
      { label: "체결 진행", count: 7, bottleneck: false, tone: "neutral" },
    ],
    ai: {
      text: "배정 단계가 평균 3.2일로 지난달보다 1.5일 늘었어요. IT 용역 계약이 몰려 있어 김법무·이법무에게 나눠 배정하는 걸 추천해요.",
      action: "추천 배정안 보기",
    },
  },
  {
    domain: "자문",
    title: "법률자문 파이프라인",
    stages: [
      { label: "접수", count: 4, bottleneck: false, tone: "neutral" },
      { label: "배정", count: 2, bottleneck: false, tone: "neutral" },
      { label: "검토 중", count: 7, bottleneck: false, tone: "neutral" },
      { label: "회신 대기", count: 9, bottleneck: true, tone: "primary" },
      { label: "회신 완료", count: 11, bottleneck: false, tone: "success" },
    ],
    ai: { text: "회신 대기 9건 중 5건은 유사 자문 이력이 있어 회신 초안을 준비해 뒀어요.", action: "회신 초안 보기" },
  },
  {
    domain: "송무",
    title: "송무 파이프라인",
    stages: [
      { label: "사건 접수", count: 2, bottleneck: false, tone: "neutral" },
      { label: "소송 준비", count: 3, bottleneck: false, tone: "neutral" },
      { label: "1심", count: 6, bottleneck: false, tone: "neutral" },
      { label: "기일 임박", count: 4, bottleneck: true, tone: "danger" },
      { label: "종결", count: 5, bottleneck: false, tone: "success" },
    ],
    ai: { text: "7일 안에 기일이 4건 몰려 있어요. 준비서면 쟁점 요약 3건을 먼저 만들어 뒀어요.", action: "쟁점 요약 보기" },
  },
  {
    domain: "인감",
    title: "인감 사용 신청 파이프라인",
    stages: [
      { label: "신청", count: 5, bottleneck: false, tone: "neutral" },
      { label: "결재 중", count: 3, bottleneck: false, tone: "neutral" },
      { label: "날인 대기", count: 2, bottleneck: false, tone: "neutral" },
      { label: "날인 완료", count: 14, bottleneck: false, tone: "success" },
    ],
    ai: null,
  },
  {
    domain: "지식재산",
    title: "지식재산권 파이프라인",
    stages: [
      { label: "출원 준비", count: 1, bottleneck: false, tone: "neutral" },
      { label: "심사 중", count: 6, bottleneck: false, tone: "neutral" },
      { label: "등록", count: 21, bottleneck: false, tone: "success" },
      { label: "갱신 임박", count: 2, bottleneck: true, tone: "danger" },
    ],
    ai: { text: "상표 2건의 갱신기한이 30일 안에 끝나요. 갱신 신청서 초안을 준비해 뒀어요.", action: "갱신 신청서 보기" },
  },
];

/* --- 내 할일: 업무 종류 구분 없이 한 목록 + AI 이유·준비물 --- */
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
  { id: "AP20260601-0007", type: "결재", title: "사후계약관리 표준 NDA 결재", status: "요청자 검토 중", action: "결재하기", daysLeft: 3, aiReason: "표준 NDA 와 조항 차이 없음", aiPrepared: "승인 의견 초안 준비" },
  { id: "L20260520-0003", type: "송무", title: "물품대금 청구 사건 준비서면 검토", status: "법무 검토 중", action: "기일 준비", daysLeft: 1, aiReason: "변론기일 대비", aiPrepared: "쟁점 3개 요약 준비" },
  { id: "S20260608-0002", type: "인감", title: "법인인감 사용 신청 — 공급계약 날인", status: "요청자 검토 중", action: "승인 검토", daysLeft: 2, aiReason: "연결된 계약 검토 완료 확인", aiPrepared: "날인 대상 문서 대조 완료" },
  { id: "IP20260415-0005", type: "지식재산", title: "상표 'LAWAI' 갱신 신청", status: "법무 검토 중", action: "갱신 신청", daysLeft: 12, aiReason: "갱신기한 30일 이내", aiPrepared: "갱신 신청서 초안 준비" },
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
