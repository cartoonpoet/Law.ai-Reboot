import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { StandardFormsModal } from "./StandardFormsModal";
import * as api from "../../../api/documentTemplates";
import type { ListTemplatesResponse, TemplateCategoryTypes } from "@lawai/contracts";

const createForm = (id: string, name: string, categoryId: TemplateCategoryTypes = "nda") => ({
  id,
  categoryId,
  name,
  currentVersionNo: 2,
  createdById: "u1",
  createdByName: "김서연",
  createdAt: "2026-03-02T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
});

const NDA_FORM = createForm("t1", "비밀유지계약서(NDA) 표준");
const SERVICE_FORM = createForm("t2", "용역계약서 표준", "service");
const COUNTS = { nda: 1, service: 1, supply: 0, entrust: 0, license: 0, etc: 0 };

/** 목록 API 를 직접 지정해 모달을 띄운다(실패·빈 목록·분류별 응답 등). */
const renderWithListTemplates = (
  listTemplates: (query?: api.ListTemplatesQuery) => Promise<ListTemplatesResponse>,
  onStart = vi.fn(),
) => {
  vi.spyOn(api, "listTemplates").mockImplementation(listTemplates);
  // 실패 케이스에서 재시도 지연 없이 바로 isError 가 되도록 retry 를 끈다.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <StandardFormsModal onClose={vi.fn()} onStart={onStart} />
    </QueryClientProvider>,
  );
  return { onStart };
};

/** 분류·검색어와 상관없이 같은 목록을 주는 기본 케이스. */
const renderModal = (onStart = vi.fn()) =>
  renderWithListTemplates(() => Promise.resolve({ items: [NDA_FORM], counts: COUNTS }), onStart);

describe("StandardFormsModal", () => {
  it("타이틀과 양식 목록을 렌더한다", async () => {
    renderModal();
    expect(screen.getByText("표준계약서 양식 보기")).toBeInTheDocument();
    // 목록 + 미리보기에 양식명이 중복 표시되므로 findAllByText
    expect((await screen.findAllByText("비밀유지계약서(NDA) 표준")).length).toBeGreaterThan(0);
  });

  it("'이 양식으로 작성 시작' 시 선택 양식을 onStart로 전달한다", async () => {
    const user = userEvent.setup();
    const { onStart } = renderModal();
    await screen.findAllByText("비밀유지계약서(NDA) 표준"); // 로드 후 첫 양식이 기본 선택
    await user.click(screen.getByRole("button", { name: "이 양식으로 작성 시작" }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0]).toEqual(expect.objectContaining({ id: "t1", name: expect.stringContaining("비밀유지") }));
  });

  it("양식이 하나도 없으면 빈 목록 대신 안내를 보여주고, 미리보기에 가짜 문서를 그리지 않는다", async () => {
    renderWithListTemplates(() => Promise.resolve({ items: [], counts: { ...COUNTS, nda: 0 } }));
    expect(await screen.findByText("이 분류에는 아직 양식이 없어요")).toBeInTheDocument();
    expect(screen.getByText("고른 양식이 없어요")).toBeInTheDocument();
    expect(screen.queryByText("STANDARD CONTRACT FORM")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이 양식으로 작성 시작" })).toBeDisabled();
  });

  it("검색 결과가 없으면 '찾는 양식이 없어요'로 바꿔 보여준다", async () => {
    const user = userEvent.setup();
    renderWithListTemplates((query) =>
      Promise.resolve({ items: query?.q ? [] : [NDA_FORM], counts: COUNTS }),
    );
    await screen.findAllByText("비밀유지계약서(NDA) 표준");

    await user.type(screen.getByRole("textbox", { name: "양식명 검색" }), "없는양식");

    expect(await screen.findByText("찾는 양식이 없어요")).toBeInTheDocument();
    expect(screen.queryByText("이 분류에는 아직 양식이 없어요")).not.toBeInTheDocument();
  });

  it("검색어는 입력 즉시가 아니라 잠시 멈춘 뒤에 한 번만 조회한다(디바운스)", async () => {
    const user = userEvent.setup();
    const listTemplates = vi.fn((query?: api.ListTemplatesQuery) =>
      Promise.resolve<ListTemplatesResponse>({ items: query?.q ? [] : [NDA_FORM], counts: COUNTS }),
    );
    renderWithListTemplates(listTemplates);
    await screen.findAllByText("비밀유지계약서(NDA) 표준");
    listTemplates.mockClear();

    await user.type(screen.getByRole("textbox", { name: "양식명 검색" }), "비밀");
    // 글자를 치는 동안에는 아직 조회하지 않는다.
    expect(listTemplates).not.toHaveBeenCalled();

    await waitFor(() => expect(listTemplates).toHaveBeenCalledWith(expect.objectContaining({ q: "비밀" })));
    expect(listTemplates).toHaveBeenCalledTimes(1);
  });

  it("분류를 바꾸면 그 분류의 목록으로 바뀌고, 이전 분류에서 고른 양식은 남지 않는다", async () => {
    const user = userEvent.setup();
    renderWithListTemplates((query) =>
      Promise.resolve({ items: query?.categoryId === "service" ? [SERVICE_FORM] : [NDA_FORM], counts: COUNTS }),
    );
    await screen.findAllByText("비밀유지계약서(NDA) 표준");

    await user.click(screen.getByText("용역"));

    expect((await screen.findAllByText("용역계약서 표준")).length).toBeGreaterThan(0);
    expect(screen.queryByText("비밀유지계약서(NDA) 표준")).not.toBeInTheDocument();
  });

  it("불러오기에 실패하면 모달 안에 실패 안내와 '다시 시도'를 보여주고, 미리보기도 실패로 말한다", async () => {
    renderWithListTemplates(() => Promise.reject(new Error("서버 오류")));
    expect(await screen.findByText("양식을 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /다시 시도/ })).toBeInTheDocument();
    // 실패했는데 "고르세요" 라고 말하면 안 된다.
    expect(screen.getByText("미리보기를 열 수 없어요")).toBeInTheDocument();
    expect(screen.queryByText("고른 양식이 없어요")).not.toBeInTheDocument();
  });

  it("'다시 시도'를 누르면 목록을 다시 불러온다", async () => {
    const user = userEvent.setup();
    let hasFailed = false;
    renderWithListTemplates(() => {
      if (!hasFailed) {
        hasFailed = true;
        return Promise.reject(new Error("서버 오류"));
      }
      return Promise.resolve({ items: [NDA_FORM], counts: COUNTS });
    });
    await screen.findByText("양식을 불러오지 못했어요");

    await user.click(screen.getByRole("button", { name: /다시 시도/ }));

    expect((await screen.findAllByText("비밀유지계약서(NDA) 표준")).length).toBeGreaterThan(0);
  });
});
