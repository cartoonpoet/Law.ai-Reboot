import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
  type IRunOptions,
} from "docx";

// 지원 범위는 정확히 RichTextEditor 툴바가 지원하는 것과 같다:
// 제목(1~3)·문단·굵게/기울임/밑줄/취소선·글자색·하이라이트·글머리/번호 목록(중첩)·정렬·표·구분선.
interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

const HEADING_LEVELS: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
};

const ALIGNMENTS: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

// 색은 "#rrggbb" 형태만 지원(에디터 색상 선택기가 이 형태로만 저장한다) — # 은 docx 가 받지 않으므로 뗀다.
const toDocxColor = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const hex = value.replace("#", "");
  return /^[0-9a-fA-F]{6}$/.test(hex) ? hex : undefined;
};

// docx 의 highlight 는 고정 팔레트(HighlightColor)만 받는다 — 에디터의 임의 hex 는 지원 팔레트가 하나뿐이라 항상 이 값으로 맞춘다.
const mapHighlightColor = (): "yellow" => "yellow";

// docx@9 의 IRunOptions 필드는 readonly 다 — 마크마다 새 옵션 객체를 스프레드로 만들어 쌓는다(직접 대입 금지).
const buildRunOptions = (node: TiptapNode): IRunOptions => {
  let options: IRunOptions = { text: node.text ?? "" };
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") options = { ...options, bold: true };
    if (mark.type === "italic") options = { ...options, italics: true };
    if (mark.type === "underline") options = { ...options, underline: {} };
    if (mark.type === "strike") options = { ...options, strike: true };
    if (mark.type === "textStyle") {
      const color = toDocxColor(mark.attrs?.color);
      if (color) options = { ...options, color };
    }
    if (mark.type === "highlight") {
      options = { ...options, highlight: mapHighlightColor() };
    }
  }
  return options;
};

const buildRuns = (nodes: TiptapNode[] = []): TextRun[] =>
  nodes
    .filter((node) => node.type === "text" && typeof node.text === "string")
    .map((node) => new TextRun(buildRunOptions(node)));

const buildParagraph = (
  node: TiptapNode,
  listMeta?: { ordered: boolean; level: number; reference?: string },
): Paragraph => {
  const align = ALIGNMENTS[(node.attrs?.textAlign as string) ?? ""] ?? undefined;
  return new Paragraph({
    heading: node.type === "heading" ? HEADING_LEVELS[(node.attrs?.level as number) ?? 1] : undefined,
    alignment: align,
    bullet: listMeta && !listMeta.ordered ? { level: listMeta.level } : undefined,
    numbering: listMeta?.ordered && listMeta.reference ? { reference: listMeta.reference, level: listMeta.level } : undefined,
    children: buildRuns(node.content),
  });
};

// 목록(listItem)은 자기 문단들 + 중첩 목록을 재귀로 펼친다. level 은 중첩 깊이(0부터).
// reference 는 이 목록이 속한 "최상위 번호목록 트리"의 numbering reference — 아직 없으면(=이 서브트리에서 처음
// 만나는 orderedList) allocateReference 로 새로 하나 발급받아 자신과 하위(중첩) orderedList 전체가 공유한다.
// 서로 다른 최상위 목록(형제 관계)은 buildBlocks 가 매번 reference=undefined 로 새로 호출하므로 서로 섞이지 않는다.
const buildListItems = (
  list: TiptapNode,
  ordered: boolean,
  level: number,
  reference: string | undefined,
  allocateReference: () => string,
): Paragraph[] => {
  const resolvedReference = ordered ? (reference ?? allocateReference()) : reference;
  const items: Paragraph[] = [];
  for (const item of list.content ?? []) {
    for (const child of item.content ?? []) {
      if (child.type === "paragraph") {
        items.push(buildParagraph(child, { ordered, level, reference: resolvedReference }));
      } else if (child.type === "bulletList") {
        items.push(...buildListItems(child, false, level + 1, resolvedReference, allocateReference));
      } else if (child.type === "orderedList") {
        items.push(...buildListItems(child, true, level + 1, resolvedReference, allocateReference));
      }
    }
  }
  return items;
};

const buildTable = (node: TiptapNode): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: (node.content ?? []).map(
      (row) =>
        new TableRow({
          children: (row.content ?? []).map(
            (cell) =>
              new TableCell({
                children: (cell.content ?? []).map((cellChild) => buildParagraph(cellChild)),
              }),
          ),
        }),
    ),
  });

// 최상위(buildBlocks 레벨)에서 orderedList 를 만날 때마다 collectReference 로 새 reference 를 보고한다 —
// 문서 전체의 numbering.config 를 실제 등장한 최상위 번호목록 개수만큼 동적으로 만들기 위해서다.
const buildBlocks = (nodes: TiptapNode[], collectReference: (reference: string) => void): (Paragraph | Table)[] => {
  const blocks: (Paragraph | Table)[] = [];
  let orderedListCount = 0;
  const allocateReference = (): string => {
    const reference = `ordered-${orderedListCount}`;
    orderedListCount += 1;
    collectReference(reference);
    return reference;
  };
  for (const node of nodes) {
    if (node.type === "heading" || node.type === "paragraph") {
      blocks.push(buildParagraph(node));
    } else if (node.type === "bulletList") {
      blocks.push(...buildListItems(node, false, 0, undefined, allocateReference));
    } else if (node.type === "orderedList") {
      blocks.push(...buildListItems(node, true, 0, undefined, allocateReference));
    } else if (node.type === "table") {
      blocks.push(buildTable(node));
    } else if (node.type === "horizontalRule") {
      blocks.push(new Paragraph({ border: { bottom: { color: "888888", space: 1, style: "single", size: 6 } } }));
    }
    // 지원하지 않는 노드 타입은 조용히 건너뛴다(스펙: "지원하는 노드/마크만 다룬다").
  }
  return blocks;
};

const buildNumberingConfig = (reference: string) => ({
  reference,
  levels: [0, 1, 2, 3].map((level) => ({
    level,
    format: "decimal" as const,
    text: "%1.",
    alignment: AlignmentType.START,
    style: { paragraph: { indent: { left: convertInchesToTwip(0.5 * (level + 1)), hanging: convertInchesToTwip(0.25) } } },
  })),
});

/** Tiptap JSON(에디터 정본) → 실제 .docx 바이트. 파일로 저장하지 않는 stateless 변환. */
export const tiptapJsonToDocx = async (doc: Record<string, unknown>): Promise<Buffer> => {
  const nodes = (doc.content as TiptapNode[] | undefined) ?? [];
  const orderedListReferences: string[] = [];
  const blocks = buildBlocks(nodes, (reference) => orderedListReferences.push(reference));
  const document = new Document({
    numbering: { config: orderedListReferences.map(buildNumberingConfig) },
    sections: [{ children: blocks }],
  });
  return Packer.toBuffer(document);
};
