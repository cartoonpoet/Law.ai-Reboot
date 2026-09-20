import { EditorContent, type Editor } from "@tiptap/react";
import { TableKit } from "@tiptap/extension-table";
import { FontFamily, FontSize } from "@tiptap/extension-text-style";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Image from "@tiptap/extension-image";
import { Icon } from "@lawkit/ui";
import { useState, type ReactNode } from "react";
import * as s from "./RichTextEditor.css";
import { useRichTextEditor } from "./useRichTextEditor";
import { promptForLink, getIsAccentColorActive, toggleAccentColor } from "./editorCommands";
import { ParagraphLineHeight } from "./editorExtensions/lineHeightExtension";
import { PageBreak } from "./editorExtensions/pageBreakNode";
import { DocumentToolbar } from "./documentToolbar/DocumentToolbar";
import {
  IconTable,
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
  /** 표 도구(삽입·행/열 추가·삭제)를 툴바에 더한다 — 문서 편집기 전용. 기본은 지금 그대로 꺼짐. */
  withTable?: boolean;
  /**
   * 워드 리본처럼 두 줄짜리 전체 서식 툴바(글꼴·크기·첨자·줄간격·실행취소·찾기바꾸기·그림·페이지 나누기)를 쓴다 —
   * 문서 편집기 전용. 넘기지 않으면 지금까지의 한 줄 툴바 그대로다.
   */
  withFullToolbar?: boolean;
  /** 넘기면 툴바 맨 오른쪽에 "로아이" 버튼이 붙는다. */
  onLoaiClick?: () => void;
  /** 로아이 패널이 열려 있는지 — 버튼을 켜진 상태로 보이게 한다. */
  isLoaiOpen?: boolean;
  /** 편집기 바깥 상자에 덧붙일 클래스(문서 편집기의 회색 바탕 등). */
  wrapClassName?: string;
  /** 편집 영역(.ProseMirror)에 덧붙일 클래스(A4 종이 등). */
  areaClassName?: string;
  /** 하단 바 오른쪽에 덧붙일 내용(저장 시각·글자 수 등). */
  footerExtra?: ReactNode;
  /** 편집기 상자 안에 겹쳐 그릴 것(글을 선택했을 때 뜨는 작은 툴바 등). */
  renderOverlay?: (editor: Editor) => ReactNode;
}

/** 표 도구를 켤 때만 쓰는 확장. 모듈 최상단 상수라 렌더마다 새로 만들지 않는다. */
const TABLE_EXTENSIONS = [TableKit.configure({ table: { resizable: true } })];

/** 워드 리본(문서 편집기)에서만 쓰는 확장 — 글꼴·글자크기·줄간격·첨자·그림·페이지 나누기. */
const FULL_TOOLBAR_EXTENSIONS = [
  FontFamily,
  FontSize,
  ParagraphLineHeight,
  Superscript,
  Subscript,
  Image.configure({ allowBase64: true }),
  PageBreak,
];

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

export function RichTextEditor({
  value,
  onChange,
  ariaLabel,
  placeholder,
  withTable = false,
  withFullToolbar = false,
  onLoaiClick,
  isLoaiOpen = false,
  wrapClassName,
  areaClassName,
  footerExtra,
  renderOverlay,
}: RichTextEditorProps) {
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const editor = useRichTextEditor({
    value,
    onChange,
    ariaLabel,
    placeholder,
    areaClass: areaClassName ? `${s.area} ${areaClassName}` : s.area,
    extraExtensions: [
      ...(withTable ? TABLE_EXTENSIONS : []),
      ...(withFullToolbar ? FULL_TOOLBAR_EXTENSIONS : []),
    ],
  });

  if (!editor) return null;

  const handleSelectBlock = (level: 1 | 2 | 3 | null) => {
    if (level === null) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level }).run();
    setIsStyleMenuOpen(false);
  };

  const handleSetLink = () => promptForLink(editor);

  const isColorActive = getIsAccentColorActive(editor);
  const handleToggleColor = () => toggleAccentColor(editor);

  const iconButton = (
    tip: string,
    isActive: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    extraClass?: string,
  ) => (
    <button
      type="button"
      className={extraClass ? `${s.tbtn} ${extraClass}` : s.tbtn}
      data-active={isActive}
      data-tip={tip}
      aria-label={tip}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  const isInTable = withTable && editor.isActive("table");

  return (
    <div className={wrapClassName ? `${s.wrap} ${wrapClassName}` : s.wrap}>
      {/* 문서 편집기: 워드 리본(두 줄). 그 밖의 화면: 지금까지의 한 줄 툴바 그대로. */}
      {withFullToolbar && (
        <DocumentToolbar editor={editor} withTable={withTable} onLoaiClick={onLoaiClick} isLoaiOpen={isLoaiOpen} />
      )}

      {!withFullToolbar && (
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

        {/* 표 — 문서 편집기에서만. 표 안에 커서가 있을 때만 행·열 도구가 더 나온다. */}
        {withTable && (
          <>
            <span className={s.sep} />
            <div className={s.group}>
              {iconButton(
                "표 넣기 (3×3)",
                editor.isActive("table"),
                () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
                <IconTable />,
              )}
              {isInTable && iconButton("행 추가", false, () => editor.chain().focus().addRowAfter().run(), <span className={s.glyph}>＋행</span>)}
              {isInTable && iconButton("열 추가", false, () => editor.chain().focus().addColumnAfter().run(), <span className={s.glyph}>＋열</span>)}
              {isInTable && iconButton("표 지우기", false, () => editor.chain().focus().deleteTable().run(), <span className={s.glyph}>표 삭제</span>)}
            </div>
          </>
        )}

        {/* 로아이 — AI 도우미 패널 열기. 서식 도구 바로 옆에 붙여 툴바의 한 칸으로 보이게 한다. */}
        {onLoaiClick && (
          <>
            <span className={s.sep} />
            <div className={s.group}>
              {iconButton(
                isLoaiOpen ? "로아이 도우미 닫기" : "로아이 도우미 열기",
                isLoaiOpen,
                onLoaiClick,
                <span className={s.loaiLabel}>
                  <Icon name="autoAwesome" size="sm" className={s.icon} />
                  로아이 도우미
                </span>,
                s.loaiBtn,
              )}
            </div>
          </>
        )}
      </div>
      )}

      {renderOverlay?.(editor)}

      <EditorContent editor={editor} />

      <div className={s.editorBar}>
        <span className={s.pasteHint}>
          <IconPaste />
          Word·HWP 서식 붙여넣기 지원
        </span>
        {footerExtra}
      </div>
    </div>
  );
}
