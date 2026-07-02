import { tenantScope, resolveTenantId } from "./tenant-scope";

describe("tenantScope", () => {
  it("일반 사용자는 tenantId 필터를 반환한다", () => {
    expect(tenantScope({ tenantId: "t1", isSystemAdmin: false })).toEqual({ tenantId: "t1" });
  });
  it("시스템 admin 은 빈 필터(전 테넌트)", () => {
    expect(tenantScope({ isSystemAdmin: true })).toEqual({});
  });
  it("resolveTenantId 는 생성 시 tenantId 를 강제 — 일반 사용자", () => {
    expect(resolveTenantId({ tenantId: "t1", isSystemAdmin: false })).toBe("t1");
  });
  it("resolveTenantId — admin 인데 tenantId 없으면 RpcException", () => {
    expect(() => resolveTenantId({ isSystemAdmin: true })).toThrow();
  });
});
