import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  computePageBreaks,
  checkIsSamePagePlan,
  EMPTY_PAGE_PLAN,
  type MeasuredBlockTypes,
  type PagePlanTypes,
} from "./computePageBreaks";
import { PAGE_CONTENT_HEIGHT, PAGE_FILL_VAR, PAGE_PADDING_Y, PAGE_TAIL_VAR } from "./pageMetrics";
import { autoPageSplit } from "./pageLayout.css";

/** 자동으로 넣은 빈칸임을 알리는 표시 — 다시 잴 때 이 높이를 빼야 "원래 위치"가 나온다. */
const FILL_FLAG_ATTR = "data-doc-page-fill";

/** 장 번호 배지 글자(CSS content: attr(...)). 이 값이 없으면 배지를 그리지 않는다. */
const PAGE_LABEL_ATTR = "data-page-label";

const PAGE_BREAK_NODE = "pageBreak";

interface PageLayoutStateTypes {
  plan: PagePlanTypes;
  decorations: DecorationSet;
}

export const pageLayoutKey = new PluginKey<PageLayoutStateTypes>("pageLayout");

/**
 * 지금 화면이 몇 장으로 나뉘어 있는지 — 편집기 하단 "총 N페이지"가 쓴다.
 * 자동 페이지 나눔(withPageLayout)을 켜지 않은 편집기에서는 셀 장이 없으므로 null 이다.
 */
export const getEditorPageCount = (editor: Editor | null): number | null => {
  if (!editor) return null;
  return pageLayoutKey.getState(editor.state)?.plan.pageCount ?? null;
};

const getPlan = (state: EditorState): PagePlanTypes => pageLayoutKey.getState(state)?.plan ?? EMPTY_PAGE_PLAN;

/**
 * 자동으로 나뉜 자리에 끼워 넣는 장식용 div.
 * 문서(JSON/HTML)에는 남지 않는 ProseMirror 위젯이라 저장·docx 변환 결과가 그대로다.
 * 높이만 잰 값(px)이라 DOM 에 CSS 변수로 넣고, 색·여백은 pageLayout.css.ts 가 갖는다.
 */
const createSplitElement = (fillHeight: number, label: string): HTMLElement => {
  const el = document.createElement("div");
  el.className = autoPageSplit;
  el.setAttribute(FILL_FLAG_ATTR, "");
  el.setAttribute(PAGE_LABEL_ATTR, label);
  el.setAttribute("aria-hidden", "true");
  el.contentEditable = "false";
  el.style.setProperty(PAGE_FILL_VAR, `${fillHeight}px`);
  return el;
};

const createDecorations = (plan: PagePlanTypes, doc: ProseMirrorNode): DecorationSet => {
  const decorations: Decoration[] = [];

  plan.breaks.forEach((pageBreak) => {
    const label = `${pageBreak.pageNo}페이지`;
    if (!pageBreak.isManual) {
      decorations.push(
        Decoration.widget(pageBreak.pos, () => createSplitElement(pageBreak.fillHeight, label), {
          side: -1,
          key: `split-${pageBreak.pageNo}-${pageBreak.fillHeight}`,
          ignoreSelection: true,
        }),
      );
      return;
    }
    // 사용자가 넣은 "페이지 나누기" 블록 자체가 장 사이 틈으로 보인다 — 남은 빈칸 높이와 장 번호만 얹는다.
    const node = doc.nodeAt(pageBreak.pos);
    if (!node) return;
    decorations.push(
      Decoration.node(pageBreak.pos, pageBreak.pos + node.nodeSize, {
        [PAGE_LABEL_ATTR]: label,
        style: `${PAGE_FILL_VAR}: ${pageBreak.fillHeight}px`,
      }),
    );
  });

  return DecorationSet.create(doc, decorations);
};

/**
 * 지금 화면을 재서 나눔 계획을 만든다.
 * 이미 넣어 둔 빈칸(위젯) 높이는 빼고 재기 때문에 "나누기 전 원래 위치"가 나오고,
 * 그래서 계산 → 다시 그리기 → 다시 계산이 되돌이에 빠지지 않는다.
 */
const createPagePlan = (view: EditorView): PagePlanTypes => {
  const dom = view.dom as HTMLElement;
  if (!dom.isConnected || dom.getClientRects().length === 0) return EMPTY_PAGE_PLAN;

  const paperTop = dom.getBoundingClientRect().top;
  const fillAbove = new Map<Element, number>();
  let fillSum = 0;
  Array.from(dom.children).forEach((child) => {
    if (child.hasAttribute(FILL_FLAG_ATTR)) {
      fillSum += child.getBoundingClientRect().height;
      return;
    }
    fillAbove.set(child, fillSum);
  });

  const blocks: MeasuredBlockTypes[] = [];
  view.state.doc.forEach((node, offset) => {
    const el = view.nodeDOM(offset);
    if (!(el instanceof HTMLElement)) return;
    const rect = el.getBoundingClientRect();
    blocks.push({
      pos: offset,
      top: rect.top - paperTop - PAGE_PADDING_Y - (fillAbove.get(el) ?? 0),
      height: rect.height,
      isManualBreak: node.type.name === PAGE_BREAK_NODE,
    });
  });

  return computePageBreaks(blocks, PAGE_CONTENT_HEIGHT);
};

/**
 * 화면(DOM)을 재서 나눔 위치를 갱신하는 플러그인 뷰.
 * ProseMirror 뷰는 React 바깥의 명령형 세계라 여기서 DOM 을 직접 재고 만진다(리액트 훅 아님).
 */
const createPageLayoutView = (view: EditorView) => {
  let frameId = 0;

  const measure = () => {
    frameId = 0;
    // 한글을 조합하는 중(가 → 각 → 간)에는 화면을 건드리지 않는다 — 조합이 끊겨 글자가 깨진다.
    // 조합이 끝나면 compositionend 에서 다시 잰다.
    if (view.composing) return;
    const plan = createPagePlan(view);
    // 마지막 장도 A4 한 장으로 꽉 차 보이게 남은 높이를 종이 아래 여백에 더한다.
    view.dom.style.setProperty(PAGE_TAIL_VAR, `${plan.tailHeight}px`);
    if (checkIsSamePagePlan(getPlan(view.state), plan)) return;
    view.dispatch(view.state.tr.setMeta(pageLayoutKey, plan).setMeta("addToHistory", false));
  };

  const scheduleMeasure = () => {
    if (frameId !== 0) return;
    frameId = requestAnimationFrame(measure);
  };

  // 종이 폭이 달라지면 줄바꿈이 바뀐다(창 크기·확대). 높이 변화는 우리가 만든 것이므로 무시한다.
  let lastWidth = view.dom.clientWidth;
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          if (view.dom.clientWidth === lastWidth) return;
          lastWidth = view.dom.clientWidth;
          scheduleMeasure();
        });
  observer?.observe(view.dom);

  // 그림은 다 받은 뒤에야, 글꼴은 다 불러온 뒤에야 높이가 정해진다.
  view.dom.addEventListener("load", scheduleMeasure, true);
  view.dom.addEventListener("compositionend", scheduleMeasure);
  void document.fonts?.ready.then(scheduleMeasure);
  scheduleMeasure();

  return {
    // 글이 바뀔 때만 다시 잰다 — 커서만 움직인 트랜잭션까지 재면 타이핑이 무거워진다.
    update: (updatedView: EditorView, prevState: EditorState) => {
      if (updatedView.state.doc.eq(prevState.doc)) return;
      scheduleMeasure();
    },
    destroy: () => {
      if (frameId !== 0) cancelAnimationFrame(frameId);
      observer?.disconnect();
      view.dom.removeEventListener("load", scheduleMeasure, true);
      view.dom.removeEventListener("compositionend", scheduleMeasure);
    },
  };
};

/**
 * 워드처럼 A4 한 장을 넘치면 다음 장으로 나뉘어 보이게 하는 확장(문서 편집기 전용).
 *
 * 나눔은 **보이기 전용**이다 — 문서에 노드를 넣지 않고 ProseMirror 데코레이션만 얹으므로
 * 저장되는 Tiptap JSON/HTML 과 docx 내보내기 결과는 달라지지 않는다.
 * 블록(문단·표·그림) 한 개는 자르지 않고 통째로 다음 장으로 넘긴다.
 */
export const PageLayout = Extension.create({
  name: "pageLayout",

  addProseMirrorPlugins() {
    return [
      new Plugin<PageLayoutStateTypes>({
        key: pageLayoutKey,
        state: {
          init: () => ({ plan: EMPTY_PAGE_PLAN, decorations: DecorationSet.empty }),
          apply: (tr, value) => {
            const nextPlan = tr.getMeta(pageLayoutKey) as PagePlanTypes | undefined;
            if (nextPlan) return { plan: nextPlan, decorations: createDecorations(nextPlan, tr.doc) };
            if (!tr.docChanged) return value;
            // 다시 재기 전까지는 기존 표시를 글 위치에 맞춰 따라가게 한다.
            return { plan: value.plan, decorations: value.decorations.map(tr.mapping, tr.doc) };
          },
        },
        props: {
          decorations: (state) => pageLayoutKey.getState(state)?.decorations ?? DecorationSet.empty,
        },
        view: createPageLayoutView,
      }),
    ];
  },
});
