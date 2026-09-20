import { Link } from "react-router-dom";
import { Button, Icon, type ColumnDef } from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { STANDARD_FORM_CATEGORIES } from "../../../api/standardForms";
import type { MockTemplate } from "./documentEditorMockData";
import * as css from "./documentEditorMock.css";

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  STANDARD_FORM_CATEGORIES.map((item) => [item.id, item.label]),
);

/** 목록 표의 칸 정의 — 이름·분류·현재 버전·조항 수·수정일·수정자·공개. */
export const TEMPLATE_COLUMNS: ColumnDef<MockTemplate>[] = [
  {
    accessorKey: "name",
    header: "양식 이름",
    size: 260,
    cell: (info) => (
      <div className={css.cellStack}>
        <Link to="/mockups/document-editor-canvas" className={css.tplName}>
          {info.row.original.name}
        </Link>
        <span className={css.meta}>조항 {info.row.original.clauseCount}개</span>
      </div>
    ),
  },
  {
    accessorKey: "categoryId",
    header: "분류",
    size: 118,
    cell: (info) => <span className={css.metaStrong}>{CATEGORY_LABEL[info.row.original.categoryId]}</span>,
  },
  {
    accessorKey: "versionNo",
    header: "현재 버전",
    size: 92,
    cell: (info) => <span className={css.verChip}>v{info.row.original.versionNo}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: "마지막 수정",
    size: 118,
    cell: (info) => <span className={css.dateText}>{info.row.original.updatedAt}</span>,
  },
  {
    accessorKey: "updatedBy",
    header: "수정한 사람",
    size: 130,
    cell: (info) => <span className={css.metaStrong}>{info.row.original.updatedBy}</span>,
  },
  {
    id: "isPublished",
    header: "계약 작성에 쓰기",
    size: 118,
    cell: (info) =>
      info.row.original.isPublished ? (
        <Badge color="success" size="sm" dot>
          쓸 수 있음
        </Badge>
      ) : (
        <Badge color="secondary" size="sm" dot>
          준비 중
        </Badge>
      ),
  },
  {
    /* 이름을 누르면 편집기로 들어가므로 "편집" 버튼은 두지 않는다(같은 동작 두 번 금지). */
    id: "actions",
    header: "",
    size: 104,
    cell: () => (
      <div className={css.rowActions}>
        <Button
          size="small"
          variant="outline"
          color="secondary"
          iconLeft={<Icon name="history" size="sm" />}
          onClick={() => undefined}
        >
          버전 이력
        </Button>
      </div>
    ),
  },
];
