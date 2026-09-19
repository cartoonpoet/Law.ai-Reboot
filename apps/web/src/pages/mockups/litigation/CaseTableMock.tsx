import { useState } from "react";
import type { ColumnDef } from "@lawkit/ui";
import {
  Button,
  ButtonGroup,
  DataTable,
  DdayBadge,
  Dropdown,
  Icon,
  Input,
  Pagination,
  PaginationCount,
  Switch,
} from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { Panel } from "../../../components/ui/Panel";
import { LitigationMockHead } from "./LitigationMockHead";
import {
  MOCK_CASES,
  SIDE_LABEL,
  STAGE_LABEL,
  formatDate,
  formatMoney,
  type CaseStatusTypes,
  type MockCase,
} from "./litigationMockData";
import * as listCss from "../../contract/contractList.css";
import * as css from "./litigationMock.css";

const MY_NAME = "손준호";

const STATUS_COLOR: Record<CaseStatusTypes, "secondary" | "primary" | "warning" | "success"> = {
  준비: "secondary",
  진행: "primary",
  선고: "warning",
  종결: "success",
};

const STATUS_ORDER: CaseStatusTypes[] = ["준비", "진행", "선고", "종결"];

// 법원 필터 — 데이터에 있는 법원만 고른다.
const COURT_OPTIONS = [
  { value: "", label: "법원 전체" },
  ...[...new Set(MOCK_CASES.map((item) => item.courtName.split(" ")[0]))].map((name) => ({ value: name, label: name })),
];

const COLUMNS: ColumnDef<MockCase>[] = [
  {
    accessorKey: "caseNo",
    header: "사건번호",
    size: 128,
    cell: (info) => <span className={css.caseNo}>{info.row.original.caseNo}</span>,
  },
  {
    accessorKey: "name",
    header: "사건명",
    size: 240,
    cell: (info) => (
      <div className={css.cellStack}>
        <span className={css.caseNameLink}>{info.row.original.name}</span>
        <span className={css.meta}>{info.row.original.courtName}</span>
      </div>
    ),
  },
  {
    accessorKey: "side",
    header: "우리 지위",
    size: 84,
    cell: (info) => <span className={css.metaStrong}>{SIDE_LABEL[info.row.original.side]}</span>,
  },
  {
    accessorKey: "opponent",
    header: "상대방",
    size: 130,
    cell: (info) => <span className={css.metaStrong}>{info.row.original.opponent}</span>,
  },
  {
    accessorKey: "stage",
    header: "심급",
    size: 64,
    cell: (info) => <span className={css.metaStrong}>{STAGE_LABEL[info.row.original.stage]}</span>,
  },
  {
    accessorKey: "amount",
    header: "소가",
    size: 126,
    cell: (info) => <span className={css.money}>{formatMoney(info.row.original.amount)}</span>,
  },
  {
    accessorKey: "ownerName",
    header: "담당",
    size: 140,
    cell: (info) => (
      <div className={css.cellStack}>
        <span className={css.metaStrong}>{info.row.original.ownerName}</span>
        <span className={css.meta}>{info.row.original.firmName ?? "외부 선임 없음"}</span>
      </div>
    ),
  },
  {
    id: "nextHearing",
    header: "다음 기일",
    size: 200,
    cell: (info) => {
      const next = info.row.original.nextHearing;
      if (!next) return <span className={css.nextDateNone}>예정 없음</span>;
      return (
        <div className={css.cellStack}>
          <span className={css.cellRow}>
            <span className={css.dateText}>{formatDate(next.date)}</span>
            <DdayBadge date={next.date} />
          </span>
          <span className={css.meta}>
            {next.kind} · {next.time}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "진행상태",
    size: 96,
    cell: (info) => (
      <Badge color={STATUS_COLOR[info.row.original.status]} size="sm" dot>
        {info.row.original.status}
      </Badge>
    ),
  },
];

const pickSingle = (value: string | string[]): string => (Array.isArray(value) ? value[0] ?? "" : value);

/** A안 — 계약 조회와 같은 표. 한 화면에서 사건을 훑고 기일만 덧붙여 본다. */
export const CaseTableMock = () => {
  const [tab, setTab] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [court, setCourt] = useState("");
  const [isMine, setIsMine] = useState(false);
  const [page, setPage] = useState(1);

  const word = keyword.trim();
  const rows = MOCK_CASES.filter((item) => {
    if (tab !== "all" && item.status !== tab) return false;
    if (court && !item.courtName.startsWith(court)) return false;
    if (isMine && item.ownerName !== MY_NAME) return false;
    return word ? `${item.name}${item.caseNo}${item.opponent}`.includes(word) : true;
  });

  // 탭 라벨 옆 건수 — 지금 걸린 필터(법원·내 사건·검색) 기준으로 센다.
  const countByStatus = (status: CaseStatusTypes): number =>
    MOCK_CASES.filter((item) => {
      if (item.status !== status) return false;
      if (court && !item.courtName.startsWith(court)) return false;
      if (isMine && item.ownerName !== MY_NAME) return false;
      return word ? `${item.name}${item.caseNo}${item.opponent}`.includes(word) : true;
    }).length;

  const tabs = [
    { value: "all", label: `전체 ${STATUS_ORDER.reduce((sum, status) => sum + countByStatus(status), 0)}` },
    ...STATUS_ORDER.map((status) => ({ value: status, label: `${status} ${countByStatus(status)}` })),
  ];

  return (
    <div>
      <LitigationMockHead
        variant="A안 — 표형(계약 조회와 같은 구조)"
        description="계약 조회 화면과 같은 표에 송무에 필요한 칸(사건번호·법원·우리 지위·상대방·심급·소가·다음 기일)을 넣었습니다. 이미 쓰는 화면과 조작이 같아 익히는 데 시간이 안 듭니다."
        eyebrow="송무"
        title="사건 조회"
      >
        <Button>사건 등록</Button>
      </LitigationMockHead>

      <div className={css.filters}>
        <div className={css.filterSelect}>
          <Dropdown
            options={COURT_OPTIONS}
            value={court}
            placeholder="법원"
            onChange={(value) => setCourt(pickSingle(value))}
          />
        </div>
        <div className={css.search}>
          <Input
            inputSize="medium"
            placeholder="사건명·사건번호·상대방 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            leftIcon={<Icon name="search" size="sm" className={css.searchIcon} />}
          />
        </div>
        <Switch label="내 사건만" checked={isMine} onCheckedChange={setIsMine} />
      </div>

      <Panel flush>
        <div className={listCss.groupBar}>
          <ButtonGroup variant="segmented" items={tabs} value={tab} onChange={(next) => setTab(String(next))} />
          <div className={listCss.groupBarSpacer} />
          <span className={listCss.totalCount}>
            총 <b className={listCss.totalCountValue}>{rows.length}</b>건
          </span>
        </div>

        <div className={listCss.tableWrap}>
          <DataTable
            data={rows}
            columns={COLUMNS}
            getRowId={(item) => item.id}
            emptyText="조건에 맞는 사건이 없습니다."
          />
        </div>

        <div className={css.pager}>
          <PaginationCount totalCount={rows.length} />
          <Pagination page={page} totalPages={1} onPageChange={setPage} />
        </div>
      </Panel>
    </div>
  );
};
