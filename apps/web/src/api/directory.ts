// 관계자·참조·결재자용 디렉터리 검색.
// 사용자/부서는 실 API(/users·/departments). 프로젝트는 아직 엔티티 미존재 → mock 유지(후속).
import type { PublicUser, DepartmentDto } from "@lawai/contracts";
import { apiFetch } from "./client";

export interface DirectoryEntry {
  id: string;
  name: string;
}

// "이름 (부서)" 표기 — 디렉터리 선택 시 부서까지 보이게.
const labelOf = (u: PublicUser): string =>
  u.departmentName ? `${u.name} (${u.departmentName})` : u.name;

export const searchUsers = async (
  query: string,
  limit = 10,
): Promise<DirectoryEntry[]> => {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const users = await apiFetch<PublicUser[]>(`/users?${params.toString()}`);
  return users.map((u) => ({ id: u.id, name: labelOf(u) }));
};

export const searchDepartments = async (
  query: string,
  limit = 10,
): Promise<DirectoryEntry[]> => {
  const all = await apiFetch<DepartmentDto[]>("/departments");
  const q = query.trim().toLowerCase();
  const matched = q
    ? all.filter((d) => d.name.toLowerCase().includes(q))
    : all;
  return matched.slice(0, limit).map((d) => ({ id: d.id, name: d.name }));
};

// 결재선 설정용 — 이름·부서가 분리된 인물 정보
export interface PersonRef {
  id: string;
  name: string;
  dept: string;
}

export const searchPeople = async (
  query: string,
  limit = 20,
): Promise<PersonRef[]> => {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const users = await apiFetch<PublicUser[]>(`/users?${params.toString()}`);
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    dept: u.departmentName ?? "",
  }));
};

// 프로젝트: Project 엔티티 미도입 → 임시 mock(후속에서 실 API로 교체).
const PROJECTS: DirectoryEntry[] = [
  { id: "p1", name: "차세대 플랫폼 구축" },
  { id: "p2", name: "데이터센터 이전" },
  { id: "p3", name: "AI 계약검토 고도화" },
  { id: "p4", name: "글로벌 결제 연동" },
  { id: "p5", name: "사내 보안 강화" },
];

export const searchProjects = (
  query: string,
  limit = 10,
): Promise<DirectoryEntry[]> => {
  const q = query.trim().toLowerCase();
  const matched = q
    ? PROJECTS.filter((p) => p.name.toLowerCase().includes(q))
    : PROJECTS;
  return Promise.resolve(matched.slice(0, limit));
};
