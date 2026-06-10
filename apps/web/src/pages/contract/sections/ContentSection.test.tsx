import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { ContentSection } from "./ContentSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><ContentSection /></FormProvider>;
}

describe("ContentSection", () => {
  it("4개 에디터 라벨을 렌더한다", async () => {
    render(<Wrap />);
    expect(await screen.findByLabelText("계약 지급 조건", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByLabelText("계약의 배경 및 목적", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByLabelText("주요 협의사항", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByLabelText("요청부서의 우려사항 및 기타 고려사항", {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
