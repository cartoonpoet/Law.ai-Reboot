import { useState } from "react";
import { Button, EmptyState, Icon } from "@lawkit/ui";
import { MOCK_REWRITE_ACTIONS, MOCK_REWRITE_RESULT } from "./documentEditorMockData";
import * as css from "./documentEditorMock.css";

interface LoaiRewriteTabProps {
  /** 지금 본문에서 선택한 글. 없으면 빈 문자열. */
  selectedText: string;
}

/** 로아이 ② 선택 문장 다듬기 / 조항 쓰기 — 고른 곳만 바꿔 준다. */
export const LoaiRewriteTab = ({ selectedText }: LoaiRewriteTabProps) => {
  const [actionId, setActionId] = useState("polish");

  const hasSelection = selectedText.trim() !== "";

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
        {MOCK_REWRITE_ACTIONS.map((item) => (
          <div
            key={item.id}
            className={actionId === item.id ? `${css.rewriteItem} ${css.rewriteItemOn}` : css.rewriteItem}
            onClick={() => setActionId(item.id)}
          >
            <span className={css.rewriteLabel}>{item.label}</span>
            <span className={css.rewriteHint}>{item.hint}</span>
          </div>
        ))}
      </div>

      <div className={css.panelLabel}>로아이가 고친 문장</div>
      <div className={css.resultBox}>{MOCK_REWRITE_RESULT}</div>
      <div className={css.resultActions}>
        <Button size="small" iconLeft={<Icon name="check" size="sm" />}>
          이 문장으로 바꾸기
        </Button>
        <Button size="small" variant="outline" color="secondary" iconLeft={<Icon name="refreshCw" size="sm" />}>
          다시 고치기
        </Button>
      </div>

      <p className={css.disclaimer}>바꾼 문장은 되돌리기(Ctrl+Z)로 되돌릴 수 있어요.</p>
    </>
  );
};
