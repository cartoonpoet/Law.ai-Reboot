import { Button, Icon } from "@lawkit/ui";
import * as css from "../../pages/mockups/documentEditor/documentEditorMock.css";

interface SelectionBubbleProps {
  /** 다듬기를 고르면 로아이 패널이 "문장 다듬기"로 열린다. */
  onRewrite: () => void;
}

/** 본문에서 글을 골랐을 때 뜨는 작은 툴바 — 고른 곳만 로아이에게 맡긴다. */
export const SelectionBubble = ({ onRewrite }: SelectionBubbleProps) => (
  <div className={css.bubble}>
    <span className={css.bubbleLabel}>
      <Icon name="autoAwesome" size="sm" className={css.bubbleIcon} />
      고른 문장
    </span>
    <Button size="small" onClick={onRewrite}>
      로아이에게 고치라고 하기
    </Button>
  </div>
);
