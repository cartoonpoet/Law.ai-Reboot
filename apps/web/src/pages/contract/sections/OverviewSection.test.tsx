import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { OverviewSection } from "./OverviewSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><OverviewSection /></FormProvider>;
}

describe("OverviewSection", () => {
  it("핵심 필드 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("계약명")).toBeInTheDocument();
    expect(screen.getByText("계약 분류")).toBeInTheDocument();
    expect(screen.getByText("상대 계약자 정보")).toBeInTheDocument();
  });
});
