import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  ButtonGroup,
  ChipsNavigation,
  DataTable,
  Dropdown,
  Icon,
  Input,
  Pagination,
  PaginationCount,
  Switch,
} from "@lawkit/ui";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { Panel } from "../../../components/ui/Panel";
import { T } from "../../../design/tokens";
import { adviceListColumns } from "./adviceListColumns";
import {
  ADVICE_GROUPS,
  ADVICE_ROWS,
  ADVICE_STATUS_LABEL,
  type AdviceRow,
  type AdviceStatusTypes,
} from "./advice-mock-data";
import * as listCss from "../../contract/contractList.css";

const CATEGORY_OPTIONS = [
  { value: "", label: "자문분류 전체" },
  { value: "계약해석", label: "계약해석" },
  { value: "개인정보", label: "개인정보" },
  { value: "인사/노무", label: "인사/노무" },
  { value: "지식재산권", label: "지식재산권" },
  { value: "공정거래", label: "공정거래" },
  { value: "세법", label: "세법" },
];

const OWNER_OPTIONS = [
  { value: "", label: "담당 전체" },
  { value: "박변호사", label: "박변호사" },
  { value: "이변호사", label: "이변호사" },
  { value: "최변호사", label: "최변호사" },
];

const DUE_OPTIONS = [
  { value: "", label: "기한 전체" },
  { value: "d3", label: "3일 이내" },
  { value: "d7", label: "7일 이내" },
  { value: "over", label: "기한 지남" },
];

// 그룹(1단) → 세부 상태(2단). 계약 목록의 statusGroups 와 같은 방식.
const GROUP_STATUSES: Record<string, AdviceStatusTypes[]> = {
  all: [],
  received: ["received"],
  reviewing: ["reviewing"],
  answered: ["answered"],
  closed: ["closed"],
};

const pickSingle = (v: string | string[]) => (Array.isArray(v) ? v[0] ?? "" : v);

const matchesDue = (row: AdviceRow, due: string) => {
  if (!due) return true;
  if (row.daysLeft === null) return false;
  if (due === "d3") return row.daysLeft >= 0 && row.daysLeft <= 3;
  if (due === "d7") return row.daysLeft >= 0 && row.daysLeft <= 7;
  return row.daysLeft < 0;
};

/** 법률자문 조회 시안 — 계약 조회 화면과 같은 부품·배치. */
export function AdviceListMock() {
  const navigate = useNavigate();
  const [group, setGroup] = useState<string>("all");
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);

  // 파생값은 렌더 중 계산(useMemo 미사용 — 프로젝트 규칙).
  const groupStatuses = GROUP_STATUSES[group] ?? [];
  const rows = ADVICE_ROWS.filter((row) => {
    if (groupStatuses.length > 0 && !groupStatuses.includes(row.status)) return false;
    if (status && row.status !== status) return false;
    if (category && row.category !== category) return false;
    if (owner && row.ownerName !== owner) return false;
    if (!matchesDue(row, due)) return false;
    if (mine && row.ownerName !== "박변호사") return false;
    const keyword = q.trim();
    if (keyword && !`${row.title} ${row.code} ${row.requesterName}`.includes(keyword)) return false;
    return true;
  });

  // 조건이 바뀌면 보던 페이지 번호는 의미가 없어지므로 1페이지로 되돌린다.
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <Eyebrow style={{ marginBottom: 7 }}>법무 업무</Eyebrow>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.heading, letterSpacing: "-0.025em" }}>
            법률자문
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button variant="outline" color="secondary" size="medium"
            iconLeft={<Icon name="externalLink" size="sm" style={{ width: 14, height: 14 }} />}>
            내보내기
          </Button>
          <Button size="medium"
            iconLeft={<Icon name="contractEdit" size="sm" style={{ width: 14, height: 14 }} />}
            onClick={() => navigate("/mockups/advice-request")}>
            자문 요청
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div className={listCss.filterSelect}>
          <Dropdown options={CATEGORY_OPTIONS} value={category} placeholder="자문분류"
            onChange={(v) => changeFilter(() => setCategory(pickSingle(v)))} />
        </div>
        <div className={listCss.filterSelect}>
          <Dropdown options={OWNER_OPTIONS} value={owner} placeholder="담당자"
            onChange={(v) => changeFilter(() => setOwner(pickSingle(v)))} />
        </div>
        <div style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
          <Input
            inputSize="medium"
            placeholder="자문명·관리번호·요청자 검색"
            value={q}
            onChange={(e) => changeFilter(() => setQ(e.target.value))}
            leftIcon={<Icon name="search" size="sm" style={{ width: 15, height: 15, color: T.faint }} />}
          />
        </div>
        <div className={listCss.expirySelect}>
          <Dropdown options={DUE_OPTIONS} value={due} placeholder="기한 전체"
            onChange={(v) => changeFilter(() => setDue(pickSingle(v)))} />
        </div>
        <Switch label="내 업무만" checked={mine} onCheckedChange={(v) => changeFilter(() => setMine(v))} />
      </div>

      <Panel flush>
        <div className={listCss.groupBar}>
          <ButtonGroup
            variant="segmented"
            items={ADVICE_GROUPS.map((g) => ({ value: g.value, label: g.label }))}
            value={group}
            onChange={(v) => changeFilter(() => { setGroup(String(v)); setStatus(""); })}
          />
          <div className={listCss.groupBarSpacer} />
          <span className={listCss.totalCount}>
            총 <b className={listCss.totalCountValue}>{rows.length}</b>건
          </span>
        </div>

        {group !== "all" && (
          <div className={listCss.subbar}>
            <span className={listCss.subbarLabel}>세부 상태</span>
            <ChipsNavigation
              allLabel="전체"
              value={status}
              onChange={(v) => changeFilter(() => setStatus(pickSingle(v)))}
              items={groupStatuses.map((s) => ({ value: s, label: ADVICE_STATUS_LABEL[s] }))}
            />
          </div>
        )}

        <div className={listCss.tableWrap}>
          <DataTable
            data={rows}
            columns={adviceListColumns()}
            getRowId={(row) => row.id}
            onRowClick={() => navigate("/mockups/advice-detail")}
            emptyText="조회된 자문이 없습니다."
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 14px" }}>
          <PaginationCount totalCount={rows.length} />
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(rows.length / 20))} onPageChange={setPage} />
        </div>
      </Panel>
    </div>
  );
}
