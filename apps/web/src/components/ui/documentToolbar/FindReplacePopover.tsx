import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Button, Input } from "@lawkit/ui";
import { ToolbarButton } from "./ToolbarButton";
import { useFindReplace } from "./useFindReplace";
import { IconFind, IconClose } from "../EditorIcons";
import * as css from "./documentToolbar.css";

interface FindReplacePopoverProps {
  editor: Editor;
}

/**
 * 찾기·바꾸기 — 계약서에서 "갑"/"을" 같은 말을 찾아 한 번에 바꾸는 도구.
 * 툴바 버튼을 누르면 작은 상자가 열리고, 다음 찾기·모두 바꾸기를 고를 수 있다.
 */
export const FindReplacePopover = ({ editor }: FindReplacePopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { keyword, setKeyword, replacement, setReplacement, matchCount, handleFindNext, handleReplaceAll } =
    useFindReplace(editor);

  return (
    <div className={css.findWrap}>
      <ToolbarButton tip="찾기·바꾸기" isActive={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <IconFind />
      </ToolbarButton>

      {isOpen && (
        <div className={css.findPanel}>
          <div className={css.findHead}>
            <span className={css.findTitle}>찾기·바꾸기</span>
            <ToolbarButton tip="닫기" onClick={() => setIsOpen(false)}>
              <IconClose />
            </ToolbarButton>
          </div>

          <div className={css.findField}>
            <span className={css.findLabel}>찾을 말</span>
            <Input
              inputSize="small"
              placeholder="예: 갑"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className={css.findField}>
            <span className={css.findLabel}>바꿀 말</span>
            <Input
              inputSize="small"
              placeholder="예: 수급인"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
            />
          </div>

          <span className={css.findCount}>
            {keyword === "" ? "찾을 말을 입력하세요" : `문서에서 ${matchCount}군데 찾았어요`}
          </span>

          <div className={css.findActions}>
            <Button size="small" variant="outline" color="secondary" onClick={handleFindNext}>
              다음 찾기
            </Button>
            <Button size="small" onClick={handleReplaceAll}>
              모두 바꾸기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
