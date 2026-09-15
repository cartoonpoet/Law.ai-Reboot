import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { FileUploadField } from "./FileUploadField";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap({
  files = [],
  lockMode,
}: {
  files?: ContractRequestForm["attachFiles"];
  lockMode?: "readOnly" | "addOnly";
}) {
  const methods = useForm<ContractRequestForm>({
    defaultValues: { ...contractRequestDefaults, attachFiles: files },
  });
  return (
    <FormProvider {...methods}>
      <FileUploadField name="attachFiles" description="첨부 파일을 올리세요" accept=".pdf" lockMode={lockMode} />
    </FormProvider>
  );
}

const SAVED_FILE = { id: "f-1", name: "저장된.pdf", meta: "PDF · 1.0MB", mimeType: "application/pdf" };
const UNSAVED_FILE = { id: null, name: "메타만.pdf", meta: "PDF · 0.1MB", mimeType: null };

describe("FileUploadField", () => {
  it("기존 파일 목록을 렌더한다", () => {
    render(<Wrap files={[{ id: null, name: "계약서.pdf", meta: "PDF · 1.0MB", mimeType: null }]} />);
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
    render(<Wrap files={[{ id: null, name: "지울것.pdf", meta: "PDF · 0.5MB", mimeType: null }]} />);
    const deleteButton = screen.getByRole("button", { name: /삭제|delete/i });
    await user.click(deleteButton);
    expect(screen.queryByText("지울것.pdf")).not.toBeInTheDocument();
  });

  it("읽기 전용 잠금이면 파일 목록만 보이고 올리기·삭제가 없다", () => {
    const { container } = render(<Wrap files={[SAVED_FILE]} lockMode="readOnly" />);
    expect(screen.getByText("저장된.pdf")).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /삭제|delete/i })).not.toBeInTheDocument();
  });

  it("추가만 잠금이면 올리기는 되고, 저장된 파일만 삭제 버튼이 없다", () => {
    const { container } = render(<Wrap files={[SAVED_FILE, UNSAVED_FILE]} lockMode="addOnly" />);
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(screen.getAllByRole("button", { name: /삭제|delete/i })).toHaveLength(1);
  });
});
