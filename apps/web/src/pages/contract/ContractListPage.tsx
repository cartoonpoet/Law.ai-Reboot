import { useNavigate } from "react-router-dom";
import {
  Icon,
  Button,
  Input,
  Dropdown,
  Switch,
  ChipsNavigation,
  DataTable,
  Pagination,
  PaginationCount,
} from "@lawkit/ui";
import type { ContractStatus } from "@lawai/contracts";
import { T } from "../../design/tokens";
import { Panel } from "../../components/ui/Panel";
import { LIST_FILTERS } from "./mock-data";
import { listColumns } from "./listColumns";
import { CONTRACT_STATUS_FILTERS, getStatusLabel } from "./contractStatus";
import { useContractsList } from "./hooks/useContractsList";
import { useContractCategories } from "./hooks/useContractCategories";
import { toOptions, type SelectOption } from "./contractOptions";
import { Eyebrow } from "../../components/ui/Eyebrow";
import * as listCss from "./contractList.css";

const ALL_OPTION: SelectOption = { value: "", label: "전체" };

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
    party,
    changeParty,
    categoryId,
    changeCategoryId,
    mine,
    changeMine,
    isFetching,
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
            계약서 검토 조회
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
          <Button
            size="medium"
            iconLeft={
              <Icon
                name="contractEdit"
                size="sm"
                style={{ width: 14, height: 14 }}
              />
            }
            onClick={() => navigate("/contract/request")}
          >
            검토 요청
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
        <Switch label="내 업무만" checked={mine} onCheckedChange={changeMine} />
      </div>

      <Panel flush>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 14px",
            borderBottom: `1px solid ${T.border}`,
            flexWrap: "wrap",
          }}
        >
          <ChipsNavigation
            allLabel="전체"
            value={status}
            onChange={handleStatusChange}
            items={CONTRACT_STATUS_FILTERS.map((s) => ({
              value: s,
              label: getStatusLabel(s),
            }))}
          />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: T.muted }}>
            총{" "}
            <b
              style={{
                color: T.heading,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {total}
            </b>
            건
          </span>
        </div>
        <div style={{ padding: 6 }}>
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
