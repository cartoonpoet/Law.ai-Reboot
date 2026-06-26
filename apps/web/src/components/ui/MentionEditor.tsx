import { EditorContent, type Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import {
  IconBulletList,
  IconOrderedList,
  IconLink,
  IconQuote,
  IconAttach,
  IconPaste,
} from "./EditorIcons";
import { useCommentEditor } from "./useCommentEditor";
import type { MentionSuggestion } from "../../pages/contract/hooks/useMentionSuggestion";
import { getPlainTextFromHtml } from "../../pages/contract/utils/mentionHtml";
import * as s from "./commentEditor.css";

interface MentionEditorProps {
  /** 외부 body(HTML 단편 — `<p>...<span data-mention data-id="...">@name</span>...</p>`). */
  value: string;
  /** 편집 시 editor.getHTML() 결과를 상향. 빈 본문은 `<p></p>`로 산출. */
  onChange: (html: string) => void;
  /** tiptap suggestion 설정 — useMentionSuggestion이 제공. */
  suggestion: MentionSuggestion;
  ariaLabel: string;
  placeholder?: string;
  /** 글자수 카운트 최대치(시각 표시만, 차단 안 함). 표시 생략 시 미렌더. */
  maxLength?: number;
}

/** 툴바 버튼 선언식 정의 — `.map`으로 렌더. icon은 EditorIcons 또는 span 글리프. */
interface ToolbarButton {
  id: string;
  tip: string;
  icon: ReactNode;
  isActive: () => boolean;
  onCmd: () => void;
}

const makeButtons = (editor: Editor): ToolbarButton[] => [
  {
    id: "bold",
    tip: "굵게 (Ctrl+B)",
    icon: <b className={s.glyph}>B</b>,
    isActive: () => editor.isActive("bold"),
    onCmd: () => editor.chain().focus().toggleBold().run(),
  },
  {
    id: "italic",
    tip: "기울임 (Ctrl+I)",
    icon: <i className={s.glyph}>I</i>,
    isActive: () => editor.isActive("italic"),
    onCmd: () => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: "underline",
    tip: "밑줄 (Ctrl+U)",
    icon: <u className={s.glyph}>U</u>,
    isActive: () => editor.isActive("underline"),
    onCmd: () => editor.chain().focus().toggleUnderline().run(),
  },
  {
    id: "strike",
    tip: "취소선",
    icon: <s className={s.glyph}>S</s>,
    isActive: () => editor.isActive("strike"),
    onCmd: () => editor.chain().focus().toggleStrike().run(),
  },
  {
    id: "bulletList",
    tip: "글머리 목록",
    icon: <IconBulletList />,
    isActive: () => editor.isActive("bulletList"),
    onCmd: () => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    tip: "번호 목록",
    icon: <IconOrderedList />,
    isActive: () => editor.isActive("orderedList"),
    onCmd: () => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "link",
    tip: "링크",
    icon: <IconLink />,
    isActive: () => editor.isActive("link"),
    onCmd: () => {
      const previous = editor.getAttributes("link").href as string | undefined;
      const url = window.prompt("링크 URL을 입력하세요", previous ?? "https://");
      if (url === null) return;
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    },
  },
  {
    id: "blockquote",
    tip: "인용",
    icon: <IconQuote />,
    isActive: () => editor.isActive("blockquote"),
    onCmd: () => editor.chain().focus().toggleBlockquote().run(),
  },
];

/**
 * 코멘트 컴팩트 WYSIWYG 에디터(작성·수정 공용).
 *
 * 본문은 HTML로 직렬화/역직렬화한다(useCommentEditor). 멘션은 `<span data-mention data-id>` 마크업으로
 * round-trip. 툴바는 선언식 버튼 데이터(.map). 첨부는 P3까지 disabled + 툴팁. 하단 바엔 pasteHint·
 * charcount(시각만)·송신 슬롯을 노출하되 등록 버튼은 부모 폼이 책임지고 본 컴포넌트는 본문 입력만 담당.
 */
export function MentionEditor({
  value,
  onChange,
  suggestion,
  ariaLabel,
  placeholder,
  maxLength,
}: MentionEditorProps) {
  const editor = useCommentEditor({
    value,
    onChange,
    suggestion,
    ariaLabel,
    placeholder,
    areaClass: s.area,
  });

  if (!editor) return null;

  const buttons = makeButtons(editor);
  const plainLen = getPlainTextFromHtml(value).length;

  return (
    <div className={s.wrap}>
      <div className={s.toolbar} role="toolbar" aria-label="서식">
        <div className={s.group}>
          {buttons.slice(0, 4).map((b) => (
            <button
              key={b.id}
              type="button"
              className={s.tbtn}
              data-active={b.isActive()}
              data-tip={b.tip}
              aria-label={b.tip}
              aria-pressed={b.isActive()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={b.onCmd}
            >
              {b.icon}
            </button>
          ))}
        </div>
        <span className={s.sep} />
        <div className={s.group}>
          {buttons.slice(4, 6).map((b) => (
            <button
              key={b.id}
              type="button"
              className={s.tbtn}
              data-active={b.isActive()}
              data-tip={b.tip}
              aria-label={b.tip}
              aria-pressed={b.isActive()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={b.onCmd}
            >
              {b.icon}
            </button>
          ))}
        </div>
        <span className={s.sep} />
        <div className={s.group}>
          {buttons.slice(6, 8).map((b) => (
            <button
              key={b.id}
              type="button"
              className={s.tbtn}
              data-active={b.isActive()}
              data-tip={b.tip}
              aria-label={b.tip}
              aria-pressed={b.isActive()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={b.onCmd}
            >
              {b.icon}
            </button>
          ))}
        </div>
        <span className={s.sep} />
        <div className={s.group}>
          {/* 파일 첨부는 P3에서 활성. 시각만 노출 + disabled + 안내 툴팁. */}
          <button
            type="button"
            className={s.tbtn}
            disabled
            aria-disabled
            aria-label="파일 첨부 (P3 지원 예정)"
            data-tip="파일 첨부는 곧 지원돼요"
          >
            <IconAttach />
          </button>
        </div>
      </div>
      <EditorContent editor={editor} />
      <div className={s.editorBar}>
        <span className={s.pasteHint}>
          <IconPaste />
          Word·HWP 서식 붙여넣기 지원
        </span>
        <span className={s.spacer} />
        {maxLength != null && (
          <span className={s.charCount}>
            {plainLen} / {maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
