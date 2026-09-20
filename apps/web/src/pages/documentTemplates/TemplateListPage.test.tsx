import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { TemplateListPage } from "./TemplateListPage";
import * as api from "../../api/documentTemplates";
import * as documentsApi from "../../api/documents";

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TemplateListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("TemplateListPage", () => {
  it("목록을 불러와 표에 보여준다", async () => {
    vi.spyOn(api, "listTemplates").mockResolvedValue({
      items: [
        {
          id: "t1",
          categoryId: "nda",
          name: "비밀유지계약서 표준",
          currentVersionNo: 1,
          createdById: "u1",
          createdByName: "김서연",
          createdAt: "2026-09-20T00:00:00.000Z",
          updatedAt: "2026-09-20T00:00:00.000Z",
        },
      ],
      counts: { nda: 1, service: 0, supply: 0, entrust: 0, license: 0, etc: 0 },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("비밀유지계약서 표준")).toBeInTheDocument());
  });

  it("양식이 없으면 빈 상태를 보여준다", async () => {
    vi.spyOn(api, "listTemplates").mockResolvedValue({
      items: [],
      counts: { nda: 0, service: 0, supply: 0, entrust: 0, license: 0, etc: 0 },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("이 분류에는 아직 양식이 없어요")).toBeInTheDocument());
  });

  it("워드 파일 업로드에 실패하면 오류 메시지를 보여준다", async () => {
    vi.spyOn(api, "listTemplates").mockResolvedValue({
      items: [],
      counts: { nda: 0, service: 0, supply: 0, entrust: 0, license: 0, etc: 0 },
    });
    vi.spyOn(documentsApi, "importDocument").mockRejectedValue(new Error("파일이 너무 큽니다"));
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByText("이 분류에는 아직 양식이 없어요")).toBeInTheDocument());

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    const file = new File(["dummy"], "broken.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    await waitFor(() =>
      expect(screen.getByText("워드 파일을 읽지 못했습니다: 파일이 너무 큽니다")).toBeInTheDocument(),
    );
  });

  it("워드 파일을 올려 만들면 들여온 내용을 빈 문서가 아니라 실제 내용으로 즉시 저장한다", async () => {
    vi.spyOn(api, "listTemplates").mockResolvedValue({
      items: [],
      counts: { nda: 0, service: 0, supply: 0, entrust: 0, license: 0, etc: 0 },
    });
    vi.spyOn(documentsApi, "importDocument").mockResolvedValue({ html: "<p>들여온 내용</p>", warnings: [] });
    const createSpy = vi.spyOn(api, "createTemplate").mockResolvedValue({
      template: {
        id: "t1",
        categoryId: "nda",
        name: "표준 양식",
        currentVersionNo: 1,
        createdById: "u1",
        createdByName: "김서연",
        createdAt: "2026-09-20T00:00:00.000Z",
        updatedAt: "2026-09-20T00:00:00.000Z",
        currentVersion: {
          versionNo: 1,
          content: { type: "doc", content: [] },
          clauseCount: null,
          createdById: "u1",
          createdByName: "김서연",
          createdAt: "2026-09-20T00:00:00.000Z",
        },
      },
    });
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByText("이 분류에는 아직 양식이 없어요")).toBeInTheDocument());

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    const file = new File(["dummy"], "표준.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    await waitFor(() => expect(screen.getByText("새 표준양식 만들기")).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText("예) 비밀유지계약서(NDA) 표준"), "표준 양식");
    await userEvent.click(screen.getByText("만들고 편집하기"));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    const requestBody = createSpy.mock.calls[0][0];
    // 빈 문서 뼈대({ content: [{ type: "paragraph" }] })가 아니라, 들여온 HTML을 변환한 실제 내용이어야 한다.
    expect(requestBody.content).not.toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});
