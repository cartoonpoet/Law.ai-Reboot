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
  requesterName: null,
  ownerId: "이법무",
  ownerName: null,
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
        updatedAt: "2026-06-08T01:00:00.000Z",
        isDeleted: false,
        isAuthor: false,
        mentions: [],
    attachments: [],
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

  it("재설계된 카드 IA(검토 내용/기본·분류/금액·협상/당사자·관계자/결재선)를 렌더한다", async () => {
    renderAt("uuid-1");
    await screen.findByText("사후계약관리 표준 NDA");
    expect(screen.getByText("검토 내용")).toBeInTheDocument();
    expect(screen.getByText("기본 · 분류")).toBeInTheDocument();
    expect(screen.getByText("금액 · 협상")).toBeInTheDocument();
    expect(screen.getByText("당사자 · 관계자")).toBeInTheDocument();
    expect(screen.getByText("결재선")).toBeInTheDocument();
    // 중복 제거: "핵심 정보" 카드는 없다.
    expect(screen.queryByText("핵심 정보")).not.toBeInTheDocument();
  });

  it("빈값(moneyNote/keyPoints/concerns 등)은 emptychip(없음)으로 렌더한다", async () => {
    renderAt("uuid-1");
    await screen.findByText("사후계약관리 표준 NDA");
    // ownerName=null 이지만 ownerId("이법무") fallback → 법무팀 담당자에 실명 노출.
    expect(screen.getAllByText("이법무").length).toBeGreaterThan(0);
    // moneyNote/keyPoints/concerns 등 빈값 → "없음"
    expect(screen.getAllByText("없음").length).toBeGreaterThan(0);
  });

  it("법무 담당자가 미배정이면 needchip(미배정)을 렌더한다", async () => {
    vi.mocked(api.getContract).mockResolvedValue({
      ...response,
      ownerId: null,
      ownerName: null,
    });
    renderAt("uuid-1");
    await screen.findByText("사후계약관리 표준 NDA");
    expect(screen.getAllByText("미배정").length).toBeGreaterThan(0);
  });

  it("검토 단계(legalReview)에서 검토 액션 패널과 can 기반 버튼을 렌더한다", async () => {
    vi.mocked(api.getContract).mockResolvedValue({
      ...response,
      can: { edit: true, assign: true, transition: true, delete: false },
    });
    renderAt("uuid-1");
    expect(await screen.findByText("검토 액션")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "반려" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "검토 완료" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /담당자 배정/ }),
    ).toBeInTheDocument();
  });

  it("결재(signing) 단계에서는 결재 현황으로 전환하고 반려/배정 버튼을 숨긴다", async () => {
    vi.mocked(api.getContract).mockResolvedValue({
      ...response,
      status: "signing",
      can: { edit: false, assign: true, transition: true, delete: false },
    });
    renderAt("uuid-1");
    expect(await screen.findByText("결재 현황")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "반려" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /담당자 배정/ }),
    ).not.toBeInTheDocument();
  });

  it("로딩 중(isLoading)에는 ContractDetailSkeleton(placeholder)을 렌더한다", () => {
    // 영원히 pending 인 쿼리 → isLoading 유지.
    vi.mocked(api.getContract).mockReturnValue(new Promise(() => {}));
    const { container } = renderAt("uuid-1");
    // 본문 데이터(계약명)는 아직 없고, 스켈레톤 placeholder(width 지정 div) 다수 노출.
    expect(screen.queryByText("사후계약관리 표준 NDA")).not.toBeInTheDocument();
    const placeholders = Array.from(container.querySelectorAll("div")).filter(
      (el) => el.getAttribute("style")?.includes("width"),
    );
    expect(placeholders.length).toBeGreaterThan(10);
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
