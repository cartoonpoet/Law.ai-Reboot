import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MyProfile } from "@lawai/contracts";
import { changePassword } from "../../api/auth";
import { deleteMyAvatar, updateMyProfile, uploadMyAvatar } from "../../api/profile";
import { useMe } from "../../components/layout/hooks/useMe";
import { useTenantSwitcher } from "../../components/layout/hooks/useTenantSwitcher";
import { SettingsPage } from "./SettingsPage";

vi.mock("../../api/auth");
vi.mock("../../api/profile");
vi.mock("../../components/layout/hooks/useMe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../components/layout/hooks/useMe")>()),
  useMe: vi.fn(),
}));
vi.mock("../../components/layout/hooks/useTenantSwitcher");

const ME: MyProfile = {
  id: "u1",
  email: "son@lawai.kr",
  name: "손준호",
  isSystemAdmin: false,
  departmentId: "d1",
  departmentName: "법무팀",
  createdAt: "2026-01-01T00:00:00.000Z",
  emailNotify: true,
  notifyApproval: true,
  notifyComment: true,
  notifyContractExpiry: true,
  avatarUrl: null,
};

const renderAt = (path: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/settings/:tab" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("SettingsPage (내 정보 설정)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMe).mockReturnValue({ me: ME, isPending: false, isError: false, refetch: () => {} });
    vi.mocked(useTenantSwitcher).mockReturnValue({
      memberships: [
        { tenantId: "t1", name: "휴맥스아이티", role: "inHouseCounsel", isActive: true },
        { tenantId: "t2", name: "넥스트랩", role: "outsideCounsel", isActive: false },
      ],
      activeMembership: { tenantId: "t1", name: "휴맥스아이티", role: "inHouseCounsel", isActive: true },
      isLoading: false, isPending: false, isError: false, refetch: () => {},
      switchTo: vi.fn(),
      switchingTenantId: null,
      isSwitchError: false,
    });
  });

  describe("탭", () => {
    it("모르는 탭 주소는 내 정보 탭으로 돌려보낸다", () => {
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={["/settings/unknown"]}>
            <Routes>
              <Route path="/settings/:tab" element={<SettingsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      expect(screen.getByRole("heading", { name: "내 정보" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /내 정보/ })).toHaveAttribute("aria-current", "page");
    });

    it("왼쪽 탭을 누르면 그 항목만 보여준다", async () => {
      const user = userEvent.setup();
      renderAt("/settings/profile");
      await user.click(screen.getByRole("button", { name: /비밀번호/ }));
      expect(screen.getByRole("heading", { name: "비밀번호 변경" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "내 정보" })).not.toBeInTheDocument();
    });
  });

  describe("내 정보", () => {
    it("이메일·부서는 보기만 하고, 이름을 바꿔야 저장 버튼이 켜진다", async () => {
      const user = userEvent.setup();
      vi.mocked(updateMyProfile).mockResolvedValue({ ...ME, name: "손준호2" });
      renderAt("/settings/profile");

      expect(screen.getByText("son@lawai.kr")).toBeInTheDocument();
      expect(screen.getByText("법무팀")).toBeInTheDocument();
      const save = screen.getByRole("button", { name: "저장" });
      expect(save).toBeDisabled();

      const nameInput = screen.getByRole("textbox", { name: "이름" });
      await user.clear(nameInput);
      await user.type(nameInput, " 손준호2 ");
      expect(save).not.toBeDisabled();
      await user.click(save);
      await waitFor(() => expect(updateMyProfile).toHaveBeenCalledWith({ name: "손준호2" }));
    });

    it("이미지가 아닌 파일은 올리지 않고 안내한다", async () => {
      const user = userEvent.setup({ applyAccept: false });
      renderAt("/settings/profile");
      await user.upload(screen.getByLabelText("프로필 사진 파일 선택"), new File(["%PDF"], "a.pdf", { type: "application/pdf" }));
      expect(screen.getByRole("alert")).toHaveTextContent("PNG·JPG·WEBP 이미지만 올릴 수 있어요");
      expect(uploadMyAvatar).not.toHaveBeenCalled();
    });

    it("사진을 고르면 올리고, 사진이 있으면 삭제할 수 있다", async () => {
      const user = userEvent.setup();
      vi.mocked(uploadMyAvatar).mockResolvedValue({ ...ME, avatarUrl: "/users/u1/avatar/a.png" });
      vi.mocked(deleteMyAvatar).mockResolvedValue(ME);
      const { unmount } = renderAt("/settings/profile");
      const photo = new File(["png"], "me.png", { type: "image/png" });
      await user.upload(screen.getByLabelText("프로필 사진 파일 선택"), photo);
      await waitFor(() => expect(uploadMyAvatar).toHaveBeenCalledWith(photo, expect.anything()));
      expect(screen.queryByRole("button", { name: "사진 삭제" })).not.toBeInTheDocument();
      unmount();

      vi.mocked(useMe).mockReturnValue({ me: { ...ME, avatarUrl: "/users/u1/avatar/a.png" } , isPending: false, isError: false, refetch: () => {} });
      renderAt("/settings/profile");
      expect(screen.getByRole("img", { name: "손준호 프로필 사진" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "사진 삭제" }));
      await waitFor(() => expect(deleteMyAvatar).toHaveBeenCalled());
    });
  });

  describe("알림", () => {
    it("이메일 알림 스위치를 끄면 저장한다", async () => {
      const user = userEvent.setup();
      vi.mocked(updateMyProfile).mockResolvedValue({ ...ME, emailNotify: false });
      renderAt("/settings/notifications");
      await user.click(screen.getByRole("switch", { name: "이메일로도 알림 받기" }));
      await waitFor(() => expect(updateMyProfile).toHaveBeenCalledWith({ emailNotify: false }));
    });

    it("결재·코멘트 알림을 종류별로 끄면 바꾼 항목만 저장한다", async () => {
      const user = userEvent.setup();
      vi.mocked(updateMyProfile).mockResolvedValue({ ...ME, notifyApproval: false });
      renderAt("/settings/notifications");
      expect(screen.queryByText("준비 중")).not.toBeInTheDocument();

      await user.click(screen.getByRole("switch", { name: "결재 알림 받기" }));
      await waitFor(() => expect(updateMyProfile).toHaveBeenCalledWith({ notifyApproval: false }));

      await user.click(screen.getByRole("switch", { name: "코멘트 알림 받기" }));
      await waitFor(() => expect(updateMyProfile).toHaveBeenCalledWith({ notifyComment: false }));

      await user.click(screen.getByRole("switch", { name: "계약 만료 알림 받기" }));
      await waitFor(() => expect(updateMyProfile).toHaveBeenCalledWith({ notifyContractExpiry: false }));
    });
  });

  describe("비밀번호", () => {
    const fill = async (user: ReturnType<typeof userEvent.setup>, current: string, next: string, confirm: string) => {
      await user.type(screen.getByLabelText("현재 비밀번호"), current);
      await user.type(screen.getByLabelText("새 비밀번호"), next);
      await user.type(screen.getByLabelText("새 비밀번호 확인"), confirm);
    };
    // 왼쪽 탭("비밀번호 · 변경")과 이름이 겹치지 않게 비밀번호 카드 안에서 제출 버튼을 찾는다.
    const getSubmitButton = () =>
      within(screen.getByRole("region", { name: "비밀번호 변경" })).getByRole("button", { name: "비밀번호 변경" });

    it("입력하는 대로 조건 충족을 보여주고, 확인이 다르면 보내지 않는다", async () => {
      const user = userEvent.setup();
      renderAt("/settings/password");
      await fill(user, "Old1234!", "New1234!", "New1234");
      expect(screen.getByText(/✓ 특수문자/)).toBeInTheDocument();
      await user.click(getSubmitButton());
      expect(await screen.findByText("새 비밀번호와 같지 않아요")).toBeInTheDocument();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it("조건을 만족하면 변경을 요청하고, 서버 거절 사유를 보여준다", async () => {
      const user = userEvent.setup();
      vi.mocked(changePassword).mockRejectedValue(new Error("현재 비밀번호가 맞지 않습니다"));
      renderAt("/settings/password");
      await fill(user, "Wrong123!", "New1234!", "New1234!");
      await user.click(getSubmitButton());
      await waitFor(() =>
        expect(changePassword).toHaveBeenCalledWith({ currentPassword: "Wrong123!", newPassword: "New1234!" }, expect.anything()),
      );
      expect(await screen.findByText("현재 비밀번호가 맞지 않습니다")).toBeInTheDocument();
    });
  });

  describe("소속 회사", () => {
    it("회사별 역할과 사용 중인 회사를 보여준다", () => {
      renderAt("/settings/companies");
      expect(screen.getByText("휴맥스아이티")).toBeInTheDocument();
      expect(screen.getByText("사외변호사")).toBeInTheDocument();
      expect(screen.getByText("사용 중")).toBeInTheDocument();
      expect(screen.getByText("전환 가능")).toBeInTheDocument();
    });
  });
});
