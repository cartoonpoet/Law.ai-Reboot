import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("'+ 추가'로 URL 입력을 추가하고 '삭제'로 제거한다", async () => {
    const user = userEvent.setup();
    render(<Wrap />);
    expect(screen.queryByPlaceholderText("https://example.com")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ 추가" }));
    const urlInput = screen.getByPlaceholderText("https://example.com");
    await user.type(urlInput, "https://law.ai");
    expect(urlInput).toHaveValue("https://law.ai");
    await user.click(screen.getByRole("button", { name: "URL 삭제" }));
    expect(screen.queryByPlaceholderText("https://example.com")).not.toBeInTheDocument();
  });

  it("'+ 추가'를 여러 번 누르면 URL 입력이 여러 개 생긴다", async () => {
    const user = userEvent.setup();
    render(<Wrap />);
    await user.click(screen.getByRole("button", { name: "+ 추가" }));
    await user.click(screen.getByRole("button", { name: "+ 추가" }));
    expect(screen.getAllByPlaceholderText("https://example.com")).toHaveLength(2);
  });
});
