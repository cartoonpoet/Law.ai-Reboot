import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { DocsSection } from "./DocsSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap({ isFileLocked = false }: { isFileLocked?: boolean }) {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><DocsSection contractId="ct-1" isFileLocked={isFileLocked} /></FormProvider>;
}

describe("DocsSection", () => {
  it("안내 Alert과 계약서 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getAllByText(/워드/).length).toBeGreaterThan(0);
    expect(screen.getByText("계약서")).toBeInTheDocument();
  });

  it("파일 잠금이면 안내 문구를 보여주고 표준양식 추가 버튼을 숨긴다", () => {
    render(<Wrap isFileLocked />);
    expect(screen.getByText(/체결 결재가 시작된 계약이라 계약서는 바꿀 수 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "표준계약서 양식 보기" })).not.toBeInTheDocument();
  });
});
