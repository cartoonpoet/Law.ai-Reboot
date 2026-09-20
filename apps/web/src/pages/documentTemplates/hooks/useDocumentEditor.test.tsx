import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { vi } from "vitest";
import { useDocumentEditor } from "./useDocumentEditor";
import * as templatesApi from "../../../api/documentTemplates";
import { getToasts, resetToasts } from "../../../lib/toast/toastStore";

const wrapper = ({ children }: PropsWithChildren) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useDocumentEditor", () => {
  beforeEach(() => resetToasts());

  it("save는 현재 HTML을 Tiptap JSON으로 바꿔 createTemplateVersion을 부른다", async () => {
    vi.spyOn(templatesApi, "getTemplate").mockResolvedValue({
      id: "t1",
      categoryId: "nda",
      name: "테스트",
      currentVersionNo: 1,
      createdById: "u1",
      createdByName: "김서연",
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
      currentVersion: { versionNo: 1, content: { type: "doc", content: [{ type: "paragraph" }] }, clauseCount: null, createdById: "u1", createdByName: "김서연", createdAt: "2026-09-20T00:00:00.000Z" },
    });
    const createSpy = vi.spyOn(templatesApi, "createTemplateVersion").mockResolvedValue({} as never);

    const { result } = renderHook(() => useDocumentEditor("t1"), { wrapper });
    await waitFor(() => expect(result.current.content).not.toBe(""));

    await act(async () => {
      result.current.setContent("<p>고친 내용</p>");
    });
    await act(async () => {
      await result.current.save();
    });

    expect(createSpy).toHaveBeenCalledWith("t1", expect.objectContaining({ clauseCount: null }));
  });

  it("revert는 되돌린 뒤 템플릿·버전 목록 쿼리를 무효화하고 버전 이력을 닫는다", async () => {
    vi.spyOn(templatesApi, "getTemplate").mockResolvedValue({
      id: "t1",
      categoryId: "nda",
      name: "테스트",
      currentVersionNo: 2,
      createdById: "u1",
      createdByName: "김서연",
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
      currentVersion: { versionNo: 2, content: { type: "doc", content: [{ type: "paragraph" }] }, clauseCount: null, createdById: "u1", createdByName: "김서연", createdAt: "2026-09-20T00:00:00.000Z" },
    });
    vi.spyOn(templatesApi, "listTemplateVersions").mockResolvedValue({ versions: [] });
    const revertSpy = vi.spyOn(templatesApi, "revertTemplateVersion").mockResolvedValue({} as never);

    const { result } = renderHook(() => useDocumentEditor("t1"), { wrapper });
    await waitFor(() => expect(result.current.content).not.toBe(""));

    act(() => result.current.openVersions());
    expect(result.current.isVersionOpen).toBe(true);

    await act(async () => {
      await result.current.revert(1);
    });

    expect(revertSpy).toHaveBeenCalledWith("t1", 1);
    expect(result.current.isVersionOpen).toBe(false);
  });

  it("revert가 실패하면 에러 토스트를 띄우고 지금 보이던 내용·버전 이력 열림 상태를 그대로 둔다", async () => {
    vi.spyOn(templatesApi, "getTemplate").mockResolvedValue({
      id: "t1",
      categoryId: "nda",
      name: "테스트",
      currentVersionNo: 2,
      createdById: "u1",
      createdByName: "김서연",
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
      currentVersion: { versionNo: 2, content: { type: "doc", content: [{ type: "paragraph" }] }, clauseCount: null, createdById: "u1", createdByName: "김서연", createdAt: "2026-09-20T00:00:00.000Z" },
    });
    vi.spyOn(templatesApi, "listTemplateVersions").mockResolvedValue({ versions: [] });
    vi.spyOn(templatesApi, "revertTemplateVersion").mockRejectedValue(new Error("네트워크 오류"));

    const { result } = renderHook(() => useDocumentEditor("t1"), { wrapper });
    await waitFor(() => expect(result.current.content).not.toBe(""));

    act(() => result.current.openVersions());
    const contentBeforeRevert = result.current.content;

    await act(async () => {
      await result.current.revert(1);
    });

    expect(getToasts().map((toast) => toast.title)).toContain("되돌리지 못했어요");
    // 실패 시 setContent(null)을 호출하지 않아야 한다 — 편집기가 빈 문서로 바뀌지 않고 지금 내용을 유지한다.
    expect(result.current.content).toBe(contentBeforeRevert);
    expect(result.current.isVersionOpen).toBe(true);
  });
});
