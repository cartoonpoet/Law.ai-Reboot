import { useState } from "react";
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
import { T } from "../../design/tokens";
import { Panel } from "../../components/ui/Panel";
import { CONTRACTS_FULL, LIST_FILTERS } from "./mock-data";
import { listColumns } from "./listColumns";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.faint,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        marginBottom: 7,
      }}
    >
      {children}
    </div>
  );
}

function FilterSelect({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <div style={{ width: 150 }}>
      <Dropdown
        options={options.map((o) => ({ value: o, label: o }))}
        value={options[0]}
        placeholder={label}
        onChange={() => {}}
      />
    </div>
  );
}

export function ContractListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | string[]>("");
  const [mine, setMine] = useState(false);
  const matchesStatus = (c: { status: string }) => {
    if (!status || status.length === 0) return true;
    return Array.isArray(status) ? status.includes(c.status) : c.status === status;
  };
  const data = CONTRACTS_FULL.filter((c) => matchesStatus(c) && (!mine || c.mine));

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
          <Eyebrow>계약</Eyebrow>
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
        <FilterSelect label="계약 당사자" options={LIST_FILTERS.party} />
        <FilterSelect label="계약 대분류" options={LIST_FILTERS.cat} />
        <FilterSelect label="계약 분류" options={LIST_FILTERS.sub} />
        <div style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
          <Input
            inputSize="medium"
            placeholder="계약명·관리번호·상대계약자·요청자 검색"
            leftIcon={
              <Icon
                name="search"
                size="sm"
                style={{ width: 15, height: 15, color: T.faint }}
              />
            }
          />
        </div>
        <Switch label="내 업무만" checked={mine} onCheckedChange={setMine} />
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
            onChange={setStatus}
            items={[
              { value: "미배정", label: "미배정" },
              { value: "법무 검토 중", label: "법무 검토 중" },
              { value: "요청자 검토 중", label: "요청자 검토 중" },
              { value: "검토 완료", label: "검토 완료" },
            ]}
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
              {data.length}
            </b>
            건
          </span>
        </div>
        <div style={{ padding: 6 }}>
          <DataTable
            data={data}
            columns={listColumns()}
            getRowId={(r) => r.id}
            onRowClick={(r) => navigate(`/contract/${r.id}`)}
            emptyText="조회된 계약이 없습니다."
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
          <PaginationCount totalCount={data.length} />
          <Pagination page={1} totalPages={1} onPageChange={() => {}} />
        </div>
      </Panel>
    </div>
  );
}
