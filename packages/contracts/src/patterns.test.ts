import { describe, it, expect } from "vitest";
import { AUTH_PATTERNS, USER_PATTERNS } from "./patterns";

describe("message patterns", () => {
  it("auth 패턴은 'auth.' 프리픽스를 가진다", () => {
    expect(AUTH_PATTERNS.SIGNUP).toBe("auth.signup");
    expect(AUTH_PATTERNS.LOGIN).toBe("auth.login");
    expect(AUTH_PATTERNS.VALIDATE).toBe("auth.validate");
  });

  it("user 패턴은 'user.' 프리픽스를 가진다", () => {
    expect(USER_PATTERNS.CREATE).toBe("user.create");
    expect(USER_PATTERNS.FIND_BY_EMAIL).toBe("user.findByEmail");
    expect(USER_PATTERNS.FIND_BY_ID).toBe("user.findById");
  });
});
