import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ContractDetailSkeleton } from "./ContractDetailSkeleton";

describe("ContractDetailSkeleton", () => {
  it("lawkit Skeleton placeholder 들을 렌더한다", () => {
    const { container } = render(<ContractDetailSkeleton />);
    // 재설계 레이아웃 형태로 다수의 placeholder div 가 렌더된다(hero/glance 6셀/StepBar/카드/레일).
    expect(container.querySelectorAll("div").length).toBeGreaterThan(20);
    // lawkit Skeleton(rect/circle/text)은 width 가 지정된 placeholder div 로 렌더된다.
    const placeholders = Array.from(container.querySelectorAll("div")).filter(
      (el) => el.getAttribute("style")?.includes("width"),
    );
    expect(placeholders.length).toBeGreaterThan(10);
  });
});
