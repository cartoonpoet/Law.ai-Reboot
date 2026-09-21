import { RpcException } from "@nestjs/microservices";
import { buildListWhere, parseExpiryFilter, parseStatusesParam } from "./contract-list-filters";

const ctx = { tenantId: "t1", isSystemAdmin: false };

describe("parseStatusesParam", () => {
  it("쉼표 목록을 상태 배열로", () => {
    expect(parseStatusesParam("signing, signed")).toEqual(["signing", "signed"]);
  });
  it("모르는 값·빈 값은 400", () => {
    expect(() => parseStatusesParam("nope")).toThrow(RpcException);
    expect(() => parseStatusesParam(" , ")).toThrow(RpcException);
  });
});

describe("parseExpiryFilter", () => {
  it("expired 는 lt, 창은 gte~lte, 상속 키·모르는 값은 400", () => {
    expect(parseExpiryFilter("expired")).toEqual({ lt: expect.any(Date) });
    const w = parseExpiryFilter("d30") as { gte: Date; lte: Date };
    expect(w.lte.getTime() - w.gte.getTime()).toBe(30 * 86_400_000);
    expect(() => parseExpiryFilter("toString")).toThrow(RpcException);
    expect(() => parseExpiryFilter("x")).toThrow(RpcException);
  });
});

describe("buildListWhere", () => {
  it("필터가 없으면 삭제 제외 + 테넌트만", () => {
    const { where, countWhere } = buildListWhere({ tenantContext: ctx }, ctx);
    expect(where).toEqual({ deletedAt: null, tenantId: "t1" });
    expect(countWhere).toEqual(where);
  });
  it("status 단일이 statuses 보다 우선하고 countWhere 에는 상태가 없다", () => {
    const { where, countWhere } = buildListWhere({ status: "signed", statuses: "draft", tenantContext: ctx }, ctx);
    expect(where.status).toBe("signed");
    expect(countWhere.status).toBeUndefined();
  });
  it("expiry 는 체결 이후 상태와의 교집합(비면 빈 in)", () => {
    const { where, countWhere } = buildListWhere({ statuses: "legalReview", expiry: "expired", tenantContext: ctx }, ctx);
    expect(where.status).toEqual({ in: [] });
    expect(countWhere.status).toEqual({ in: ["signed", "fulfilling", "closed"] });
  });
  it("검색어는 제목·관리번호·상대회사명 OR", () => {
    const { where } = buildListWhere({ q: " 삼성 ", tenantContext: ctx }, ctx);
    expect(where.OR).toHaveLength(3);
  });
});
