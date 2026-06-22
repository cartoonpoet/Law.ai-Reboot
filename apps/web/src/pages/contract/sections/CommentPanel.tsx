import { Avatar } from "@lawkit/ui";
import { Panel } from "../../../components/ui/Panel";
import { Tag } from "../../../components/ui/Tag";
import { useComments } from "../hooks/useComments";
import { CommentForm } from "./CommentForm";
import * as css from "./commentPanel.css";

interface CommentPanelProps {
  contractId: string;
}

// 작성 시점 role 스냅(Role enum 또는 레거시 한글) → 표시 라벨.
// CommentDto.role 은 string(스냅)이라 Role 6종 + 레거시 키를 모두 커버한다.
// 미매핑 키(레거시 한글 등)는 getRoleLabel 이 원문 그대로 표시.
const ROLE_LABEL: Record<string, string> = {
  general: "요청자",
  requester: "요청자",
  contractManager: "계약담당자",
  inHouseCounsel: "사내변호사",
  outsideCounsel: "사외변호사",
  sealManager: "인감관리자",
  admin: "관리자",
};

// 법무 역할이면 강조색(primary), 그 외 중립.
const LEGAL_ROLES = new Set(["inHouseCounsel", "contractManager", "admin"]);

const getRoleLabel = (role: string): string => ROLE_LABEL[role] ?? role;

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** "검토 의견" 패널 — 실 코멘트 목록 + 작성 폼(useComments). */
export function CommentPanel({ contractId }: CommentPanelProps) {
  const { comments, isLoading, error, addComment } = useComments(contractId);

  return (
    <Panel title="검토 의견" icon="messageSquare" badge={comments.length} pad={16}>
      {error ? (
        <div className={css.state}>코멘트를 불러올 수 없습니다.</div>
      ) : isLoading ? (
        <div className={css.state}>불러오는 중…</div>
      ) : comments.length === 0 ? (
        <div className={css.state}>아직 코멘트가 없습니다.</div>
      ) : (
        <div className={css.list}>
          {comments.map((c) => {
            const isLegal = LEGAL_ROLES.has(c.role);
            return (
              <div key={c.id} className={css.row}>
                <Avatar
                  initials={c.authorName[0] ?? "?"}
                  size="sm"
                  color={isLegal ? "primary" : "secondary"}
                />
                <div className={css.main}>
                  <div className={css.head}>
                    <span className={css.author}>{c.authorName}</span>
                    <Tag color={isLegal ? "primary" : "neutral"}>{getRoleLabel(c.role)}</Tag>
                    <span className={css.time}>{formatTime(c.createdAt)}</span>
                  </div>
                  <div className={css.bubble}>{c.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={css.formWrap}>
        <CommentForm onSubmit={addComment} />
      </div>
    </Panel>
  );
}
