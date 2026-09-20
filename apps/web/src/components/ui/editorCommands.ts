import type { Editor } from "@tiptap/react";
import { ACCENT_COLOR } from "./useRichTextEditor";

/**
 * 링크 걸기·풀기 — 짧은 에디터와 문서 편집기 풀 툴바가 같이 쓴다.
 * 빈 값으로 확인하면 링크를 푼다.
 */
export const promptForLink = (editor: Editor) => {
  const previous = editor.getAttributes("link").href as string | undefined;
  const input = window.prompt("링크 URL을 입력하세요", previous ?? "https://");
  if (input === null) return;
  if (input.trim() === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: input.trim() }).run();
};

/** 지금 선택에 강조색이 걸려 있는지 — 렌더 중 파생. */
export const getIsAccentColorActive = (editor: Editor): boolean => editor.isActive("textStyle", { color: ACCENT_COLOR });

/** 글자색(강조색) 켜기·끄기. */
export const toggleAccentColor = (editor: Editor) => {
  if (getIsAccentColorActive(editor)) editor.chain().focus().unsetColor().run();
  else editor.chain().focus().setColor(ACCENT_COLOR).run();
};
