import type { ColumnDef } from "@lawkit/ui";
import { Icon } from "@lawkit/ui";
import type { AdviceSummary } from "@lawai/contracts";
import { Badge } from "../../../components/ui/Badge";
import { Tag } from "../../../components/ui/Tag";
import { getDday } from "../../dashboard/dday";
import { ADVICE_STATUS_COLOR, ADVICE_STATUS_LABEL, REGION_LABEL } from "../adviceMeta";
import { getDaysLeft } from "../getDaysLeft";
import * as listCss from "../../contract/contractList.css";
import * as css from "./adviceList.css";

// 분류가 여러 개면 첫 번째만 보이고 나머지는 +N 으로 줄인다.
const CategoryCell = ({ categories }: { categories: string[] }) => (
  <div className={css.categoryCell}>
    {categories.slice(0, 1).map((name) => (
      <Tag key={name}>{name}</Tag>
    ))}
    {categories.length > 1 && <Tag>+{categories.length - 1}</Tag>}
  </div>
);

// 회신이 끝난 자문은 기한을 보여주지 않는다.
const DueCell = ({ advice, now }: { advice: AdviceSummary; now: Date }) => {
  const daysLeft = advice.status === "answered" || advice.status === "closed" ? null : getDaysLeft(advice.dueDate, now);
  if (daysLeft === null) return <span className={listCss.emptyCell}>-</span>;
  const view = getDday(daysLeft);
  return <span className={css.dday[view.tone]}>{view.label}</span>;
};

/** 자문 목록 컬럼 — 계약 목록과 같은 구성·셀 스타일. */
export const createAdviceListColumns = (now: Date): ColumnDef<AdviceSummary>[] => [
  {
    accessorKey: "code",
    header: "관리번호",
    size: 132,
    cell: (info) => <span className={css.codeCell}>{info.row.original.code}</span>,
  },
  {
    accessorKey: "title",
    header: "자문명",
    size: 300,
    cell: (info) => (
      <div className={css.titleCell}>
        {info.row.original.securityLevel !== "normal" && <Icon name="lock" size="sm" className={css.lockIcon} />}
        <span className={css.titleText}>{info.row.original.title}</span>
      </div>
    ),
  },
  {
    id: "categories",
    header: "자문분류",
    size: 130,
    cell: (info) => <CategoryCell categories={info.row.original.categories} />,
  },
  {
    accessorKey: "region",
    header: "지역",
    size: 72,
    cell: (info) => <span className={css.bodyText}>{REGION_LABEL[info.row.original.region]}</span>,
  },
  {
    id: "requester",
    header: "요청자",
    size: 128,
    cell: (info) => (
      <div>
        <div className={css.personName}>{info.row.original.requester.name ?? "-"}</div>
        <div className={css.personDept}>{info.row.original.requester.dept ?? ""}</div>
      </div>
    ),
  },
  {
    id: "owner",
    header: "담당",
    size: 100,
    cell: (info) =>
      info.row.original.owner ? (
        <span className={css.bodyText}>{info.row.original.owner.name ?? "-"}</span>
      ) : (
        <span className={css.unassigned}>미배정</span>
      ),
  },
  {
    id: "due",
    header: "회신 기한",
    size: 92,
    cell: (info) => <DueCell advice={info.row.original} now={now} />,
  },
  {
    accessorKey: "status",
    header: "상태",
    size: 104,
    cell: (info) => (
      <Badge color={ADVICE_STATUS_COLOR[info.row.original.status]} size="sm" dot>
        {ADVICE_STATUS_LABEL[info.row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "요청일",
    size: 100,
    cell: (info) => <span className={`${listCss.dateCell} ${css.dateText}`}>{info.row.original.createdAt.slice(0, 10)}</span>,
  },
];
