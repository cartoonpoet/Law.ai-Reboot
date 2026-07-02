import { EditorContent, type Editor } from "@tiptap/react";
import { useState } from "react";
import * as s from "./RichTextEditor.css";
import { useRichTextEditor, ACCENT_COLOR } from "./useRichTextEditor";
import {
  IconHighlight,
  IconBulletList,
  IconOrderedList,
  IconOutdent,
  IconIndent,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconLink,
  IconDivider,
  IconClearFormat,
  IconCaret,
  IconPaste,
} from "./EditorIcons";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
}

/** 문단 스타일 셀렉트 옵션 — 본문/제목1~3. active 라벨은 editor 상태에서 파생한다. */
const BLOCK_STYLES: { label: string; level: 1 | 2 | 3 | null }[] = [
  { label: "본문", level: null },
  { label: "제목 1", level: 1 },
  { label: "제목 2", level: 2 },
  { label: "제목 3", level: 3 },
];

/** 현재 선택의 문단 스타일 라벨을 editor 상태에서 파생(렌더 중 계산 — useState/effect 불필요). */
const getActiveBlockLabel = (editor: Editor): string => {
  const active = BLOCK_STYLES.find((opt) => opt.level !== null && editor.isActive("heading", { level: opt.level }));
  return active?.label ?? BLOCK_STYLES[0].label;
};

export function RichTextEditor({ value, onChange, ariaLabel, placeholder }: RichTextEditorProps) {
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const editor = useRichTextEditor({ value, onChange, ariaLabel, placeholder, areaClass: s.area });

  if (!editor) return null;

  const handleSelectBlock = (level: 1 | 2 | 3 | null) => {
    if (level === null) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level }).run();
    setIsStyleMenuOpen(false);
  };

  const handleSetLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("링크 URL을 입력하세요", previous ?? "https://");
    if (input === null) return;
    if (input.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: input.trim() }).run();
  };

  const isColorActive = editor.isActive("textStyle", { color: ACCENT_COLOR });
  const handleToggleColor = () => {
    if (isColorActive) editor.chain().focus().unsetColor().run();
    else editor.chain().focus().setColor(ACCENT_COLOR).run();
  };

  const iconButton = (tip: string, isActive: boolean, onClick: () => void, icon: React.ReactNode) => (
    <button type="button" className={s.tbtn} data-active={isActive} data-tip={tip} aria-label={tip} onClick={onClick}>
      {icon}
    </button>
  );

  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        {/* 문단 스타일 셀렉트 */}
        <div className={s.group}>
          <div className={s.selectWrap}>
            <button
              type="button"
              className={`${s.tbtn} ${s.selectBtn}`}
              data-tip="문단 스타일"
              aria-label="문단 스타일"
              aria-expanded={isStyleMenuOpen}
              onClick={() => setIsStyleMenuOpen((open) => !open)}
            >
              <span className={s.selectLabel}>{getActiveBlockLabel(editor)}</span>
              <IconCaret />
            </button>
            {isStyleMenuOpen && (
              <div className={s.menu} role="menu">
                {BLOCK_STYLES.map((opt) => {
                  const isActive = opt.level === null ? editor.isActive("paragraph") : editor.isActive("heading", { level: opt.level });
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      role="menuitem"
                      className={s.menuItem}
                      data-active={isActive}
                      onClick={() => handleSelectBlock(opt.level)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <span className={s.sep} />

        {/* 인라인 마크 */}
        <div className={s.group}>
          {iconButton("굵게 (Ctrl+B)", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <b className={s.glyph}>B</b>)}
          {iconButton("기울임 (Ctrl+I)", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <i className={s.glyph}>I</i>)}
          {iconButton("밑줄 (Ctrl+U)", editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <u className={s.glyph}>U</u>)}
          {iconButton("취소선", editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), <s className={s.glyph}>S</s>)}
        </div>

        <span className={s.sep} />

        {/* 색 / 하이라이트 */}
        <div className={s.group}>
          {iconButton("글자 색", isColorActive, handleToggleColor, <span className={s.colorGlyph}>A<span className={s.swatchColor} /></span>)}
          {iconButton("하이라이트", editor.isActive("highlight"), () => editor.chain().focus().toggleHighlight().run(), <span className={s.colorGlyph}><IconHighlight /><span className={s.swatchHighlight} /></span>)}
        </div>

        <span className={s.sep} />

        {/* 목록 / 들여쓰기 */}
        <div className={s.group}>
          {iconButton("글머리 목록", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <IconBulletList />)}
          {iconButton("번호 목록", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <IconOrderedList />)}
          {iconButton("내어쓰기", false, () => editor.chain().focus().liftListItem("listItem").run(), <IconOutdent />)}
          {iconButton("들여쓰기", false, () => editor.chain().focus().sinkListItem("listItem").run(), <IconIndent />)}
        </div>

        <span className={s.sep} />

        {/* 정렬 */}
        <div className={s.group}>
          {iconButton("왼쪽 정렬", editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), <IconAlignLeft />)}
          {iconButton("가운데 정렬", editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), <IconAlignCenter />)}
          {iconButton("오른쪽 정렬", editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), <IconAlignRight />)}
        </div>

        <span className={s.sep} />

        {/* 링크 / 구분선 */}
        <div className={s.group}>
          {iconButton("링크", editor.isActive("link"), handleSetLink, <IconLink />)}
          {iconButton("구분선", false, () => editor.chain().focus().setHorizontalRule().run(), <IconDivider />)}
        </div>

        <span className={s.sep} />

        {/* 서식 지우기 */}
        <div className={s.group}>
          {iconButton("서식 지우기", false, () => editor.chain().focus().unsetAllMarks().clearNodes().run(), <IconClearFormat />)}
        </div>
      </div>

      <EditorContent editor={editor} />

      <div className={s.editorBar}>
        <span className={s.pasteHint}>
          <IconPaste />
          Word·HWP 서식 붙여넣기 지원
        </span>
      </div>
    </div>
  );
}
