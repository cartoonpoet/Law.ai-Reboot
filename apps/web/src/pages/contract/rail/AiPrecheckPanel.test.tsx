import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { AiPrecheckPanel } from "./AiPrecheckPanel";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function makeWrapper(contractFiles: ContractRequestForm["contractFiles"]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const methods = useForm<ContractRequestForm>({
      defaultValues: { ...contractRequestDefaults, contractFiles },
    });
    return <FormProvider {...methods}>{children}</FormProvider>;
  };
}

describe("AiPrecheckPanel", () => {
  it("계약서 미첨부 시 안내 문구만 보여준다", () => {
    render(<AiPrecheckPanel />, { wrapper: makeWrapper([]) });
    expect(screen.getByText(/계약서를 첨부하면/)).toBeInTheDocument();
    expect(screen.queryByText("고위험")).not.toBeInTheDocument();
  });

  it("계약서 첨부 시 위험 조항과 요약 배지를 보여준다", () => {
    render(<AiPrecheckPanel />, {
      wrapper: makeWrapper([{ name: "계약서.docx", meta: "DOCX · 1.2MB" }]),
    });
    expect(screen.getByText(/2건 감지/)).toBeInTheDocument();
    expect(screen.getByText("고위험")).toBeInTheDocument();
    expect(screen.getByText("주의")).toBeInTheDocument();
    expect(screen.getByText(/손해배상 한도/)).toBeInTheDocument();
  });
});
