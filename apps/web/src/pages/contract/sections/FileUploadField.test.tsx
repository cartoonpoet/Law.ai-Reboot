import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { FileUploadField } from "./FileUploadField";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap({ files = [] }: { files?: ContractRequestForm["attachFiles"] }) {
  const methods = useForm<ContractRequestForm>({
    defaultValues: { ...contractRequestDefaults, attachFiles: files },
  });
  return (
    <FormProvider {...methods}>
      <FileUploadField name="attachFiles" description="첨부 파일을 올리세요" accept=".pdf" />
    </FormProvider>
  );
}

describe("FileUploadField", () => {
  it("기존 파일 목록을 렌더한다", () => {
    render(<Wrap files={[{ name: "계약서.pdf", meta: "PDF · 1.0MB" }]} />);
    expect(screen.getByText("계약서.pdf")).toBeInTheDocument();
  });

  it("파일을 추가하면 목록에 나타난다", async () => {
    const user = userEvent.setup();
    const { container } = render(<Wrap />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["x"], "추가본.pdf", { type: "application/pdf" }));
    expect(await screen.findByText("추가본.pdf")).toBeInTheDocument();
  });

  it("삭제 시 목록에서 제거된다", async () => {
    const user = userEvent.setup();
    render(<Wrap files={[{ name: "지울것.pdf", meta: "PDF · 0.5MB" }]} />);
    const deleteButton = screen.getByRole("button", { name: /삭제|delete/i });
    await user.click(deleteButton);
    expect(screen.queryByText("지울것.pdf")).not.toBeInTheDocument();
  });
});
