export type RiskLevel = "high" | "mid";

export interface PrecheckRisk {
  level: RiskLevel;
  clause: string;
  finding: string;
}

export interface PrecheckResult {
  analyzed: boolean;
  highCount: number;
  risks: PrecheckRisk[];
}

const MOCK_RISKS: PrecheckRisk[] = [
  { level: "high", clause: "손해배상 한도 (제12조)", finding: "배상 한도 누락 — 무제한 해석 여지." },
  { level: "mid", clause: "계약 해지 (제15조)", finding: "해지 통보 7일 — 대응 시간 부족 가능." },
];

/** 계약서 첨부 여부에 따라 mock 사전점검 결과를 반환한다. */
export function getPrecheck(hasContractFile: boolean): PrecheckResult {
  if (!hasContractFile) return { analyzed: false, highCount: 0, risks: [] };
  return { analyzed: true, highCount: MOCK_RISKS.filter((r) => r.level === "high").length, risks: MOCK_RISKS };
}
