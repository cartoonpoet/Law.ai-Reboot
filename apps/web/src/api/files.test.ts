import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDownloadUrl, presignFile } from "./files";
import { apiFetch } from "./client";

vi.mock("./client", () => ({
  apiFetch: vi.fn(),
  getApiBaseUrl: () => "/api",
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("presignFile", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("서버가 준 업로드 중계 경로 앞에 API 주소를 붙인다", async () => {
    apiFetchMock.mockResolvedValue({
      uploadUrl: "/files/upload?token=up",
      uploadToken: "up",
      storageKey: "contracts/c/u/a.pdf",
      expiresIn: 900,
    });
    const req = {
      contractId: "c",
      fileName: "a.pdf",
      size: 8,
      mimeType: "application/pdf",
      sha256: "a".repeat(64),
    };

    const res = await presignFile(req);

    expect(apiFetchMock).toHaveBeenCalledWith("/files/presign", {
      method: "POST",
      body: JSON.stringify(req),
    });
    expect(res.uploadUrl).toBe("/api/files/upload?token=up");
    expect(res.uploadToken).toBe("up");
  });
});

describe("getDownloadUrl", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("서버가 준 중계 경로 앞에 API 주소를 붙여 바로 열 수 있는 주소로 만든다", async () => {
    apiFetchMock.mockResolvedValue({ url: "/files/file-1/content?token=abc", expiresIn: 900 });

    const res = await getDownloadUrl("file-1");

    expect(apiFetchMock).toHaveBeenCalledWith("/files/file-1/download");
    expect(res).toEqual({ url: "/api/files/file-1/content?token=abc", expiresIn: 900 });
  });

  it("이미 완전한 주소면 그대로 쓴다", async () => {
    apiFetchMock.mockResolvedValue({ url: "https://files.example/a.pdf", expiresIn: 900 });

    const res = await getDownloadUrl("file-1");

    expect(res.url).toBe("https://files.example/a.pdf");
  });
});
