import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ContractDetailPage } from "./ContractDetailPage";

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/contract/${id}`]}>
      <Routes>
        <Route path="/contract/:id" element={<ContractDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ContractDetailPage", () => {
  it("URL의 계약 id에 해당하는 계약명을 렌더한다", () => {
    renderAt("C20260601-0007");
    expect(screen.getByText("사후계약관리 표준 NDA")).toBeInTheDocument();
  });

  it("AI 계약 리스크 섹션과 고위험 조항을 렌더한다", () => {
    renderAt("C20250710-0004");
    expect(screen.getByText("AI 계약 리스크")).toBeInTheDocument();
    expect(screen.getByText("손해배상 한도")).toBeInTheDocument();
  });

  it("검토 의견 섹션을 렌더한다", () => {
    renderAt("C20250710-0004");
    expect(screen.getByText("검토 의견")).toBeInTheDocument();
  });
});
