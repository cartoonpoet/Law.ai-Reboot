import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ContractResponse } from "@lawai/contracts";
import { ContractDetailPage } from "./ContractDetailPage";
import * as api from "../../api/contracts";
import * as commentsApi from "../../api/comments";

vi.mock("../../api/contracts");
vi.mock("../../api/comments");

const response: ContractResponse = {
  id: "uuid-1",
  code: "C20260601-0007",
  title: "사후계약관리 표준 NDA",
  status: "legalReview",
  securityLevel: "secure",
  reviewType: "normal",
  party: "본사계약",
  categoryId: "cat-1",
  categoryLabel: "자문 > 법률 > LOI/MOU",
  requesterId: "이희규",
  ownerId: "이법무",
  createdById: "u1",
  periodStart: null,
  periodEnd: null,
  dueDate: "2026-06-18T00:00:00.000Z",
  schemaVersion: 1,
  details: {
    stage: "new",
    periodText: "",
    periodManual: false,
    noEndDate: false,
    lang: "ko",
    legal: "dom",
    negotiation: 50,
    money: [{ vat: "excluded", amount: 1000000, currency: "KRW" }],
    moneyNote: "",
    payTerms: "",
    purpose: "표준 NDA 체결 목적",
    keyPoints: "",
    concerns: "",
    urls: [],
    owner: null,
    project: null,
    relatedDocs: [],
  },
  counterparties: [],
  approvalLine: null,
  files: [],
  references: [],
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-08T00:00:00.000Z",
};

function renderAt(id: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/contract/${id}`]}>
        <Routes>
          <Route path="/contract/:id" element={<ContractDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ContractDetailPage", () => {
  beforeEach(() => {
    vi.mocked(api.getContract).mockResolvedValue(response);
    vi.mocked(commentsApi.listComments).mockResolvedValue([
      {
        id: "c1",
        contractId: "uuid-1",
        authorId: "u1",
        authorName: "이법무",
        role: "inHouseCounsel",
        body: "손해배상 한도 조정 검토 요망",
        createdAt: "2026-06-08T01:00:00.000Z",
      },
    ]);
  });

  it("계약 단건 API의 계약명을 렌더한다", async () => {
    renderAt("uuid-1");
    expect(
      await screen.findByText("사후계약관리 표준 NDA"),
    ).toBeInTheDocument();
  });

  it("AI 계약 리스크 섹션과 고위험 조항을 렌더한다(mock 유지)", async () => {
    renderAt("uuid-1");
    expect(await screen.findByText("AI 계약 리스크")).toBeInTheDocument();
    expect(screen.getByText("손해배상 한도")).toBeInTheDocument();
  });

  it("검토 의견 섹션을 실 코멘트 데이터로 렌더한다", async () => {
    renderAt("uuid-1");
    expect(await screen.findByText("검토 의견")).toBeInTheDocument();
    // listComments 의 실 데이터(작성자·본문)가 패널에 노출된다.
    expect(
      await screen.findByText("손해배상 한도 조정 검토 요망"),
    ).toBeInTheDocument();
    // 코멘트 작성자 역할(한글 라벨)이 패널에 노출된다.
    expect(screen.getByText("사내변호사")).toBeInTheDocument();
  });
});
