// 관계자·참조용 디렉터리 검색 (사용자/부서/프로젝트).
// 현재는 mock — 실 엔드포인트(/users, /departments, /projects)가 생기면
// 각 search* 내부만 apiFetch 호출로 교체하면 된다(시그니처·반환 타입 동일).

export interface DirectoryEntry {
  id: string;
  name: string;
}

const USERS: DirectoryEntry[] = [
  { id: "jhson1", name: "손준호 (개발팀)" },
  { id: "lee", name: "이법무 (법무팀)" },
  { id: "kim", name: "김검토 (법무팀)" },
  { id: "park", name: "박담당 (구매팀)" },
  { id: "choi", name: "최영업 (영업팀)" },
  { id: "jung", name: "정인사 (인사팀)" },
  { id: "yoon", name: "윤재무 (재무팀)" },
  { id: "han", name: "한기획 (전략기획팀)" },
];

const DEPARTMENTS: DirectoryEntry[] = [
  { id: "dev", name: "개발팀" },
  { id: "ops", name: "운영팀" },
  { id: "infra", name: "인프라팀" },
  { id: "legal", name: "법무팀" },
  { id: "purchase", name: "구매팀" },
  { id: "sales", name: "영업팀" },
  { id: "hr", name: "인사팀" },
  { id: "finance", name: "재무팀" },
];

const PROJECTS: DirectoryEntry[] = [
  { id: "p1", name: "차세대 플랫폼 구축" },
  { id: "p2", name: "데이터센터 이전" },
  { id: "p3", name: "AI 계약검토 고도화" },
  { id: "p4", name: "글로벌 결제 연동" },
  { id: "p5", name: "사내 보안 강화" },
];

const SEARCH_DELAY_MS = 120;

/** name에 query가 포함되는 항목을 limit개까지 반환(대소문자 무시). 가짜 지연 포함. */
const filterEntries = (source: DirectoryEntry[], query: string, limit: number): Promise<DirectoryEntry[]> => {
  const q = query.trim().toLowerCase();
  const matched = q
    ? source.filter((e) => e.name.toLowerCase().includes(q)).slice(0, limit)
    : source.slice(0, limit);
  return new Promise((resolve) => setTimeout(() => resolve(matched), SEARCH_DELAY_MS));
};

export const searchUsers = (query: string, limit = 10): Promise<DirectoryEntry[]> =>
  filterEntries(USERS, query, limit);

export const searchDepartments = (query: string, limit = 10): Promise<DirectoryEntry[]> =>
  filterEntries(DEPARTMENTS, query, limit);

export const searchProjects = (query: string, limit = 10): Promise<DirectoryEntry[]> =>
  filterEntries(PROJECTS, query, limit);
