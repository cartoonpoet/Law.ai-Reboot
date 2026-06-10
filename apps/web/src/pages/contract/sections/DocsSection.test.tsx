import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { DocsSection } from "./DocsSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><DocsSection /></FormProvider>;
}

describe("DocsSection", () => {
  it("안내 Alert과 계약서 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getAllByText(/워드/).length).toBeGreaterThan(0);
    expect(screen.getByText("계약서")).toBeInTheDocument();
  });
});
