import { useState } from "react";
import { Button, EmptyState, Icon } from "@lawkit/ui";
import * as css from "../../pages/mockups/documentEditor/documentEditorMock.css";

/** 로아이 "문장 고치기" 지시문 카드 — 환경(시안/실 서비스)과 무관한 고정 UX 문구라 여기서 소유한다. */
const REWRITE_ACTIONS: { id: string; label: string; hint: string }[] = [
  { id: "polish", label: "문장 다듬기", hint: "뜻은 그대로 두고 읽기 쉽게 고칩니다." },
  { id: "tighten", label: "우리에게 유리하게", hint: "책임을 줄이고 상대 의무를 또렷하게 씁니다." },
  { id: "clause", label: "조항으로 쓰기", hint: "적어 둔 메모를 계약 조항 문장으로 바꿉니다." },
  { id: "plain", label: "쉬운 말로", hint: "어려운 법률 용어를 풀어 씁니다." },
];

interface LoaiRewriteTabProps {
  /** 지금 본문에서 선택한 글. 없으면 빈 문자열. */
  selectedText: string;
  /** 고른 지시문으로 선택 문장을 실제로 다시 쓴다(AI 호출). */
  onRewrite: (instruction: string) => Promise<string>;
}

/** 로아이 ② 선택 문장 다듬기 / 조항 쓰기 — 고른 곳만 바꿔 준다. */
export const LoaiRewriteTab = ({ selectedText, onRewrite }: LoaiRewriteTabProps) => {
  const [actionId, setActionId] = useState(REWRITE_ACTIONS[0].id);
  const [result, setResult] = useState<string | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);

  const hasSelection = selectedText.trim() !== "";

  const runRewrite = async (nextActionId: string) => {
    const action = REWRITE_ACTIONS.find((item) => item.id === nextActionId);
    if (!action) return;
    setActionId(nextActionId);
    setIsRewriting(true);
    try {
      setResult(await onRewrite(action.label));
    } finally {
      setIsRewriting(false);
    }
  };

  if (!hasSelection) {
    return (
      <div className={css.panelEmpty}>
        <EmptyState
          icon={<Icon name="edit" size="lg" />}
          title="먼저 고칠 문장을 골라 주세요"
          description="왼쪽 종이에서 고치고 싶은 문장을 마우스로 끌어서 고르면, 그 문장만 여기에 올라옵니다. 문서 전체를 보려면 위에서 전체 검토를 누르세요."
        />
      </div>
    );
  }

  return (
    <>
      <div className={css.panelLabel}>고른 문장</div>
      <div className={css.quote}>{selectedText}</div>

      <div className={css.panelLabel}>어떻게 고칠까요</div>
      <div className={css.rewriteGrid}>
        {REWRITE_ACTIONS.map((item) => (
          <div
            key={item.id}
            className={actionId === item.id ? `${css.rewriteItem} ${css.rewriteItemOn}` : css.rewriteItem}
            onClick={() => void runRewrite(item.id)}
          >
            <span className={css.rewriteLabel}>{item.label}</span>
            <span className={css.rewriteHint}>{item.hint}</span>
          </div>
        ))}
      </div>

      <div className={css.panelLabel}>로아이가 고친 문장</div>
      <div className={css.resultBox}>{isRewriting ? "고치는 중…" : (result ?? "왼쪽에서 고칠 방법을 골라 주세요.")}</div>
      <div className={css.resultActions}>
        <Button size="small" iconLeft={<Icon name="check" size="sm" />} disabled={!result || isRewriting}>
          이 문장으로 바꾸기
        </Button>
        <Button
          size="small"
          variant="outline"
          color="secondary"
          iconLeft={<Icon name="refreshCw" size="sm" />}
          disabled={isRewriting}
          onClick={() => void runRewrite(actionId)}
        >
          다시 고치기
        </Button>
      </div>

      <p className={css.disclaimer}>바꾼 문장은 되돌리기(Ctrl+Z)로 되돌릴 수 있어요.</p>
    </>
  );
};
