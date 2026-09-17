import { useState } from "react";
import { Button, Textarea } from "@lawkit/ui";
import type { AdviceResponse } from "@lawai/contracts";
import type { Approver } from "../../contract/request-schema";
import { ApprovalLineModal } from "../../contract/sections/ApprovalLineModal";
import { showToast } from "../../../lib/toast/toastStore";
import { checkNeedsApproval } from "../approval/adviceApprovers";
import type { AdviceMessageInput } from "../hooks/useAdviceDetail";
import * as css from "./adviceDetail.css";

interface AdviceComposerProps {
  advice: AdviceResponse;
  draftApprover: Approver | null;
  isSending: boolean;
  onSend: (message: AdviceMessageInput, onSent: () => void) => void;
}

/**
 * 질의·회신 입력 — 보는 사람의 권한에 따라 모양이 바뀐다.
 * 담당자: 추가 질의 / 결재 올려 회신 / 바로 회신 · 요청자: 답변(회신 뒤에 보내면 다시 검토로 돌아간다).
 */
export const AdviceComposer = ({ advice, draftApprover, isSending, onSend }: AdviceComposerProps) => {
  const [body, setBody] = useState("");
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const { canFollowup, canAnswer, canReply } = advice.permissions;
  const isOwnerSide = canFollowup || canAnswer;
  const isEmpty = body.trim().length === 0;

  if (!isOwnerSide && !canReply) return null;

  const handleSent = () => setBody("");
  // "결재 올려 회신"인데 결재자를 넣지 않았으면 결재 없이 회신되지 않도록 막는다.
  const handleApplyApprovers = (approvers: Approver[]) => {
    if (!checkNeedsApproval(approvers)) {
      showToast({ intent: "warning", title: "결재나 합의할 사람을 한 명 이상 넣어 주세요" });
      return;
    }
    setIsApprovalOpen(false);
    onSend({ kind: "answer", body, approvers }, handleSent);
  };

  const placeholder = isOwnerSide
    ? "요청자에게 확인할 내용이나 회신 내용을 적어 주세요."
    : "담당자에게 전할 답변이나 추가 질문을 적어 주세요.";
  const hint = isOwnerSide
    ? "결재를 올리면 승인된 뒤에 요청자에게 회신이 보여요."
    : advice.status === "answered"
      ? "보내면 다시 검토 중으로 바뀌어요."
      : "";

  return (
    <div className={css.composer}>
      <Textarea
        textareaSize="small"
        rows={4}
        resize="vertical"
        placeholder={placeholder}
        aria-label="질의·회신 입력"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className={css.composerActions}>
        {hint && <span className={css.composerHint}>{hint}</span>}
        {canFollowup && (
          <Button
            variant="outline"
            color="secondary"
            size="small"
            disabled={isEmpty || isSending}
            onClick={() => onSend({ kind: "followup", body }, handleSent)}
          >
            추가 질의 보내기
          </Button>
        )}
        {canAnswer && (
          <>
            <Button
              variant="outline"
              color="secondary"
              size="small"
              disabled={isEmpty || isSending}
              onClick={() => onSend({ kind: "answer", body }, handleSent)}
            >
              바로 회신
            </Button>
            <Button size="small" disabled={isEmpty || isSending || !draftApprover} onClick={() => setIsApprovalOpen(true)}>
              결재 올려 회신
            </Button>
          </>
        )}
        {!isOwnerSide && canReply && (
          <Button size="small" disabled={isEmpty || isSending} onClick={() => onSend({ kind: "reply", body }, handleSent)}>
            답변 보내기
          </Button>
        )}
      </div>

      {isApprovalOpen && draftApprover && (
        <ApprovalLineModal
          initial={[draftApprover]}
          onClose={() => setIsApprovalOpen(false)}
          onApply={handleApplyApprovers}
        />
      )}
    </div>
  );
};
