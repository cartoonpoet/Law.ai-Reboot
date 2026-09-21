import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      /** 커서 자리에 "페이지 나누기" 블록을 넣는다. */
      setPageBreak: () => ReturnType;
    };
  }
}

/**
 * 문서 편집기 전용 "페이지 나누기" 블록.
 * 기본 화면에서는 점선 + 라벨로만 보이고(스타일은 RichTextEditor.css 의 data-page-break 룰),
 * 인쇄·워드 변환 시 여기서 쪽이 나뉜다는 표시 역할을 한다.
 * 종이 캔버스(자동 페이지 나눔, pageLayoutExtension)에서는 이 블록이 장과 장 사이 회색 틈으로 보이고,
 * 남은 빈칸 높이와 쪽 번호를 그 확장이 얹어 준다.
 */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML: () => [{ tag: "div[data-page-break]" }],

  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-page-break": "" })],

  addCommands: () => ({
    setPageBreak:
      () =>
      ({ chain }) =>
        chain().insertContent({ type: "pageBreak" }).run(),
  }),
});
