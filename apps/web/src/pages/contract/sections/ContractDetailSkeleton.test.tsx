import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContractDetailSkeleton } from "./ContractDetailSkeleton";

describe("ContractDetailSkeleton", () => {
  it("상세 placeholder 루트를 렌더한다", () => {
    render(<ContractDetailSkeleton />);
    expect(screen.getByTestId("contract-detail-skeleton")).toBeInTheDocument();
  });
});
