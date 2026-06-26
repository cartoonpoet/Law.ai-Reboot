import { useEditor, mergeAttributes, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cleanPastedHtml } from "./cleanPastedHtml";
import type { MentionSuggestion } from "../../pages/contract/hooks/useMentionSuggestion";
import { MENTION_CLASS } from "./MentionEditor.css";

interface UseCommentEditorArgs {
  /** 외부 value(HTML 단편). 빈 본문은 `<p></p>` 또는 빈 문자열. */
  value: string;
  /** 편집 시 editor.getHTML() 결과를 상향한다. 빈 본문은 `<p></p>`로 산출됨에 유의. */
  onChange: (html: string) => void;
  /** tiptap suggestion 설정 — useMentionSuggestion이 제공. */
  suggestion: MentionSuggestion;
  ariaLabel: string;
  placeholder?: string;
  /** contenteditable(.ProseMirror) 요소에 부여할 클래스 — 콘텐츠 노드/placeholder globalStyle이
   *  이 클래스를 부모 셀렉터로 쓰므로 래퍼가 아닌 편집 요소에 직접 적용해야 한다. */
  areaClass: string;
}

/**
 * 코멘트 컴팩트 WYSIWYG + 멘션 에디터 훅(SRP — P1 useRichTextEditor 패턴 차용).
 *
 * - StarterKit: 기본 인라인 서식(bold/italic/underline/strike) + List/OrderedList + Link + Blockquote.
 *   heading은 비활성(컴팩트 — 코멘트는 본문/목록만).
 * - Mention: HTML round-trip 가능하도록 `<span data-mention data-id="<userId>">@label</span>`로
 *   직렬화하고 parseHTML도 동일 셀렉터로 매칭(편집 → HTML → 재편집 시 멘션 노드 복원).
 * - Placeholder: 빈 첫 문단 ::before로 입력 텍스트와 동일 흐름에 정렬.
 * - transformPastedHTML: P1 cleanPastedHtml 재사용 — Word/HWP MSO 잔재 정제.
 *
 * 외부 value 동기화는 P1 패턴과 동일한 effect 1곳(승인 예외). 신규 effect 0.
 */
export const useCommentEditor = ({
  value,
  onChange,
  suggestion,
  ariaLabel,
  placeholder,
  areaClass,
}: UseCommentEditorArgs): Editor | null => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 코멘트는 컴팩트 — heading은 미노출(시안 h4는 시각 슬롯만, 실제 입력은 본문/목록/인용).
        heading: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      // Mention 확장 — `<span data-mention data-id>` 셀렉터로 round-trip(편집 → HTML → 재편집).
      // parseHTML/renderHTML을 `data-mention` 셀렉터로 통일해 P2 직렬화 규약과 1:1 일치시킨다.
      Mention.extend({
        parseHTML() {
          return [{ tag: "span[data-mention]" }];
        },
        renderHTML({ node, HTMLAttributes }) {
          const label = (node.attrs.label as string | null) ?? (node.attrs.id as string);
          return [
            "span",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
              "data-mention": "",
              "data-id": node.attrs.id,
              class: MENTION_CLASS,
            }),
            `@${label}`,
          ];
        },
      }).configure({
        HTMLAttributes: { class: MENTION_CLASS },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        suggestion,
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { "aria-label": ariaLabel, class: areaClass },
      transformPastedHTML: cleanPastedHtml,
    },
  });

  // 외부 value → 에디터 동기화. tiptap은 명령형 에디터 인스턴스라 외부 value 변경(폼 reset·
  // 수정모드 defaults·다른 코멘트 재진입)을 선언적으로 반영할 수 없어 setContent가 필요하다.
  // CLAUDE.md effect 금지의 승인된 선례(P1 useRichTextEditor와 동일) — 에디터 동기화 1곳 한정.
  // onUpdate 미발생(emitUpdate:false)으로 루프를 방지한다.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  return editor;
};
