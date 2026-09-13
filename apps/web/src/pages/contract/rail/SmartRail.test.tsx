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

  it("AI 사전 점검 자리에는 저장 후 자동 분석 안내 문구만 보인다", () => {
    render(<Wrap />);
    expect(screen.getByText("저장 후 AI가 자동으로 사전 점검합니다.")).toBeInTheDocument();
  });
});
