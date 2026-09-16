// 법률자문 시안용 표시 데이터. 실제 API 가 붙기 전까지 화면 확인 용도로만 쓴다.

export type AdviceStatusTypes = "received" | "reviewing" | "answered" | "closed";

export const ADVICE_STATUS_LABEL: Record<AdviceStatusTypes, string> = {
  received: "접수",
  reviewing: "검토 중",
  answered: "회신 완료",
  closed: "종결",
};

// 상태 → 배지 색(계약 상태와 체계가 달라 자문 전용으로 둔다).
export const ADVICE_STATUS_COLOR: Record<AdviceStatusTypes, "secondary" | "primary" | "success" | "info"> = {
  received: "secondary",
  reviewing: "primary",
  answered: "success",
  closed: "info",
};

/** 1단 그룹 — 라이프사이클 단계. 계약 목록의 그룹 세그먼트와 같은 방식. */
export const ADVICE_GROUPS = [
  { value: "all", label: "전체" },
  { value: "received", label: "접수" },
  { value: "reviewing", label: "검토" },
  { value: "answered", label: "회신" },
  { value: "closed", label: "종결" },
] as const;

export interface AdviceRow {
  id: string;
  code: string;
  title: string;
  category: string;
  region: string;
  requesterName: string;
  requesterDept: string;
  ownerName: string | null;
  status: AdviceStatusTypes;
  secure: boolean;
  /** 회신 기한까지 남은 일수(음수면 지남). 회신 완료·종결은 null. */
  daysLeft: number | null;
  requestedAt: string;
  answeredAt: string | null;
}

export const ADVICE_ROWS: AdviceRow[] = [
  {
    id: "a1",
    code: "ADV-2026-0091",
    title: "해외 대리점 계약 준거법 문의",
    category: "계약해석",
    region: "해외",
    requesterName: "김수현",
    requesterDept: "영업1팀",
    ownerName: "박변호사",
    status: "reviewing",
    secure: true,
    daysLeft: 2,
    requestedAt: "2026-09-14",
    answeredAt: null,
  },
  {
    id: "a2",
    code: "ADV-2026-0090",
    title: "개인정보 처리 위탁 동의 범위",
    category: "개인정보",
    region: "국내",
    requesterName: "정보람",
    requesterDept: "정보보호팀",
    ownerName: "이변호사",
    status: "received",
    secure: false,
    daysLeft: 6,
    requestedAt: "2026-09-15",
    answeredAt: null,
  },
  {
    id: "a3",
    code: "ADV-2026-0088",
    title: "경업금지 약정 유효성 검토",
    category: "인사/노무",
    region: "국내",
    requesterName: "한지민",
    requesterDept: "인사팀",
    ownerName: "박변호사",
    status: "answered",
    secure: false,
    daysLeft: null,
    requestedAt: "2026-09-05",
    answeredAt: "2026-09-10",
  },
  {
    id: "a4",
    code: "ADV-2026-0085",
    title: "공동연구 성과물 지식재산 귀속",
    category: "지식재산권",
    region: "국내외",
    requesterName: "이수진",
    requesterDept: "연구기획팀",
    ownerName: "최변호사",
    status: "reviewing",
    secure: true,
    daysLeft: -1,
    requestedAt: "2026-09-08",
    answeredAt: null,
  },
  {
    id: "a5",
    code: "ADV-2026-0081",
    title: "하도급 대금 지급 기한 위반 여부",
    category: "공정거래",
    region: "국내",
    requesterName: "박현우",
    requesterDept: "구매팀",
    ownerName: null,
    status: "received",
    secure: false,
    daysLeft: 9,
    requestedAt: "2026-09-16",
    answeredAt: null,
  },
  {
    id: "a6",
    code: "ADV-2026-0074",
    title: "미국 자회사 배당 관련 세무 검토",
    category: "세법",
    region: "해외",
    requesterName: "송민호",
    requesterDept: "재무팀",
    ownerName: "이변호사",
    status: "closed",
    secure: false,
    daysLeft: null,
    requestedAt: "2026-08-20",
    answeredAt: "2026-08-28",
  },
];
