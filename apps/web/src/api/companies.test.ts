import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchCompanies, createCompany } from "./companies";

const BASE = "http://localhost:3000";

function mockFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("companies api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("searchCompanies는 q·limit 쿼리로 /companies를 GET한다", async () => {
    const fetchMock = mockFetch([{ id: "c1", name: "삼성전자(주)" }]);
    const res = await searchCompanies("삼성", 5);
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/companies?q=%EC%82%BC%EC%84%B1&limit=5`, expect.anything());
    expect(res[0].name).toBe("삼성전자(주)");
  });

  it("searchCompanies limit 기본값은 10", async () => {
    const fetchMock = mockFetch([]);
    await searchCompanies("lg");
    expect(fetchMock.mock.calls[0][0]).toContain("limit=10");
  });

  it("createCompany는 /companies로 POST하고 body를 보낸다", async () => {
    const fetchMock = mockFetch({ id: "c9", name: "신규(주)" });
    const res = await createCompany({ type: "company", name: "신규(주)", bizNo: "111-11-11111" } as never);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/companies`);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body).name).toBe("신규(주)");
    expect(res.id).toBe("c9");
  });
});
