import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MembersPage } from "./MembersPage";
import { useMembers } from "./useMembers";

vi.mock("./useMembers");

const mockHook = (over: Partial<ReturnType<typeof useMembers>> = {}) => {
  const invite = vi.fn().mockResolvedValue({ sent: 1, skipped: [] });
  const resend = vi.fn().mockResolvedValue({ ok: true });
  const cancel = vi.fn().mockResolvedValue({ ok: true });
  vi.mocked(useMembers).mockReturnValue({
    members: [
      { userId: "u1", name: "김담당", avatarUrl: "/users/u1/avatar/a.png", email: "lead@d.com", role: "contractManager", joinedAt: "2026-09-01T00:00:00.000Z" },
    ],
    invites: [
      { id: "i1", email: "p@d.com", role: "general", expiresAt: "2026-09-17T00:00:00.000Z", createdAt: "2026-09-10T00:00:00.000Z" },
    ],
    isLoading: false,
    invite,
    isInviting: false,
    resend,
    cancel,
    ...over,
  });
  return { invite, resend, cancel };
};

describe("MembersPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("멤버와 초대 대기 목록을 렌더한다", () => {
    mockHook();
    render(<MembersPage />);
    expect(screen.getByText("김담당")).toBeInTheDocument();
    expect(screen.getByText("계약담당자")).toBeInTheDocument();
    expect(screen.getByText("p@d.com")).toBeInTheDocument();
  });

  it("재발송 클릭 시 resend 를 호출하고 라벨이 바뀐다", async () => {
    const user = userEvent.setup();
    const { resend } = mockHook();
    render(<MembersPage />);
    await user.click(screen.getByRole("button", { name: "재발송" }));
    expect(resend).toHaveBeenCalledWith("i1");
    expect(await screen.findByRole("button", { name: "재발송됨" })).toBeInTheDocument();
  });

  it("취소 클릭 시 cancel 을 호출한다", async () => {
    const user = userEvent.setup();
    const { cancel } = mockHook();
    render(<MembersPage />);
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(cancel).toHaveBeenCalledWith("i1");
  });
});
