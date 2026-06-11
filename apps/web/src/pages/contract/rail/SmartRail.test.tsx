import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { SmartRail } from "./SmartRail";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><SmartRail /></FormProvider>;
}

describe("SmartRail", () => {
  it("3개 패널 제목을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("작성 현황")).toBeInTheDocument();
    expect(screen.getByText("AI 사전 점검")).toBeInTheDocument();
    expect(screen.getByText("결재선")).toBeInTheDocument();
    expect(screen.queryByText("요청 요약")).not.toBeInTheDocument();
  });

  it("계약서 미첨부 시 AI는 분석 전 안내를 보인다", () => {
    render(<Wrap />);
    expect(screen.getByText(/계약서를 첨부/)).toBeInTheDocument();
  });
});
