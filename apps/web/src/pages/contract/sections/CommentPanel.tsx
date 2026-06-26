import { Icon } from "@lawkit/ui";
import { Panel } from "../../../components/ui/Panel";
import { useComments } from "../hooks/useComments";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { getRoleLabel, getRoleVariant } from "./commentRole";
import * as css from "./commentPanel.css";

interface CommentPanelProps {
  contractId: string;
}

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** "검토 의견" 패널 — 실 코멘트 목록 + 작성 폼(useComments). */
export function CommentPanel({ contractId }: CommentPanelProps) {
  const { comments, isLoading, error, addComment, editComment, deleteComment } =
    useComments(contractId);

  return (
    <Panel title="검토 의견" icon="messageSquare" badge={comments.length} pad={16}>
      {error ? (
        <div className={css.state}>코멘트를 불러올 수 없습니다.</div>
      ) : isLoading ? (
        <div className={css.state}>불러오는 중…</div>
      ) : comments.length === 0 ? (
        // 시안 `.emptystate` — primaryTint 원형 아이콘 + 제목 + 설명.
        <div className={css.emptyState}>
          <div className={css.emptyRing}>
            <Icon name="messageSquare" size="md" />
          </div>
          <div className={css.emptyTitle}>첫 검토 의견을 남겨보세요</div>
          <div className={css.emptyDesc}>
            담당자에게 전달할 의견을 작성하면 검토 이력에 기록됩니다.
          </div>
        </div>
      ) : (
        <div className={css.list}>
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              roleVariant={getRoleVariant(c.role)}
              roleLabel={getRoleLabel(c.role)}
              formattedTime={formatTime(c.createdAt)}
              // 멘션은 에디터에서 산출한 userId[]로 전체 교체한다(HTML data-mention 기반).
              onEdit={editComment}
              onDelete={deleteComment}
            />
          ))}
        </div>
      )}

      <div className={css.formWrap}>
        <div className={css.sectionLabel}>새 검토 의견</div>
        <CommentForm onSubmit={addComment} contractId={contractId} />
      </div>
    </Panel>
  );
}
