import { useState } from "react";
import { Button, Textarea } from "@lawkit/ui";
import type { AdviceMessageKindTypes, AdviceResponse } from "@lawai/contracts";
import * as css from "./adviceDetail.css";

interface AdviceComposerProps {
  advice: AdviceResponse;
  isSending: boolean;
  onSend: (kind: AdviceMessageKindTypes, body: string, onSent: () => void) => void;
}

/**
 * 질의·회신 입력 — 보는 사람의 권한에 따라 모양이 바뀐다.
 * 담당자: 추가 질의 / 회신 · 요청자: 답변(회신 뒤에 보내면 다시 검토로 돌아간다).
 */
export const AdviceComposer = ({ advice, isSending, onSend }: AdviceComposerProps) => {
  const [body, setBody] = useState("");
  const { canFollowup, canAnswer, canReply } = advice.permissions;
  const isOwnerSide = canFollowup || canAnswer;
  const isEmpty = body.trim().length === 0;

  if (!isOwnerSide && !canReply) return null;

  const handleSend = (kind: AdviceMessageKindTypes) => onSend(kind, body, () => setBody(""));

  const placeholder = isOwnerSide
    ? "요청자에게 확인할 내용이나 회신 내용을 적어 주세요."
    : "담당자에게 전할 답변이나 추가 질문을 적어 주세요.";
  const hint = isOwnerSide
    ? "회신을 보내면 회신 완료로 바뀌어요."
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
          <Button variant="outline" color="secondary" size="small" disabled={isEmpty || isSending} onClick={() => handleSend("followup")}>
            추가 질의 보내기
          </Button>
        )}
        {canAnswer && (
          <Button size="small" disabled={isEmpty || isSending} onClick={() => handleSend("answer")}>
            회신 보내기
          </Button>
        )}
        {!isOwnerSide && canReply && (
          <Button size="small" disabled={isEmpty || isSending} onClick={() => handleSend("reply")}>
            답변 보내기
          </Button>
        )}
      </div>
    </div>
  );
};
