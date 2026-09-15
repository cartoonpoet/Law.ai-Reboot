import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { LinkedContractsCard } from "./LinkedContractsCard";

describe("LinkedContractsCard", () => {
  it("원 계약과 갱신·해지 계약을 각각 그 계약 상세로 가는 링크로 보여준다", () => {
    render(
      <MemoryRouter>
        <LinkedContractsCard
          linked={{
            origin: { id: "o1", code: "C20251010-0412", title: "IDC 입주 계약", status: "계약 종료", stage: "신규계약" },
            derived: [{ id: "r1", code: "C20260916-0100", title: "IDC 입주 계약 (갱신)", status: "법무 검토 중", stage: "갱신계약" }],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /원 계약.*IDC 입주 계약/ })).toHaveAttribute("href", "/contract/o1");
    const renewal = screen.getByRole("link", { name: /갱신계약.*IDC 입주 계약 \(갱신\)/ });
    expect(renewal).toHaveAttribute("href", "/contract/r1");
    expect(screen.getByText("C20260916-0100 · 법무 검토 중")).toBeInTheDocument();
  });
});
