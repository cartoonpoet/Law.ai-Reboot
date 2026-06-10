import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RichTextEditor } from "./RichTextEditor";

describe("RichTextEditor", () => {
  it("초기 HTML을 렌더한다", async () => {
    render(<RichTextEditor value="<p>안녕</p>" onChange={() => {}} ariaLabel="배경" />);
    expect(await screen.findByLabelText("배경")).toBeInTheDocument();
  });
});
