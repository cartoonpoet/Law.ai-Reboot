import { Button, Card, Checkbox, HStack, VStack } from "@lawkit/ui";
import { AiInsightNote } from "../../components/ai/AiInsightNote";
import type { AiInsight } from "../../components/ai/summarizeAiAnalysis";
import { Badge } from "../../components/ui/Badge";
import { Tag } from "../../components/ui/Tag";
import type { InboxRow } from "./toInboxRow";
import * as css from "./approvalInbox.css";

const RESULT_COLOR: Record<InboxRow["myStatus"], "success" | "danger" | "secondary"> = {
  approved: "success",
  rejected: "danger",
  pending: "secondary",
};

// 상신 후 지난 날 — 오늘은 흐리게, 1~2일은 주황, 3일 이상은 빨강(lawkit Badge 는 두 색뿐이라 앱 배지 사용).
const WaitingBadge = ({ row }: { row: InboxRow }) => (
  <Badge color={row.elapsedTone === "today" ? "secondary" : row.waitingDays >= 3 ? "danger" : "warning"} size="sm">
    {row.elapsedTone === "today" ? "오늘 상신" : `${row.waitingDays}일째 대기`}
  </Badge>
);

interface InboxCardProps {
  row: InboxRow;
  insight: AiInsight | null;
  isSelected: boolean;
  // 지금 내가 처리할 수 있는 건지 — "내 차례" 목록의 결재만 승인·반려한다.
  canDecide: boolean;
  isBusy: boolean;
  onToggle: (isChecked: boolean) => void;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
}

/** 대기함 카드 한 건 — 문서·상신자·내 단계와 AI 한 줄을 보고 그 자리에서 승인·반려한다. */
export const InboxCard = ({
  row,
  insight,
  isSelected,
  canDecide,
  isBusy,
  onToggle,
  onOpen,
  onApprove,
  onReject,
}: InboxCardProps) => (
  <Card bordered>
    <HStack gap="x4" align="start">
      {canDecide && <Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label={`${row.title} 선택`} />}

      <VStack gap="x2" className={css.grow}>
        <HStack gap="x2" align="center">
          <Tag>{row.kindLabel}</Tag>
          <button type="button" className={row.href ? css.cardTitle : css.cardTitleDeleted} onClick={onOpen}>
            {row.title}
          </button>
        </HStack>
        <HStack gap="x2" align="center">
          <span className={css.metaCode}>{row.docMeta}</span>
          <span className={css.meta}>
            {row.submittedByName} {row.submittedByDept}
          </span>
          <span className={css.meta}>
            {row.roleLabel} {row.stepNumber}/{row.totalSteps}
          </span>
        </HStack>
        {insight && <AiInsightNote insight={insight} />}
      </VStack>

      <VStack gap="x3" align="end">
        {row.myDecidedAtLabel ? (
          <Badge color={RESULT_COLOR[row.myStatus]} size="sm" dot>
            {row.myStatusLabel} {row.myDecidedAtLabel}
          </Badge>
        ) : (
          <WaitingBadge row={row} />
        )}
        <HStack gap="x1">
          <Button size="small" variant="outline" color="secondary" disabled={!row.href} onClick={onOpen}>
            문서 보기
          </Button>
          {canDecide && (
            <>
              <Button size="small" variant="outline" color="danger" disabled={isBusy} onClick={onReject}>
                반려
              </Button>
              <Button size="small" disabled={isBusy} onClick={onApprove}>
                {row.isAgree ? "합의" : "승인"}
              </Button>
            </>
          )}
        </HStack>
      </VStack>
    </HStack>
  </Card>
);
