import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphLineHeight: {
      /** 문단·제목의 줄 간격을 바꾼다. 값은 "1.5" 처럼 배수 문자열. */
      setParagraphLineHeight: (lineHeight: string) => ReturnType;
    };
  }
}

/** 줄 간격이 붙는 블록 노드 — 문단과 제목. */
const LINE_HEIGHT_TYPES = ["paragraph", "heading"];

/**
 * 줄 간격 확장.
 * tiptap 기본 LineHeight 는 값을 inline span(textStyle)에 넣어 화면에 효과가 없어서,
 * 문단·제목 노드 속성으로 직접 넣는 작은 확장을 따로 둔다.
 */
export const ParagraphLineHeight = Extension.create({
  name: "paragraphLineHeight",

  addGlobalAttributes: () => [
    {
      types: LINE_HEIGHT_TYPES,
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
          renderHTML: (attributes: Record<string, unknown>) =>
            attributes.lineHeight ? { style: `line-height: ${String(attributes.lineHeight)}` } : {},
        },
      },
    },
  ],

  addCommands: () => ({
    setParagraphLineHeight:
      (lineHeight: string) =>
      ({ commands }) =>
        LINE_HEIGHT_TYPES.map((type) =>
          commands.updateAttributes(type, { lineHeight: lineHeight === "" ? null : lineHeight }),
        ).some(Boolean),
  }),
});

/** 지금 커서가 놓인 문단·제목의 줄 간격 값(없으면 null) — 렌더 중 파생. */
export const getActiveLineHeight = (editor: Editor): string | null => {
  const fromHeading = editor.getAttributes("heading").lineHeight as string | undefined;
  const fromParagraph = editor.getAttributes("paragraph").lineHeight as string | undefined;
  return fromHeading ?? fromParagraph ?? null;
};
