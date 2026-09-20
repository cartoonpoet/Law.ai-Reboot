import type { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { getIsAccentColorActive, toggleAccentColor } from "../editorCommands";
import { IconHighlight, IconClearFormat } from "../EditorIcons";
import * as s from "../RichTextEditor.css";
import * as css from "./documentToolbar.css";

interface TextFormatGroupProps {
  editor: Editor;
}

/** 리본 첫 줄 둘째 칸 — 글자 꾸미기(굵게·기울임·밑줄·취소선·첨자·색·하이라이트·서식 지우기). */
export const TextFormatGroup = ({ editor }: TextFormatGroupProps) => (
  <>
    <div className={s.group}>
      <ToolbarButton tip="굵게 (Ctrl+B)" isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b className={s.glyph}>B</b>
      </ToolbarButton>
      <ToolbarButton tip="기울임 (Ctrl+I)" isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i className={s.glyph}>I</i>
      </ToolbarButton>
      <ToolbarButton tip="밑줄 (Ctrl+U)" isActive={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <u className={s.glyph}>U</u>
      </ToolbarButton>
      <ToolbarButton tip="취소선" isActive={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s className={s.glyph}>S</s>
      </ToolbarButton>
    </div>

    <span className={s.sep} />

    <div className={s.group}>
      <ToolbarButton tip="위 첨자" isActive={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
        <span className={css.scriptGlyph}>
          x<sup className={css.scriptMark}>2</sup>
        </span>
      </ToolbarButton>
      <ToolbarButton tip="아래 첨자" isActive={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
        <span className={css.scriptGlyph}>
          x<sub className={css.scriptMark}>2</sub>
        </span>
      </ToolbarButton>
    </div>

    <span className={s.sep} />

    <div className={s.group}>
      <ToolbarButton tip="글자 색" isActive={getIsAccentColorActive(editor)} onClick={() => toggleAccentColor(editor)}>
        <span className={s.colorGlyph}>
          A<span className={s.swatchColor} />
        </span>
      </ToolbarButton>
      <ToolbarButton tip="하이라이트" isActive={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <span className={s.colorGlyph}>
          <IconHighlight />
          <span className={s.swatchHighlight} />
        </span>
      </ToolbarButton>
      <ToolbarButton tip="서식 지우기" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <IconClearFormat />
      </ToolbarButton>
    </div>
  </>
);
