import { useNavigate } from "react-router-dom";
import {
  Icon,
  Button,
  Input,
  Dropdown,
  Switch,
  ChipsNavigation,
  ButtonGroup,
  DataTable,
  Pagination,
  PaginationCount,
} from "@lawkit/ui";
import type { ContractStatus } from "@lawai/contracts";
import { T } from "../../design/tokens";
import { Panel } from "../../components/ui/Panel";
import { LIST_FILTERS } from "./mock-data";
import { listColumns } from "./listColumns";
import { getStatusLabel } from "./contractStatus";
import {
  STATUS_GROUP_LABEL,
  STATUS_GROUP_ORDER,
  getGroupStatuses,
  type StatusGroup,
} from "./statusGroups";
import type { ContractExpiryFilter } from "./hooks/useContractsList";
import { useContractsList } from "./hooks/useContractsList";
import { useContractCategories } from "./hooks/useContractCategories";
import { toOptions, type SelectOption } from "./contractOptions";
import { Eyebrow } from "../../components/ui/Eyebrow";
import * as listCss from "./contractList.css";

const ALL_OPTION: SelectOption = { value: "", label: "전체" };

const EXPIRY_OPTIONS: { value: ContractExpiryFilter; label: string }[] = [
  { value: "", label: "만료 전체" },
  { value: "d90", label: "90일 이내" },
  { value: "d180", label: "180일 이내" },
  { value: "expired", label: "만료됨" },
];

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={listCss.filterSelect}>
      <Dropdown
        options={[ALL_OPTION, ...options]}
        value={value}
        placeholder={label}
        onChange={(v) => onChange(Array.isArray(v) ? v[0] ?? "" : v)}
      />
    </div>
  );
}

export function ContractListPage() {
  const navigate = useNavigate();
  const {
    rows,
    total,
    totalPages,
    page,
    setPage,
    q,
    changeQ,
    status,
    changeStatus,
    group,
    changeGroup,
    expiry,
    changeExpiry,
    party,
    changeParty,
    categoryId,
    changeCategoryId,
    mine,
    changeMine,
    isFetching,
    getGroupCount,
  } = useContractsList();
  const { getFlatOptions } = useContractCategories();

  const categoryOptions = getFlatOptions();
  const partyOptions = toOptions(LIST_FILTERS.party.slice(1));

  const handleStatusChange = (value: string | string[]) => {
    const next = Array.isArray(value) ? value[0] ?? "" : value;
    changeStatus(next as ContractStatus | "");
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <Eyebrow style={{ marginBottom: 7 }}>계약</Eyebrow>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: T.heading,
              letterSpacing: "-0.025em",
            }}
          >
            계약 조회
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button
            variant="outline"
            color="secondary"
            size="medium"
            iconLeft={
              <Icon
                name="externalLink"
                size="sm"
                style={{ width: 14, height: 14 }}
              />
            }
          >
            내보내기
          </Button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <FilterSelect label="계약 당사자" options={partyOptions} value={party} onChange={changeParty} />
        <FilterSelect label="계약 분류" options={categoryOptions} value={categoryId} onChange={changeCategoryId} />
        <div style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
          <Input
            inputSize="medium"
            placeholder="계약명·관리번호·상대계약자 검색"
            value={q}
            onChange={(e) => changeQ(e.target.value)}
            leftIcon={
              <Icon
                name="search"
                size="sm"
                style={{ width: 15, height: 15, color: T.faint }}
              />
            }
          />
        </div>
        <div className={listCss.expirySelect}>
          <Dropdown
            options={EXPIRY_OPTIONS}
            value={expiry}
            placeholder="만료 전체"
            onChange={(v) =>
              changeExpiry((Array.isArray(v) ? v[0] ?? "" : v) as ContractExpiryFilter)
            }
          />
        </div>
        <Switch label="내 업무만" checked={mine} onCheckedChange={changeMine} />
      </div>

      <Panel flush>
        <div className={listCss.groupBar}>
          <ButtonGroup
            variant="segmented"
            items={STATUS_GROUP_ORDER.map((g) => {
              const count = getGroupCount(g);
              return { value: g, label: count === null ? STATUS_GROUP_LABEL[g] : `${STATUS_GROUP_LABEL[g]} ${count}` };
            })}
            value={group}
            onChange={(v) => changeGroup(v as StatusGroup)}
          />
          <div className={listCss.groupBarSpacer} />
          <span className={listCss.totalCount}>
            총 <b className={listCss.totalCountValue}>{total}</b>건
          </span>
        </div>
        {group !== "all" && (
          <div className={listCss.subbar}>
            <span className={listCss.subbarLabel}>세부 상태</span>
            <ChipsNavigation
              allLabel="전체"
              value={status}
              onChange={handleStatusChange}
              items={getGroupStatuses(group).map((s) => ({
                value: s,
                label: getStatusLabel(s),
              }))}
            />
          </div>
        )}
        <div className={listCss.tableWrap}>
          <DataTable
            data={rows}
            columns={listColumns()}
            getRowId={(r) => r.id}
            onRowClick={(r) => navigate(`/contract/${r.id}`)}
            emptyText={isFetching ? "불러오는 중…" : "조회된 계약이 없습니다."}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px 14px",
          }}
        >
          <PaginationCount totalCount={total} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Panel>
    </div>
  );
}
