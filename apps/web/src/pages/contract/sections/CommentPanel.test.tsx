import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommentDto } from "@lawai/contracts";
import { CommentPanel } from "./CommentPanel";
import * as commentsApi from "../../../api/comments";

vi.mock("../../../api/comments");

const COMMENTS: CommentDto[] = [
  {
    id: "c1",
    contractId: "k1",
    authorId: "u1",
    authorName: "이법무",
    role: "inHouseCounsel",
    body: "손해배상 한도 확인 필요",
    createdAt: "2026-06-22T01:00:00.000Z",
  },
  {
    id: "c2",
    contractId: "k1",
    authorId: "u2",
    authorName: "박외주",
    role: "outsideCounsel",
    body: "수정안 첨부드립니다",
    createdAt: "2026-06-22T02:00:00.000Z",
  },
];

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CommentPanel contractId="k1" />
    </QueryClientProvider>,
  );
}

describe("CommentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commentsApi.listComments).mockResolvedValue(COMMENTS);
    vi.mocked(commentsApi.createComment).mockResolvedValue(COMMENTS[0]);
  });

  it("'검토 의견' 패널 타이틀과 실 코멘트 목록(작성자/역할)을 렌더한다", async () => {
    renderPanel();
    expect(screen.getByText("검토 의견")).toBeInTheDocument();
    expect(await screen.findByText("손해배상 한도 확인 필요")).toBeInTheDocument();
    expect(screen.getByText("이법무")).toBeInTheDocument();
    expect(screen.getByText("박외주")).toBeInTheDocument();
    // role → 한글 라벨.
    expect(screen.getByText("사내변호사")).toBeInTheDocument();
    expect(screen.getByText("사외변호사")).toBeInTheDocument();
  });

  it("코멘트가 없으면 빈 상태 문구를 렌더한다", async () => {
    vi.mocked(commentsApi.listComments).mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText("아직 코멘트가 없습니다.")).toBeInTheDocument();
  });

  it("본문 입력 후 제출하면 createComment(addComment)를 호출한다", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("손해배상 한도 확인 필요");
    const textarea = screen.getByPlaceholderText("검토 의견을 남겨주세요.");
    await user.type(textarea, "추가 검토 의견");
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    await waitFor(() =>
      expect(commentsApi.createComment).toHaveBeenCalledWith("k1", "추가 검토 의견"),
    );
  });

  it("빈 body(공백만)는 제출해도 createComment를 호출하지 않는다(클라 가드)", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("손해배상 한도 확인 필요");
    const textarea = screen.getByPlaceholderText("검토 의견을 남겨주세요.");
    await user.type(textarea, "   ");
    await user.click(screen.getByRole("button", { name: /코멘트 등록/ }));
    expect(
      await screen.findByText("코멘트 내용을 입력하세요."),
    ).toBeInTheDocument();
    expect(commentsApi.createComment).not.toHaveBeenCalled();
  });
});
