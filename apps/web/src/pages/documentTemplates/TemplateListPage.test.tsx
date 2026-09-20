import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { TemplateListPage } from "./TemplateListPage";
import * as api from "../../api/documentTemplates";

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
});
