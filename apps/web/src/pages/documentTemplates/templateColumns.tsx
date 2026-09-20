import { Link } from "react-router-dom";
import type { ColumnDef } from "@lawkit/ui";
import type { TemplateSummaryDto } from "@lawai/contracts";
import { STANDARD_FORM_CATEGORIES } from "../../api/standardForms";

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  STANDARD_FORM_CATEGORIES.map((item) => [item.id, item.label]),
);

export const TEMPLATE_COLUMNS: ColumnDef<TemplateSummaryDto>[] = [
  {
    accessorKey: "name",
    header: "양식 이름",
    size: 280,
    cell: (info) => <Link to={`/document-templates/${info.row.original.id}`}>{info.row.original.name}</Link>,
  },
  {
    accessorKey: "categoryId",
    header: "분류",
    size: 120,
    cell: (info) => <span>{CATEGORY_LABEL[info.row.original.categoryId] ?? info.row.original.categoryId}</span>,
  },
  {
    accessorKey: "currentVersionNo",
    header: "현재 버전",
    size: 100,
    cell: (info) => <span>v{info.row.original.currentVersionNo}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: "마지막 수정",
    size: 130,
    cell: (info) => <span>{info.row.original.updatedAt.slice(0, 10)}</span>,
  },
  {
    accessorKey: "createdByName",
    header: "만든 사람",
    size: 130,
    cell: (info) => <span>{info.row.original.createdByName ?? "—"}</span>,
  },
];
