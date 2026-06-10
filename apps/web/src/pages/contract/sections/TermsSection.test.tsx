import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { TermsSection } from "./TermsSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><TermsSection /></FormProvider>;
}

describe("TermsSection", () => {
  it("협상력/계약 규모 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("계약상대방 협상력")).toBeInTheDocument();
    expect(screen.getByText("계약 규모(대가)")).toBeInTheDocument();
  });
});
