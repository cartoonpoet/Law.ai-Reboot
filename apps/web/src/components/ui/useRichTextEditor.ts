import { useEditor, type Editor } from "@tiptap/react";
import type { Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cleanPastedHtml } from "./cleanPastedHtml";

/**
 * 글자색 토글이 문서에 기록하는 색 — 시안 swatch(.sw-color, danger 계열)와 일치.
 * tiptap Color 확장은 이 값을 콘텐츠 HTML(style="color:...")로 직렬화하므로 themeVars(CSS var)가
 * 아니라 구체 색 리터럴이 필요하다(저장 데이터 값이지 스타일 토큰이 아님). lawkit danger와 동일 hex.
 */
export const ACCENT_COLOR = "#b12a30";

/**
 * 모든 RichTextEditor 인스턴스에 항상 켜지는 기본 확장 목록(표·워드 리본 확장 등 `extraExtensions`로
 * 옵션에 따라 붙는 것은 제외 — RichTextEditor.tsx의 TABLE_EXTENSIONS/FULL_TOOLBAR_EXTENSIONS로 남는다).
 * documentEditor/tiptapContent.ts가 문서 편집기 콘텐츠 HTML⇄JSON 변환 스키마 기준으로도 재사용한다.
 */
export const BASE_EDITOR_EXTENSIONS: Extensions = [
  // StarterKit 3.x는 underline·link를 기본 번들 → 별도 설치 확장은 중복 경고가 나므로
  // StarterKit 설정으로 link만 시안 동작(새 탭·rel·클릭열림 끔)에 맞춘다. underline은 기본값 사용.
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight,
  TextStyle,
  Color,
];

interface UseRichTextEditorArgs {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
  /** contenteditable(.ProseMirror) 자체에 부여할 클래스 — 콘텐츠 노드/placeholder globalStyle이
   *  이 클래스를 부모 셀렉터로 쓰므로 래퍼가 아닌 편집 요소에 직접 적용해야 한다. */
  areaClass: string;
  /** 기본 확장에 덧붙일 확장(문서 편집기의 표 등). 넘기지 않으면 지금 동작 그대로. */
  extraExtensions?: Extensions;
}

/**
 * RichTextEditor 로직(에디터 인스턴스·확장·붙여넣기 정제·외부 value 동기화)을 분리한 커스텀 훅(SRP).
 * 컴포넌트는 뷰(툴바 마크업·버튼 배선)에 집중한다.
 */
export const useRichTextEditor = ({
  value,
  onChange,
  ariaLabel,
  placeholder,
  areaClass,
  extraExtensions = [],
}: UseRichTextEditorArgs): Editor | null => {
  const editor = useEditor({
    extensions: [
      ...BASE_EDITOR_EXTENSIONS,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      ...extraExtensions,
    ],
    content: value,
    immediatelyRender: false,
    // 툴바의 켜짐 표시(굵게·정렬 등)와 선택 영역에 따라 뜨는 버튼은 매 트랜잭션마다 다시 그려야 맞는다.
    // tiptap 3은 이 값이 기본 false 라 켜 주지 않으면 툴바가 이전 상태에 머문다.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { "aria-label": ariaLabel, class: areaClass },
      // Word·HWP 붙여넣기를 ProseMirror가 파싱하기 전에 MSO 잔재를 정제한다(순수 함수).
      transformPastedHTML: cleanPastedHtml,
    },
  });

  // 외부 value → 에디터 동기화. tiptap은 명령형 에디터 인스턴스라 외부 value 변경(폼 reset·수정모드
  // defaults)을 선언적으로 반영할 수 없어 setContent가 필요하다 — CLAUDE.md effect 금지의 승인된
  // 선례(에디터 동기화 1곳 한정). onUpdate 미발생(emitUpdate:false)으로 루프를 방지한다.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  return editor;
};
