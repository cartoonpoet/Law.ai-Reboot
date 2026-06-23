import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ContractResponse } from "@lawai/contracts";
import { ContractDetailPage } from "./ContractDetailPage";
import * as api from "../../api/contracts";
import * as commentsApi from "../../api/comments";
import * as directoryApi from "../../api/directory";

vi.mock("../../api/contracts");
vi.mock("../../api/comments");
vi.mock("../../api/directory");

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
  requesterId: "11111111-1111-1111-1111-111111111111",
  ownerId: "22222222-2222-2222-2222-222222222222",
  requesterName: "이희규",
  ownerName: "이법무",
  ownerDept: "법무팀",
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
  can: { edit: true, assign: true, transition: true, delete: true },
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
    vi.mocked(directoryApi.searchUsers).mockResolvedValue([]);
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

  it("요청자·담당자를 실명으로 표시한다(uuid 미노출)", async () => {
    renderAt("uuid-1");
    await screen.findByText("사후계약관리 표준 NDA");
    // 실명(requesterName/ownerName) 이 화면에 노출된다(헤더 메타·검토요약·참여자 등 복수 위치).
    expect(screen.getAllByText(/이희규/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/이법무/).length).toBeGreaterThan(0);
    // requesterId/ownerId uuid 는 화면 어디에도 노출되지 않는다.
    expect(
      screen.queryByText(/11111111-1111-1111-1111-111111111111/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/22222222-2222-2222-2222-222222222222/),
    ).not.toBeInTheDocument();
  });

  it("담당자 부서를 ownerDept(실제 부서)로 표시한다", async () => {
    renderAt("uuid-1");
    await screen.findByText("사후계약관리 표준 NDA");
    // 참여자 카드: 담당자 역할 라벨에 ownerDept(법무팀) 가 결합돼 노출된다.
    expect(screen.getByText(/검토 담당 · 법무팀/)).toBeInTheDocument();
  });

  it("ownerDept 가 null 이면 부서 표기가 없다('법무팀' 하드코딩 아님)", async () => {
    vi.mocked(api.getContract).mockResolvedValue({ ...response, ownerDept: null });
    renderAt("uuid-1");
    // 담당자 실명은 여전히 나오지만, 부서가 null 이므로 '· 법무팀' 결합 라벨은 없다.
    await screen.findAllByText(/이법무/);
    expect(screen.queryByText(/법무팀/)).not.toBeInTheDocument();
    expect(screen.queryByText(/검토 담당 · /)).not.toBeInTheDocument();
  });

  it("로딩 중(isLoading)에는 ContractDetailSkeleton 을 렌더한다", async () => {
    // never-resolving → isLoading 유지(데이터 없음 + 로딩).
    vi.mocked(api.getContract).mockReturnValue(new Promise(() => {}));
    renderAt("uuid-1");
    expect(
      await screen.findByTestId("contract-detail-skeleton"),
    ).toBeInTheDocument();
    // 스켈레톤 동안 실제 제목/not-found 는 보이지 않는다.
    expect(screen.queryByText("사후계약관리 표준 NDA")).not.toBeInTheDocument();
    expect(screen.queryByText("계약을 찾을 수 없습니다.")).not.toBeInTheDocument();
  });

  it("can.edit/transition/assign 액션 버튼을 노출하고 배정 버튼이 AssignModal 을 연다", async () => {
    const user = userEvent.setup();
    renderAt("uuid-1");
    await screen.findByText("사후계약관리 표준 NDA");
    // can.edit → 수정, can.transition → 반려/검토 완료, can.assign → 담당자 배정.
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "반려" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "검토 완료" })).toBeInTheDocument();
    const assignBtn = screen.getByRole("button", { name: /담당자 배정/ });
    expect(assignBtn).toBeInTheDocument();
    await user.click(assignBtn);
    // AssignModal(검토 담당자 배정) 이 열린다.
    expect(await screen.findByText("검토 담당자 배정")).toBeInTheDocument();
  });

  it("can 권한이 없으면 액션 버튼을 숨긴다", async () => {
    vi.mocked(api.getContract).mockResolvedValue({
      ...response,
      can: { edit: false, assign: false, transition: false, delete: false },
    });
    renderAt("uuid-1");
    await screen.findByText("사후계약관리 표준 NDA");
    expect(screen.queryByRole("button", { name: "수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "반려" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /담당자 배정/ }),
    ).not.toBeInTheDocument();
  });

  it("CommentPanel 이 검토 의견 영역으로 동작한다(기능 보존)", async () => {
    renderAt("uuid-1");
    // CommentPanel 마운트 후 코멘트 데이터 패칭이 일어난다.
    await waitFor(() =>
      expect(commentsApi.listComments).toHaveBeenCalledWith("uuid-1"),
    );
    expect(await screen.findByText("검토 의견")).toBeInTheDocument();
  });
});
