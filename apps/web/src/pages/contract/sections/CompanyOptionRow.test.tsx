import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { Company } from "@lawai/contracts";
import { CompanyOptionRow } from "./CompanyOptionRow";

const company = (over: Partial<Company> = {}): Company => ({
  id: "a", type: "company", name: "삼성전자(주)", bizNo: "123-45-67890",
  ceo: "이재용", phone: "02-1234-5678", address: "서울", addressDetail: null,
  managerName: null, managerPhone: null, managerEmail: null, createdAt: "",
  ...over,
});

describe("CompanyOptionRow", () => {
  it("회사 정보와 '회사' 배지를 렌더한다", () => {
    render(<CompanyOptionRow company={company()} selected={false} />);
    expect(screen.getByText("삼성전자(주)")).toBeInTheDocument();
    expect(screen.getByText("회사")).toBeInTheDocument();
    expect(screen.getByText(/123-45-67890/)).toBeInTheDocument();
    expect(screen.getByText(/이재용/)).toBeInTheDocument();
  });

  it("개인은 '개인' 배지를 렌더한다", () => {
    render(<CompanyOptionRow company={company({ type: "individual", name: "홍길동" })} selected={false} />);
    expect(screen.getByText("개인")).toBeInTheDocument();
  });

  it("TEMP- 사업자번호는 '임시번호 자동생성' 배지를 렌더한다", () => {
    render(<CompanyOptionRow company={company({ bizNo: "TEMP-xyz" })} selected={false} />);
    expect(screen.getByText("임시번호 자동생성")).toBeInTheDocument();
  });
});
