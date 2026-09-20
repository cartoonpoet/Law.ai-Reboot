import type { Editor } from "@tiptap/react";
import { Dropdown } from "@lawkit/ui";
import { FONT_FAMILIES, FONT_SIZES, DEFAULT_OPTION_VALUE } from "./toolbarOptions";
import * as s from "../RichTextEditor.css";
import * as css from "./documentToolbar.css";

interface FontGroupProps {
  editor: Editor;
}

/** 리본 첫 칸 — 글꼴과 글자 크기. */
export const FontGroup = ({ editor }: FontGroupProps) => {
  const activeFamily = (editor.getAttributes("textStyle").fontFamily as string | undefined) ?? DEFAULT_OPTION_VALUE;
  const activeSize = (editor.getAttributes("textStyle").fontSize as string | undefined) ?? DEFAULT_OPTION_VALUE;

  const handleChangeFamily = (value: string | string[]) => {
    const next = String(value);
    if (next === DEFAULT_OPTION_VALUE) editor.chain().focus().unsetFontFamily().run();
    else editor.chain().focus().setFontFamily(next).run();
  };

  const handleChangeSize = (value: string | string[]) => {
    const next = String(value);
    if (next === DEFAULT_OPTION_VALUE) editor.chain().focus().unsetFontSize().run();
    else editor.chain().focus().setFontSize(next).run();
  };

  return (
    <div className={s.group}>
      <Dropdown
        size="small"
        className={css.fontSelect}
        options={FONT_FAMILIES}
        value={activeFamily}
        onChange={handleChangeFamily}
        placeholder="글꼴"
      />
      <Dropdown
        size="small"
        className={css.sizeSelect}
        options={FONT_SIZES}
        value={activeSize}
        onChange={handleChangeSize}
        placeholder="크기"
      />
    </div>
  );
};
