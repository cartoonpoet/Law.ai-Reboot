import type { JwtPayload } from "@lawai/contracts";
import type { Request } from "express";
import { extractTenantContext } from "./tenant-context";

function makeReq(user: JwtPayload): Request {
  return { user } as unknown as Request;
}

describe("extractTenantContext", () => {
  it("시스템 admin 페이로드 → isSystemAdmin:true, tenantId:undefined", () => {
    const req = makeReq({ sub: "admin-1", email: "admin@test.com", isSystemAdmin: true });
    const ctx = extractTenantContext(req);
    expect(ctx.isSystemAdmin).toBe(true);
    expect(ctx.tenantId).toBeUndefined();
  });

  it("일반 사용자 페이로드 → isSystemAdmin:false, tenantId=activeTenantId", () => {
    const req = makeReq({
      sub: "user-1",
      email: "user@test.com",
      isSystemAdmin: false,
      activeTenantId: "tenant-abc",
      activeRole: "general",
    });
    const ctx = extractTenantContext(req);
    expect(ctx.isSystemAdmin).toBe(false);
    expect(ctx.tenantId).toBe("tenant-abc");
  });
});
