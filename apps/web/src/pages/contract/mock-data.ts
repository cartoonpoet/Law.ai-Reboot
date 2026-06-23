export interface ContractRow {
  id: string;
  code?: string;
  name: string;
  party: string;
  sub: string;
  counter: string;
  requester: string;
  owner: string;
  updated: string;
  due: string;
  dleft: number;
  status: string;
  secure: boolean;
  star: boolean;
  mine: boolean;
}

export interface LifecycleStep {
  label: string;
  status: "completed" | "active" | "scheduled";
}

export interface Risk {
  level: "high" | "mid" | "low";
  clause: string;
  finding: string;
  suggest: string;
}

export interface ContractDetail {
  id: string;
  name: string;
  status: string;
  secure: boolean;
  stage: string;
  requester: string;
  owner: string;
  ownerDept: string | null;
  catPath: string[];
  period: string;
  type: string;
  files: { name: string; meta: string; kind: string }[];
  ccDept: string[];
  counter: string;
  lang: string;
  legalCat: string;
  negotiation: number;
  amount: { contract: string; vat: string; total: string };
  payTerms: string;
  purpose: string;
  notes: string;
}

export const CONTRACTS_FULL: ContractRow[] = [
  { id: "C20250710-0004", name: "한라산 EV 충전기 공급계약", party: "본사계약", sub: "용역", counter: "AAA", requester: "관리자1", owner: "김기찬", updated: "2026-06-09", due: "2026-06-11", dleft: 2, status: "법무 검토 중", secure: true, star: true, mine: true },
  { id: "A20260531-0011", name: "개인정보 위수탁 처리 자문", party: "본사계약", sub: "개인정보", counter: "정보보안팀", requester: "정보보안팀", owner: "이법무", updated: "2026-06-09", due: "2026-06-10", dleft: 1, status: "법무 검토 중", secure: false, star: true, mine: true },
  { id: "C20260609-0002", name: "[hkpark2] 통합검색 유지보수 계약", party: "법인계약", sub: "LOI/MOU", counter: "휴맥스 테스트 회사", requester: "박현경", owner: "미배정", updated: "2026-06-09", due: "2026-07-06", dleft: 27, status: "미배정", secure: true, star: false, mine: false },
  { id: "C20250902-0001", name: "한라산용역계약서", party: "법인계약", sub: "LOI/MOU", counter: "AAA", requester: "관리자1", owner: "김다함", updated: "2026-06-09", due: "2026-06-14", dleft: 5, status: "법무 검토 중", secure: false, star: false, mine: false },
  { id: "C20260601-0007", name: "사후계약관리 표준 NDA", party: "본사계약", sub: "LOI/MOU", counter: "(주)온테스트", requester: "이희규", owner: "이법무", updated: "2026-06-08", due: "2026-06-18", dleft: 9, status: "요청자 검토 중", secure: false, star: false, mine: false },
  { id: "C20250710-0010", name: "체크리스트 검수 위탁계약", party: "본사계약", sub: "위탁", counter: "(주)온테스트", requester: "김기찬", owner: "미배정", updated: "2026-06-09", due: "2026-06-20", dleft: 11, status: "배정 중", secure: true, star: false, mine: false },
  { id: "C20260605-0003", name: "옥외광고 매체 이용계약", party: "법인계약", sub: "용역", counter: "한빛미디어", requester: "한지민", owner: "박법무", updated: "2026-06-07", due: "2026-06-16", dleft: 7, status: "법무 검토 중", secure: false, star: false, mine: false },
  { id: "C20260602-0018", name: "통합검색 다운로드 로직 계약서", party: "법인계약", sub: "LOI/MOU", counter: "휴맥스 테스트 회사", requester: "박현경", owner: "박현경", updated: "2026-06-02", due: "2026-05-12", dleft: -28, status: "검토 완료", secure: false, star: false, mine: false },
  { id: "C20260519-0002", name: "솔루션 OEM 공급계약", party: "본사계약", sub: "공급", counter: "그린모빌리티", requester: "영업1팀", owner: "김기찬", updated: "2026-06-01", due: "2026-06-13", dleft: 4, status: "체결 진행", secure: false, star: true, mine: true },
  { id: "C20260528-0009", name: "공동연구 협약서 (산학)", party: "법인계약", sub: "협약", counter: "한국대학교 산학협력단", requester: "R&D센터", owner: "박법무", updated: "2026-05-29", due: "2026-06-17", dleft: 8, status: "요청자 검토 중", secure: true, star: false, mine: false },
];

export const LIST_FILTERS = {
  party: ["전체", "본사계약", "법인계약"],
  cat: ["전체", "개발/공급", "구매", "자문", "기타"],
  sub: ["전체", "용역", "도급", "공급", "위탁", "협약", "LOI/MOU", "개인정보"],
  status: ["전체", "임시 저장", "미배정", "배정 중", "법무 검토 중", "요청자 검토 중", "검토 완료", "체결 진행"],
};

export const LIFECYCLE: LifecycleStep[] = [
  { label: "임시 저장", status: "completed" }, { label: "검토 의뢰", status: "completed" },
  { label: "배정", status: "completed" }, { label: "법무 검토", status: "active" },
  { label: "요청자 검토", status: "scheduled" }, { label: "검토 완료", status: "scheduled" },
  { label: "체결 진행", status: "scheduled" }, { label: "체결 완료", status: "scheduled" },
  { label: "계약 이행", status: "scheduled" }, { label: "계약 종료", status: "scheduled" },
];

export const RISKS: Risk[] = [
  { level: "high", clause: "손해배상 한도", finding: "손해배상 상한 조항이 없습니다. 우리 측 무한책임 노출 가능성.", suggest: "계약금액의 100% 한도 조항 삽입 권장" },
  { level: "mid", clause: "지체상금", finding: "지체상금율 1일 0.3%로 표준(0.1%) 대비 3배 높습니다.", suggest: "0.1%로 조정 협의" },
  { level: "mid", clause: "자동 갱신", finding: "이의 없을 시 1년 자동 갱신. 갱신 거절 통지 기간이 짧습니다(30일).", suggest: "갱신 거절 통지 60일로 연장" },
  { level: "low", clause: "준거법·관할", finding: "관할 법원이 상대방 소재지 기준입니다.", suggest: "당사 소재지(서울중앙) 변경 검토" },
];

const SAMPLE_DETAIL: ContractDetail = {
  id: "C20250710-0004", name: "한라산 EV 충전기 공급계약", status: "법무 검토 중", secure: true, stage: "신규계약",
  requester: "관리자1", owner: "김기찬", ownerDept: "법무팀", catPath: ["본사계약", "개발/공급", "용역"],
  period: "2026-06-12 ~ 2027-06-11", type: "일반 검토요청",
  files: [
    { name: "(D013) 한라산EV_충전기_공급계약서_v2.0.docx", meta: "1.8 MB", kind: "계약서" },
    { name: "별첨1_물품명세_단가표.xlsx", meta: "248 KB", kind: "첨부" },
    { name: "사업제안_검토참고.pdf", meta: "3.1 MB", kind: "참고" },
  ],
  ccDept: ["개발팀", "운영팀", "인프라팀"], counter: "AAA (사업자 110-81-xxxxx)", lang: "국문", legalCat: "국내 법무",
  negotiation: 60,
  amount: { contract: "1,240,000,000 KRW", vat: "124,000,000 KRW", total: "1,364,000,000 KRW" },
  payTerms: "선급금 30% / 중도금 40% / 잔금 30%, 검수 완료 후 30일 이내 지급",
  purpose: "EV 충전 인프라 확충을 위한 충전기 하드웨어 공급 및 설치 용역 계약. 공급사 AAA로부터 급속/완속 충전기 일괄 공급받아 전국 12개 거점에 설치.",
  notes: "지체상금·하자보수 조항 및 손해배상 한도 협의 필요. 표준 공급계약 대비 검수 기준 강화 요청.",
};

export function getContractDetail(id: string): ContractDetail {
  const row = CONTRACTS_FULL.find((c) => c.id === id);
  if (!row) return SAMPLE_DETAIL;
  return {
    ...SAMPLE_DETAIL,
    id: row.id,
    name: row.name,
    status: row.status,
    secure: row.secure,
    requester: row.requester,
    owner: row.owner === "미배정" ? SAMPLE_DETAIL.owner : row.owner,
  };
}
