import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Company } from "@lawai/contracts";
import { CompanyCreateModal } from "./CompanyCreateModal";
import { createCompany, searchCompanies } from "../../../api/companies";

vi.mock("../../../api/companies", () => ({ createCompany: vi.fn(), searchCompanies: vi.fn() }));
const mockCreate = vi.mocked(createCompany);
const mockSearch = vi.mocked(searchCompanies);

const CREATED: Company = {
  id: "new1", type: "company", name: "신규(주)", bizNo: "123-45-67890",
  ceo: "홍길동", phone: null, address: null, addressDetail: null,
  managerName: null, managerPhone: null, managerEmail: null, createdAt: "",
};

function renderModal() {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  render(<CompanyCreateModal initialName="신규(주)" onClose={onClose} onCreated={onCreated} />);
  return { onClose, onCreated };
}

describe("CompanyCreateModal", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockSearch.mockReset();
  });

  it("타이틀과 initialName이 채워진 회사명을 렌더한다", () => {
    renderModal();
    expect(screen.getByText("상대 계약자 신규 등록")).toBeInTheDocument();
    expect(screen.getByDisplayValue("신규(주)")).toBeInTheDocument();
  });

  it("필수값 미입력 시 검증 에러를 보여주고 등록하지 않는다", async () => {
    const user = userEvent.setup();
    const { onCreated } = renderModal();
    await user.click(screen.getByRole("button", { name: "등록하고 선택" }));
    expect(await screen.findByText("대표자명을 입력하세요")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("유효한 값으로 등록 시 onCreated/onClose를 호출한다", async () => {
    mockCreate.mockResolvedValue(CREATED);
    const user = userEvent.setup();
    const { onCreated, onClose } = renderModal();
    await user.type(screen.getByPlaceholderText("000-00-00000"), "123-45-67890");
    await user.type(screen.getByPlaceholderText("대표자 이름"), "홍길동");
    await user.click(screen.getByRole("button", { name: "등록하고 선택" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("개인 선택 시 임시번호 자동 생성 안내를 보여준다", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByLabelText("개인(개인사업자)"));
    expect(screen.getByText(/임시번호가 자동 생성/)).toBeInTheDocument();
  });

  it("중복확인 클릭 시 이미 등록된 번호면 경고를 보여준다", async () => {
    mockSearch.mockResolvedValue([CREATED]);
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByPlaceholderText("000-00-00000"), "123-45-67890");
    await user.click(screen.getByRole("button", { name: "중복확인" }));
    expect(await screen.findByText("이미 등록된 사업자등록번호입니다")).toBeInTheDocument();
  });
});
