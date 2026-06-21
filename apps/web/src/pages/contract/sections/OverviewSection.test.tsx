import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import { OverviewSection } from "./OverviewSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}>
        <OverviewSection />
      </FormProvider>
    </QueryClientProvider>
  );
}

describe("OverviewSection", () => {
  it("핵심 필드 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("계약명")).toBeInTheDocument();
    expect(screen.getByText("계약 분류")).toBeInTheDocument();
    expect(screen.getByText("상대 계약자 정보")).toBeInTheDocument();
  });
});
