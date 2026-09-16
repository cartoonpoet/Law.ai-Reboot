import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminAuditListRequest } from "@lawai/contracts";
import { getAdminAudit } from "../../../api/admin";
import { listAdminTenants } from "../../../api/adminTenants";
import { toRangeIso } from "../auditLabels";

export const AUDIT_PAGE_SIZE = 20;

export interface AuditFilterTypes {
  tenantId: string;
  action: string;
  actorName: string;
  from: Date | null;
  to: Date | null;
}

const EMPTY_FILTER: AuditFilterTypes = {
  tenantId: "",
  action: "",
  actorName: "",
  from: null,
  to: null,
};

const toRequest = (filter: AuditFilterTypes, page: number): AdminAuditListRequest => ({
  limit: AUDIT_PAGE_SIZE,
  offset: (page - 1) * AUDIT_PAGE_SIZE,
  tenantId: filter.tenantId || undefined,
  action: filter.action || undefined,
  actorName: filter.actorName.trim() || undefined,
  from: toRangeIso(filter.from, "start"),
  to: toRangeIso(filter.to, "end"),
});

/**
 * 감사 로그 검색 — 조건과 페이지를 들고, 조건이 바뀌면 1페이지부터 다시 본다.
 * 이름 검색은 타이핑마다 부르지 않고 "검색"을 눌렀을 때만 조건에 반영한다.
 */
export const useAuditLogSearch = () => {
  const [filter, setFilter] = useState<AuditFilterTypes>(EMPTY_FILTER);
  const [actorNameDraft, setActorNameDraft] = useState("");
  const [page, setPage] = useState(1);

  const auditQuery = useQuery({
    queryKey: ["admin-audit", filter, page],
    queryFn: () => getAdminAudit(toRequest(filter, page)),
  });

  const tenantsQuery = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: listAdminTenants,
  });

  const tenantOptions = [
    { value: "", label: "회사 전체" },
    ...(tenantsQuery.data?.tenants ?? []).map((tenant) => ({
      value: tenant.id,
      label: tenant.name,
    })),
  ];

  // 조건을 바꾸면 보던 페이지 번호는 의미가 없어지므로 1페이지로 되돌린다.
  const changeFilter = (patch: Partial<AuditFilterTypes>) => {
    setFilter((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const handleSearchActorName = () => changeFilter({ actorName: actorNameDraft });

  const handleReset = () => {
    setActorNameDraft("");
    setFilter(EMPTY_FILTER);
    setPage(1);
  };

  const total = auditQuery.data?.total ?? 0;

  return {
    filter,
    changeFilter,
    actorNameDraft,
    setActorNameDraft,
    handleSearchActorName,
    handleReset,
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    total,
    tenantOptions,
    auditQuery,
  };
};
