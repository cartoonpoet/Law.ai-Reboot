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
});
