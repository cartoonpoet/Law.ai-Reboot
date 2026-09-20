import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RichTextEditor } from "./RichTextEditor";

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
});
