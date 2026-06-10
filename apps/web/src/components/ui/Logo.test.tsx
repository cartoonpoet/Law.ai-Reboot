import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("Prism 마크를 두 개의 path로 렌더한다", () => {
    const { container } = render(<Logo />);
    expect(container.querySelectorAll("path").length).toBe(2);
  });

  it("같은 페이지에 여러 개 떠도 그라디언트 ID가 인스턴스마다 유니크하다", () => {
    const { container } = render(
      <>
        <Logo />
        <Logo />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("linearGradient")).map(
      (g) => g.id,
    );
    expect(ids.length).toBe(4);
    expect(new Set(ids).size).toBe(4);
  });

  it("size prop을 svg width/height에 반영한다", () => {
    const { container } = render(<Logo size={40} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("40");
    expect(svg.getAttribute("height")).toBe("40");
  });
});
