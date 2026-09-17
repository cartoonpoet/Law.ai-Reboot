import type { ColumnDef } from "@lawkit/ui";
import { Avatar } from "@lawkit/ui";
import { AiInsightNote } from "../../components/ai/AiInsightNote";
import type { AiInsight } from "../../components/ai/summarizeAiAnalysis";
import { getAiTargetKey } from "../../components/ai/useAiInsights";
import { Badge } from "../../components/ui/Badge";
import { Tag } from "../../components/ui/Tag";
import type { InboxRow } from "./toInboxRow";
import * as css from "./approvalInbox.css";

export type InboxTabTypes = "pending" | "upcoming" | "processed";

const RESULT_COLOR: Record<InboxRow["myStatus"], "success" | "danger" | "secondary"> = {
  approved: "success",
  rejected: "danger",
  pending: "secondary",
};

const DocCell = ({ row, insight }: { row: InboxRow; insight: AiInsight | null }) => (
  <div className={css.doc}>
    <span className={row.href ? css.docTitle : css.docTitleDeleted}>{row.title}</span>
    <span className={css.docMeta}>{row.docMeta}</span>
    {insight && <AiInsightNote insight={insight} />}
  </div>
);

const SubmitterCell = ({ row }: { row: InboxRow }) => (
  <div className={css.person}>
    <Avatar size="sm" color="primary" initials={row.submittedByName[0]} />
    <div>
      <div className={css.personName}>{row.submittedByName}</div>
      <div className={css.personDept}>{row.submittedByDept}</div>
    </div>
  </div>
);

/** 결재 대기함 표 — 처리 전(내 차례·예정)은 내 단계와 경과, 처리한 결재는 결과와 처리일. */
export const createInboxColumns = (
  tab: InboxTabTypes,
  insights: Record<string, AiInsight | null>,
): ColumnDef<InboxRow>[] => {
  const isProcessed = tab === "processed";
  return [
    {
      id: "doc",
      header: "문서",
      size: 340,
      cell: (info) => {
        const { aiTarget } = info.row.original;
        const insight = !isProcessed && aiTarget ? (insights[getAiTargetKey(aiTarget)] ?? null) : null;
        return <DocCell row={info.row.original} insight={insight} />;
      },
    },
    {
      id: "kind",
      header: "결재 유형",
      size: 110,
      cell: (info) => <Tag>{info.row.original.kindLabel}</Tag>,
    },
    {
      id: "submitter",
      header: "상신자",
      size: 150,
      cell: (info) => <SubmitterCell row={info.row.original} />,
    },
    isProcessed
      ? {
          id: "result",
          header: "처리 결과",
          size: 100,
          cell: (info) => (
            <Badge color={RESULT_COLOR[info.row.original.myStatus]} size="sm" dot>
              {info.row.original.myStatusLabel}
            </Badge>
          ),
        }
      : {
          id: "step",
          header: "내 단계",
          size: 110,
          cell: (info) => (
            <span className={css.step}>
              <span className={css.stepPos}>
                {info.row.original.stepNumber}
                <span className={css.stepTotal}>/{info.row.original.totalSteps}</span>
              </span>
              <Tag color={info.row.original.isAgree ? "info" : "neutral"}>{info.row.original.roleLabel}</Tag>
            </span>
          ),
        },
    {
      id: "submittedAt",
      header: "상신일",
      size: 80,
      cell: (info) => <span className={css.dateText}>{info.row.original.submittedAtLabel}</span>,
    },
    isProcessed
      ? {
          id: "decidedAt",
          header: "처리일",
          size: 80,
          cell: (info) => <span className={css.dateText}>{info.row.original.myDecidedAtLabel ?? "-"}</span>,
        }
      : {
          id: "elapsed",
          header: "경과",
          size: 80,
          cell: (info) => (
            <span className={css.elapsed[info.row.original.elapsedTone]}>{info.row.original.elapsedLabel}</span>
          ),
        },
  ];
};
