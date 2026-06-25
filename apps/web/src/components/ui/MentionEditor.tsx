import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  parseMentionMarkup,
  serializeMention,
  type MentionSegment,
} from "../../pages/contract/utils/mentionMarkup";
import type { MentionSuggestion } from "../../pages/contract/hooks/useMentionSuggestion";
import * as s from "./MentionEditor.css";
import { MENTION_CLASS } from "./MentionEditor.css";

interface MentionEditorProps {
  /** 초기/외부 body 마크업(@[이름](userId)). 수정모드 진입 시 노드로 복원된다. */
  value: string;
  /** 편집 시 직렬화한 body 마크업을 상향한다. */
  onChange: (body: string) => void;
  /** tiptap suggestion 설정 — useMentionSuggestion이 제공. */
  suggestion: MentionSuggestion;
  ariaLabel: string;
  placeholder?: string;
}

/** 마크업 세그먼트 → ProseMirror 문단 JSON. 텍스트의 줄바꿈은 문단 분리로 복원한다. */
const buildDoc = (segments: MentionSegment[]): JSONContent => {
  const paragraphs: JSONContent[] = [{ type: "paragraph", content: [] }];
  const pushInline = (node: JSONContent) => {
    const current = paragraphs[paragraphs.length - 1];
    (current.content ??= []).push(node);
  };
  segments.forEach((segment) => {
    if (segment.type === "mention") {
      pushInline({ type: "mention", attrs: { id: segment.userId, label: segment.name } });
      return;
    }
    const lines = segment.value.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) paragraphs.push({ type: "paragraph", content: [] });
      if (line.length > 0) pushInline({ type: "text", text: line });
    });
  });
  return { type: "doc", content: paragraphs };
};

/** 에디터 JSON → body 마크업. 문단은 줄바꿈으로, 멘션 노드는 @[label](id)로 직렬화한다. */
const serializeDoc = (doc: JSONContent): string => {
  const paragraphs = doc.content ?? [];
  return paragraphs
    .map((paragraph) =>
      (paragraph.content ?? [])
        .map((node) => {
          if (node.type === "mention") {
            const { label, id } = node.attrs ?? {};
            return serializeMention(String(label ?? ""), String(id ?? ""));
          }
          return node.text ?? "";
        })
        .join(""),
    )
    .join("\n");
};

/**
 * 코멘트 전용 tiptap 멘션 에디터(작성·수정 공용).
 * RichTextEditor 패턴 차용: immediatelyRender:false, editorProps.attributes, 외부 value 동기화 effect.
 */
export function MentionEditor({
  value,
  onChange,
  suggestion,
  ariaLabel,
  placeholder,
}: MentionEditorProps) {
  const editor = useEditor({
    extensions: [
      // 코멘트는 인라인 텍스트 + 멘션만 필요 → 블록 서식(목록/인용/제목)은 쓰지 않는다.
      // 툴바가 없어 사용자가 마크를 켤 수 없으므로 StarterKit 기본 구성으로 충분하다.
      StarterKit,
      Mention.configure({
        HTMLAttributes: { class: MENTION_CLASS },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        suggestion,
      }),
      // placeholder는 빈 첫 문단 ::before로 렌더돼 입력 텍스트와 동일한 흐름(padding/lineHeight)에
      // 정렬된다 — 기존 절대배치 span은 블록 baseline과 어긋나 제거했다.
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: buildDoc(parseMentionMarkup(value)),
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(serializeDoc(editor.getJSON())),
    editorProps: { attributes: { "aria-label": ariaLabel, class: s.area } },
  });

  // 외부 value → 에디터 동기화. tiptap은 명령형 에디터 인스턴스라 외부 value 변경(예: 제출 후
  // 초기화·다른 코멘트로 재진입)을 선언적으로 반영할 수 없어 setContent가 필요하다.
  // CLAUDE.md effect 금지의 승인된 선례(RichTextEditor)와 동일 사유 — 에디터 동기화 1곳 한정.
  useEffect(() => {
    if (!editor) return;
    if (serializeDoc(editor.getJSON()) !== value) {
      editor.commands.setContent(buildDoc(parseMentionMarkup(value)), { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={s.wrap}>
      <EditorContent editor={editor} />
    </div>
  );
}
