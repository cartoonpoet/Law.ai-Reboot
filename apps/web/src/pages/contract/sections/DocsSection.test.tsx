import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { describe, it, expect, vi } from "vitest";
import { DocsSection } from "./DocsSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";
import { uploadContractFile } from "../hooks/uploadContractFile";

vi.mock("../hooks/uploadContractFile", () => ({
  uploadContractFile: vi.fn(),
}));

// 표준양식 선택→편집기 흐름 자체는 StandardFormsModal.test.tsx가 검증한다. 여기서는 DocsSection이
// onStart/onComplete 콜백을 받아 contractFiles 폼 필드를 어떻게 채우는지만 확인하므로, 두 모달은
// 콜백을 즉시 호출하는 버튼으로 대체한다.
vi.mock("./StandardFormsModal", () => ({
  StandardFormsModal: ({ onStart }: { onStart: (t: unknown) => void }) => (
    <button
      onClick={() =>
        onStart({
          id: "tpl-1",
          categoryId: "nda",
          name: "비밀유지계약서 표준",
          currentVersionNo: 1,
          createdById: "u1",
          createdByName: "김서연",
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        })
      }
    >
      목업양식선택
    </button>
  ),
}));

vi.mock("./StandardFormEditorModal", () => ({
  StandardFormEditorModal: ({ onComplete }: { onComplete: (file: File) => Promise<void> }) => (
    <button
      onClick={() =>
        void onComplete(
          new File(["dummy"], "표준양식.docx", {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
        )
      }
    >
      편집기모의완료
    </button>
  ),
}));

// contractFiles 마지막 항목의 id/name/blob 여부를 화면에 노출해 handleTemplateEditorComplete의
// 결과를 검증한다(폼 상태는 직접 조회할 수 없으므로).
function FilesSpy() {
  const files = useWatch<ContractRequestForm, "contractFiles">({ name: "contractFiles" });
  const last = files.at(-1);
  return (
    <div data-testid="last-contract-file">
      {last ? `${last.id ?? "null"}|${last.name}|${last.blob instanceof File ? "file" : "noblob"}` : "empty"}
    </div>
  );
}

// contractId는 명시적으로 넘기게 한다(기본값을 두면 "신규 작성" 테스트가 `contractId={undefined}`를
// 넘겨도 기본값으로 대체돼 편집 모드로 렌더되는 문제가 생긴다).
function Wrap({
  isFileLocked = false,
  ctype,
  registerAs,
  contractId,
}: {
  isFileLocked?: boolean;
  ctype?: ContractRequestForm["ctype"];
  registerAs?: ContractRequestForm["registerAs"];
  contractId?: string;
}) {
  const methods = useForm<ContractRequestForm>({
    defaultValues: {
      ...contractRequestDefaults,
      ...(ctype ? { ctype } : {}),
      ...(registerAs ? { registerAs } : {}),
    },
  });
  return (
    <FormProvider {...methods}>
      <DocsSection contractId={contractId} isFileLocked={isFileLocked} />
      <FilesSpy />
    </FormProvider>
  );
}

describe("DocsSection", () => {
  it("안내 Alert과 계약서 라벨을 렌더한다", () => {
    render(<Wrap contractId="ct-1" />);
    expect(screen.getAllByText(/워드/).length).toBeGreaterThan(0);
    expect(screen.getByText("계약서")).toBeInTheDocument();
  });

  it("파일 잠금이면 안내 문구를 보여주고 표준양식 추가 버튼을 숨긴다", () => {
    render(<Wrap isFileLocked ctype="std" contractId="ct-1" />);
    expect(screen.getByText(/체결 결재가 시작된 계약이라 계약서는 바꿀 수 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "표준계약서 양식 보기" })).not.toBeInTheDocument();
  });

  it("일반 계약(ctype=normal)이면 표준양식 보기 버튼을 숨긴다", () => {
    render(<Wrap ctype="normal" contractId="ct-1" />);
    expect(screen.queryByRole("button", { name: "표준계약서 양식 보기" })).not.toBeInTheDocument();
  });

  it("표준계약서 체결(ctype=std)이면 표준양식 보기 버튼을 계약서 칸 안에 보여준다", () => {
    render(<Wrap ctype="std" contractId="ct-1" />);
    expect(screen.getByRole("button", { name: "표준계약서 양식 보기" })).toBeInTheDocument();
  });

  // 체결 완료 등록(registerAs=signed)은 이미 서명·날인이 끝난 원본을 올리는 화면이라, 표준양식으로
  // 새로 작성할 일이 없다. ctype=std 라도 버튼을 내보내지 않는 것이 의도된 동작이다.
  it("체결 완료 등록(registerAs=signed)이면 ctype=std 라도 표준양식 보기 버튼을 숨긴다", () => {
    render(<Wrap ctype="std" registerAs="signed" contractId="ct-1" />);
    expect(screen.getByText("최종 서명본")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "표준계약서 양식 보기" })).not.toBeInTheDocument();
  });
});

describe("DocsSection - 표준양식으로 계약서 작성 완료(handleTemplateEditorComplete)", () => {
  it("신규 작성(contractId 없음)에서는 완료 시 blob 파일을 contractFiles에 추가한다", async () => {
    const user = userEvent.setup();
    render(<Wrap ctype="std" />);

    await user.click(screen.getByRole("button", { name: "표준계약서 양식 보기" }));
    await user.click(screen.getByRole("button", { name: "목업양식선택" }));
    await user.click(screen.getByRole("button", { name: "편집기모의완료" }));

    expect(uploadContractFile).not.toHaveBeenCalled();
    expect(await screen.findByTestId("last-contract-file")).toHaveTextContent("null|표준양식.docx|file");
  });

  it("편집 모드(contractId 있음)에서는 uploadContractFile로 즉시 업로드하고 반환된 id를 반영한다", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadContractFile).mockResolvedValue({
      id: "att-1",
      name: "표준양식.docx",
      size: 4,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sha256: "deadbeef",
      createdAt: "2026-09-20T00:00:00.000Z",
    });
    render(<Wrap ctype="std" contractId="ct-9" />);

    await user.click(screen.getByRole("button", { name: "표준계약서 양식 보기" }));
    await user.click(screen.getByRole("button", { name: "목업양식선택" }));
    await user.click(screen.getByRole("button", { name: "편집기모의완료" }));

    expect(await screen.findByTestId("last-contract-file")).toHaveTextContent("att-1|표준양식.docx|noblob");
    expect(uploadContractFile).toHaveBeenCalledWith("ct-9", "contract", expect.any(File));
  });
});
