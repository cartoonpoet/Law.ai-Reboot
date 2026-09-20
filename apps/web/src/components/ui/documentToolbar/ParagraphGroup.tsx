import type { Editor } from "@tiptap/react";
import { Dropdown } from "@lawkit/ui";
import { ToolbarButton } from "./ToolbarButton";
import { getActiveLineHeight } from "../editorExtensions/lineHeightExtension";
import { BLOCK_STYLE_OPTIONS, LINE_HEIGHTS, PARAGRAPH_STYLE_VALUE, DEFAULT_OPTION_VALUE } from "./toolbarOptions";
import {
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustify,
  IconLineHeight,
  IconBulletList,
  IconOrderedList,
  IconOutdent,
  IconIndent,
} from "../EditorIcons";
import * as s from "../RichTextEditor.css";
import * as css from "./documentToolbar.css";

interface ParagraphGroupProps {
  editor: Editor;
}

/** 지금 커서가 놓인 문단 스타일 값(본문/제목 레벨) — 렌더 중 파생. */
const getActiveBlockValue = (editor: Editor): string => {
  const level = [1, 2, 3].find((n) => editor.isActive("heading", { level: n }));
  return level === undefined ? PARAGRAPH_STYLE_VALUE : String(level);
};

/** 리본 둘째 줄 첫 칸 — 문단 스타일·정렬 4개·줄 간격·목록·들여쓰기. */
export const ParagraphGroup = ({ editor }: ParagraphGroupProps) => {
  const handleChangeBlock = (value: string | string[]) => {
    const next = String(value);
    if (next === PARAGRAPH_STYLE_VALUE) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({ level: Number(next) as 1 | 2 | 3 }).run();
  };

  const handleChangeLineHeight = (value: string | string[]) => {
    const next = String(value);
    if (next === DEFAULT_OPTION_VALUE) editor.chain().focus().setParagraphLineHeight("").run();
    else editor.chain().focus().setParagraphLineHeight(next).run();
  };

  return (
    <>
      <div className={s.group}>
        <Dropdown
          size="small"
          className={css.blockSelect}
          options={BLOCK_STYLE_OPTIONS}
          value={getActiveBlockValue(editor)}
          onChange={handleChangeBlock}
          placeholder="문단"
        />
      </div>

      <span className={s.sep} />

      <div className={s.group}>
        <ToolbarButton tip="왼쪽 정렬" isActive={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <IconAlignLeft />
        </ToolbarButton>
        <ToolbarButton tip="가운데 정렬" isActive={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <IconAlignCenter />
        </ToolbarButton>
        <ToolbarButton tip="오른쪽 정렬" isActive={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <IconAlignRight />
        </ToolbarButton>
        <ToolbarButton tip="양쪽 정렬" isActive={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <IconAlignJustify />
        </ToolbarButton>
      </div>

      <span className={s.sep} />

      <div className={s.group}>
        <span className={css.leadIcon} title="줄 간격" aria-hidden>
          <IconLineHeight />
        </span>
        <Dropdown
          size="small"
          className={css.lineSelect}
          options={LINE_HEIGHTS}
          value={getActiveLineHeight(editor) ?? DEFAULT_OPTION_VALUE}
          onChange={handleChangeLineHeight}
          placeholder="줄 간격"
        />
      </div>

      <span className={s.sep} />

      <div className={s.group}>
        <ToolbarButton tip="글머리 목록" isActive={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <IconBulletList />
        </ToolbarButton>
        <ToolbarButton tip="번호 목록" isActive={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <IconOrderedList />
        </ToolbarButton>
        <ToolbarButton tip="내어쓰기" onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
          <IconOutdent />
        </ToolbarButton>
        <ToolbarButton tip="들여쓰기" onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
          <IconIndent />
        </ToolbarButton>
      </div>
    </>
  );
};
