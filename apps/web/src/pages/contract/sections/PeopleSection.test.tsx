import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import { PeopleSection } from "./PeopleSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const queryClient = new QueryClient();
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}><PeopleSection /></FormProvider>
    </QueryClientProvider>
  );
}

describe("PeopleSection", () => {
  it("참조수신자/업무담당자 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("참조수신자")).toBeInTheDocument();
    expect(screen.getByText("업무담당자")).toBeInTheDocument();
  });
});
