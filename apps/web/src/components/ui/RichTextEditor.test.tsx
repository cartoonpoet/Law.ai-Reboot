import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { RichTextEditor } from "./RichTextEditor";
import { getEditorPageCount } from "./editorExtensions/pageLayoutExtension";
import { PAGE_PADDING_Y, PAGE_SPLIT_HEIGHT } from "./editorExtensions/pageMetrics";

/** 수동 페이지 나누기가 든 문서 — 자동 나눔을 켜도 이 내용이 그대로 저장돼야 한다. */
const DOC_HTML =
  '<h1>비밀유지계약서</h1><p>제1조 목적</p><div data-page-break=""></div><p>제2조 비밀유지</p>';

/** 흉내 낼 블록 한 개의 높이 — 두 개면 A4 한 장(내용 934px)을 넘긴다. */
const STUB_BLOCK_HEIGHT = 500;

const createRect = (top: number, height: number): DOMRect =>
  ({ top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

/** 장을 넘기며 채운 빈칸 높이(자동 위젯·수동 나누기 모두 CSS 변수로 들고 있다). */
const getStubHeight = (el: Element): number => {
  const isSplit = el.hasAttribute("data-doc-page-fill") || el.hasAttribute("data-page-break");
  if (!isSplit) return STUB_BLOCK_HEIGHT;
  return (parseFloat((el as HTMLElement).style.getPropertyValue("--doc-page-fill")) || 0) + PAGE_SPLIT_HEIGHT;
};

/**
 * jsdom 은 높이를 재지 못해(모든 값 0) 자동 나눔이 일어나지 않는다.
 * 종이(.ProseMirror) 안 블록들이 차곡차곡 쌓인 것처럼 높이를 흉내 내서 실제 나눔을 확인한다.
 */
const stubBlockHeights = () => {
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(
    () => [createRect(0, 1)] as unknown as DOMRectList,
  );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.classList.contains("ProseMirror")) return createRect(0, STUB_BLOCK_HEIGHT);
    const paper = this.parentElement;
    if (!paper?.classList.contains("ProseMirror")) return createRect(0, 0);
    let top = PAGE_PADDING_Y;
    for (const sibling of Array.from(paper.children)) {
      if (sibling === this) break;
      top += getStubHeight(sibling);
    }
    return createRect(top, getStubHeight(this));
  });
};

describe("RichTextEditor", () => {
  it("초기 HTML을 ariaLabel로 렌더한다", async () => {
    render(<RichTextEditor value="<p>안녕</p>" onChange={() => {}} ariaLabel="배경" />);
    expect(await screen.findByLabelText("배경")).toBeInTheDocument();
  });

  it("풀 툴바 버튼(밑줄·정렬·링크·서식지우기)을 렌더한다", async () => {
    render(<RichTextEditor value="<p>x</p>" onChange={() => {}} ariaLabel="내용" />);
    await screen.findByLabelText("내용");
    expect(screen.getByLabelText("굵게 (Ctrl+B)")).toBeInTheDocument();
    expect(screen.getByLabelText("밑줄 (Ctrl+U)")).toBeInTheDocument();
    expect(screen.getByLabelText("왼쪽 정렬")).toBeInTheDocument();
    expect(screen.getByLabelText("가운데 정렬")).toBeInTheDocument();
    expect(screen.getByLabelText("링크")).toBeInTheDocument();
    expect(screen.getByLabelText("하이라이트")).toBeInTheDocument();
    expect(screen.getByLabelText("문단 스타일")).toBeInTheDocument();
    expect(screen.getByLabelText("서식 지우기")).toBeInTheDocument();
  });

  it("옵션을 안 넘기면 짧은 툴바 그대로다 — 버튼 17개, 문서 편집기 도구는 없다", async () => {
    const { container } = render(<RichTextEditor value="<p>x</p>" onChange={() => {}} ariaLabel="내용" />);
    await screen.findByLabelText("내용");
    expect(container.querySelectorAll("button")).toHaveLength(17);
    expect(screen.queryByLabelText("양쪽 정렬")).toBeNull();
    expect(screen.queryByLabelText("실행 취소 (Ctrl+Z)")).toBeNull();
    expect(screen.queryByLabelText("찾기·바꾸기")).toBeNull();
    expect(screen.queryByLabelText("그림 넣기 (로고·인감)")).toBeNull();
    expect(screen.queryByLabelText("페이지 나누기")).toBeNull();
    expect(screen.queryByLabelText("위 첨자")).toBeNull();
  });

  it("withFullToolbar 를 켜면 워드 리본 도구가 모두 나온다", async () => {
    render(<RichTextEditor value="<p>x</p>" onChange={() => {}} ariaLabel="문서" withTable withFullToolbar />);
    await screen.findByLabelText("문서");
    expect(screen.getByLabelText("위 첨자")).toBeInTheDocument();
    expect(screen.getByLabelText("아래 첨자")).toBeInTheDocument();
    expect(screen.getByLabelText("양쪽 정렬")).toBeInTheDocument();
    expect(screen.getByLabelText("실행 취소 (Ctrl+Z)")).toBeInTheDocument();
    expect(screen.getByLabelText("다시 실행 (Ctrl+Shift+Z)")).toBeInTheDocument();
    expect(screen.getByLabelText("찾기·바꾸기")).toBeInTheDocument();
    expect(screen.getByLabelText("그림 넣기 (로고·인감)")).toBeInTheDocument();
    expect(screen.getByLabelText("페이지 나누기")).toBeInTheDocument();
    expect(screen.getByLabelText("표 넣기 (3×3)")).toBeInTheDocument();
  });

  it("A4 한 장을 넘으면 저절로 장이 나뉘고, 그래도 저장되는 내용(HTML)은 그대로다 — 보이기 전용", async () => {
    stubBlockHeights();
    render(
      <>
        <RichTextEditor
          value={DOC_HTML}
          onChange={() => {}}
          ariaLabel="나눔 켬"
          withTable
          withFullToolbar
          withPageLayout
          renderFooterExtra={(editor) => (
            <>
              <span data-testid="html-on">{editor.getHTML()}</span>
              <span data-testid="pages-on">{getEditorPageCount(editor)}</span>
            </>
          )}
        />
        <RichTextEditor
          value={DOC_HTML}
          onChange={() => {}}
          ariaLabel="나눔 끔"
          withTable
          withFullToolbar
          renderFooterExtra={(editor) => <span data-testid="html-off">{editor.getHTML()}</span>}
        />
      </>,
    );
    const paper = await screen.findByLabelText("나눔 켬");

    // 문단 두 개(1000px)가 한 장(934px)을 넘기므로 둘째 문단 앞에서 저절로 나뉜다.
    await waitFor(() => expect(paper.querySelectorAll("[data-doc-page-fill]")).toHaveLength(1));
    expect(paper.querySelector("[data-doc-page-fill]")?.getAttribute("data-page-label")).toBe("2페이지");
    // 자동 나눔 1곳 + 수동 나누기 1곳 = 3장.
    expect(paper.querySelector("div[data-page-break]")?.getAttribute("data-page-label")).toBe("3페이지");
    expect(screen.getByTestId("pages-on").textContent).toBe("3");

    const savedHtml = screen.getByTestId("html-on").textContent;
    expect(savedHtml).toBe(screen.getByTestId("html-off").textContent);
    expect(savedHtml).toContain("data-page-break");
    // 나눔 표시는 데코레이션이라 문서에 남지 않는다.
    expect(savedHtml).not.toContain("data-doc-page-fill");
    expect(savedHtml).not.toContain("data-page-label");
  });

  it("자동 나눔을 켜지 않은 편집기는 셀 장이 없어 총 페이지 수를 내놓지 않는다", async () => {
    render(
      <RichTextEditor
        value={DOC_HTML}
        onChange={() => {}}
        ariaLabel="문서"
        withTable
        withFullToolbar
        renderFooterExtra={(editor) => {
          const pageCount = getEditorPageCount(editor);
          if (pageCount === null) return null;
          return <span>{`총 ${pageCount}페이지`}</span>;
        }}
      />,
    );
    await screen.findByLabelText("문서");
    expect(screen.queryByText(/총 \d+페이지/)).toBeNull();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
