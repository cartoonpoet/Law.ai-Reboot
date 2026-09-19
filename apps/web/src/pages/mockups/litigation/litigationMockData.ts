/* 송무 시안용 가짜 데이터 — 실제 사건처럼 보이도록 법원·사건번호·기일을 맞춰 두었다. */

export type CaseSideTypes = "plaintiff" | "defendant";
export type CaseStageTypes = "first" | "appeal" | "final";
export type CaseStatusTypes = "준비" | "진행" | "선고" | "종결";

export interface MockHearing {
  id: string;
  caseId: string;
  caseName: string;
  courtName: string;
  /** 2026-09-24 */
  date: string;
  /** 14:00 */
  time: string;
  /** 제3호 법정 */
  place: string;
  kind: string;
  /** 우리 쪽에서 나가는 사람 */
  attendee: string;
  note: string;
}

export interface MockCase {
  id: string;
  caseNo: string;
  name: string;
  courtName: string;
  side: CaseSideTypes;
  opponent: string;
  stage: CaseStageTypes;
  status: CaseStatusTypes;
  /** 소가(원) */
  amount: number;
  ownerName: string;
  ownerDept: string;
  firmName: string | null;
  filedAt: string;
  updatedAt: string;
  nextHearing: MockHearing | null;
  /** 아직 안 낸 서면이 있으면 채운다 */
  todo: string | null;
  aiLine: string;
}

export const SIDE_LABEL: Record<CaseSideTypes, string> = {
  plaintiff: "원고",
  defendant: "피고",
};

export const STAGE_LABEL: Record<CaseStageTypes, string> = {
  first: "1심",
  appeal: "2심",
  final: "3심",
};

export const STATUS_LABEL: Record<CaseStatusTypes, string> = {
  준비: "준비",
  진행: "진행",
  선고: "선고",
  종결: "종결",
};

const hearing = (h: MockHearing): MockHearing => h;

export const MOCK_CASES: MockCase[] = [
  {
    id: "case-1",
    caseNo: "2026가합112233",
    name: "물품대금 청구의 소",
    courtName: "서울중앙지방법원 제14민사부",
    side: "plaintiff",
    opponent: "오피스플러스",
    stage: "first",
    status: "진행",
    amount: 340_000_000,
    ownerName: "손준호",
    ownerDept: "법무팀",
    firmName: "법무법인 세림",
    filedAt: "2026-04-02",
    updatedAt: "2026-09-17",
    todo: "준비서면(2) — 9. 22. 까지",
    aiLine: "상대방 답변서가 소멸시효를 다툽니다. 세금계산서 발행일 기준 기산점 정리가 필요합니다.",
    nextHearing: hearing({
      id: "h-1",
      caseId: "case-1",
      caseName: "물품대금 청구의 소",
      courtName: "서울중앙지방법원",
      date: "2026-09-24",
      time: "14:00",
      place: "제458호 법정",
      kind: "2차 변론기일",
      attendee: "손준호 · 세림 김변호사",
      note: "증인신문 여부 정리",
    }),
  },
  {
    id: "case-2",
    caseNo: "2026가단554411",
    name: "손해배상(기) 청구의 소",
    courtName: "수원지방법원 성남지원",
    side: "defendant",
    opponent: "크리에이티브랩",
    stage: "first",
    status: "준비",
    amount: 82_000_000,
    ownerName: "김수현",
    ownerDept: "법무팀",
    firmName: null,
    filedAt: "2026-08-28",
    updatedAt: "2026-09-18",
    todo: "답변서 — 9. 21. 까지",
    aiLine: "송달일로부터 30일이 9. 27. 에 끝납니다. 답변서 제출 기한이 가장 급합니다.",
    nextHearing: hearing({
      id: "h-2",
      caseId: "case-2",
      caseName: "손해배상(기) 청구의 소",
      courtName: "수원지방법원 성남지원",
      date: "2026-09-21",
      time: "10:30",
      place: "제312호 법정",
      kind: "변론준비기일",
      attendee: "김수현",
      note: "답변서 제출 후 참석",
    }),
  },
  {
    id: "case-3",
    caseNo: "2025나889977",
    name: "공동연구 성과물 귀속 확인",
    courtName: "서울고등법원 제5민사부",
    side: "defendant",
    opponent: "한국과학기술원",
    stage: "appeal",
    status: "진행",
    amount: 1_200_000_000,
    ownerName: "손준호",
    ownerDept: "법무팀",
    firmName: "법무법인 태산",
    filedAt: "2025-11-14",
    updatedAt: "2026-09-12",
    todo: null,
    aiLine: "1심에서 진 쟁점은 기여도 산정입니다. 항소심 감정 신청 결과가 다음 기일 전에 나옵니다.",
    nextHearing: hearing({
      id: "h-3",
      caseId: "case-3",
      caseName: "공동연구 성과물 귀속 확인",
      courtName: "서울고등법원",
      date: "2026-10-08",
      time: "15:00",
      place: "제302호 법정",
      kind: "3차 변론기일",
      attendee: "손준호 · 태산 이변호사",
      note: "감정 결과 진술",
    }),
  },
  {
    id: "case-4",
    caseNo: "2026가합330099",
    name: "상표권 침해금지 청구의 소",
    courtName: "서울중앙지방법원 제63민사부",
    side: "plaintiff",
    opponent: "넥스트바이오",
    stage: "first",
    status: "선고",
    amount: 500_000_000,
    ownerName: "정민규",
    ownerDept: "법무팀",
    firmName: "법무법인 세림",
    filedAt: "2026-01-09",
    updatedAt: "2026-09-15",
    todo: null,
    aiLine: "변론이 끝났습니다. 선고 결과에 따라 항소 기간(2주)이 바로 시작됩니다.",
    nextHearing: hearing({
      id: "h-4",
      caseId: "case-4",
      caseName: "상표권 침해금지 청구의 소",
      courtName: "서울중앙지방법원",
      date: "2026-09-30",
      time: "09:50",
      place: "제557호 법정",
      kind: "선고기일",
      attendee: "정민규",
      note: "선고 후 즉시 보고",
    }),
  },
  {
    id: "case-5",
    caseNo: "2024가합771100",
    name: "부당이득금 반환 청구의 소",
    courtName: "서울중앙지방법원 제31민사부",
    side: "defendant",
    opponent: "대성빌딩관리",
    stage: "first",
    status: "종결",
    amount: 96_000_000,
    ownerName: "손준호",
    ownerDept: "법무팀",
    firmName: null,
    filedAt: "2024-06-20",
    updatedAt: "2026-07-30",
    todo: null,
    aiLine: "조정으로 끝났습니다. 조정조서에 적힌 분담금 납부일이 지켜졌는지만 확인하면 됩니다.",
    nextHearing: null,
  },
];

export const MOCK_HEARINGS: MockHearing[] = [
  ...MOCK_CASES.map((c) => c.nextHearing).filter((h): h is MockHearing => h !== null),
  hearing({
    id: "h-5",
    caseId: "case-1",
    caseName: "물품대금 청구의 소",
    courtName: "서울중앙지방법원",
    date: "2026-09-22",
    time: "18:00",
    place: "-",
    kind: "준비서면 제출기한",
    attendee: "손준호",
    note: "세림 초안 검토 후 제출",
  }),
  hearing({
    id: "h-6",
    caseId: "case-3",
    caseName: "공동연구 성과물 귀속 확인",
    courtName: "서울고등법원",
    date: "2026-09-25",
    time: "17:00",
    place: "-",
    kind: "감정료 납부기한",
    attendee: "태산 이변호사",
    note: "1,800만원 · 회계팀 기안 완료",
  }),
  hearing({
    id: "h-7",
    caseId: "case-2",
    caseName: "손해배상(기) 청구의 소",
    courtName: "수원지방법원 성남지원",
    date: "2026-10-19",
    time: "10:30",
    place: "제312호 법정",
    kind: "1차 변론기일",
    attendee: "김수현",
    note: "",
  }),
];

/** 상태별 건수 — 목록 탭에 붙는다. */
export const STATUS_COUNTS = MOCK_CASES.reduce<Record<string, number>>((acc, item) => {
  acc[item.status] = (acc[item.status] ?? 0) + 1;
  return acc;
}, {});

export const formatMoney = (won: number): string => `${won.toLocaleString("ko-KR")}원`;

export const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split("-");
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date(iso).getDay()];
  return `${year}. ${Number(month)}. ${Number(day)}.(${weekday})`;
};

export const formatShortDate = (iso: string): string => {
  const [, month, day] = iso.split("-");
  return `${Number(month)}. ${Number(day)}.`;
};

/* ── 로아이(AI 도우미) 사건 정리 — 시안용 가짜 결과. 구조는 자문 AI 카드와 같다. ── */

export interface MockCaseIssue {
  title: string;
  basis: string;
}

export interface MockCaseBrief {
  summary: string;
  issues: MockCaseIssue[];
  checkPoints: string[];
}

export const MOCK_CASE_BRIEF: MockCaseBrief = {
  summary:
    "우리가 낸 물품대금 3억 4천만원 사건입니다. 상대방은 돈을 안 냈다는 사실은 크게 다투지 않고, 시효가 지났다는 점과 물건에 하자가 있었다는 점으로 맞서고 있습니다. 9. 24. 2차 변론기일 전에 준비서면(2)로 시효 기산점을 정리하는 것이 가장 급합니다.",
  issues: [
    {
      title: "물품대금 채권의 소멸시효(3년)가 지났는지",
      basis: "민법 제163조 제6호 · 마지막 세금계산서 발행일 2023. 5. 31., 소 제기일 2026. 4. 2.",
    },
    {
      title: "납품한 물건에 하자가 있었는지",
      basis: "상대방 답변서 4쪽 · 2023. 3. 하자 통지 메일을 증거로 냄",
    },
    {
      title: "일부 변제로 시효가 새로 시작됐는지",
      basis: "2024. 1. 12. 입금 8,000만원 · 채무 승인으로 볼 수 있는지가 쟁점",
    },
  ],
  checkPoints: [
    "2024. 1. 12. 입금이 어느 거래분에 대한 것인지 거래명세서로 특정해 주세요.",
    "하자 통지 메일에 대한 우리 회신이 있었다면 원본을 보내 주세요.",
    "세림 담당 변호사가 준비서면(2) 초안을 9. 22. 전에 보낼 수 있는지 확인이 필요합니다.",
  ],
};
