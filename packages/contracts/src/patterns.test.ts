import { describe, it, expect } from "vitest";
import { AUTH_PATTERNS, USER_PATTERNS, COMPANY_PATTERNS, DOCUMENT_PATTERNS, DOCUMENT_TEMPLATE_PATTERNS } from "./patterns";

describe("message patterns", () => {
  it("auth 패턴은 'auth.' 프리픽스를 가진다", () => {
    expect(AUTH_PATTERNS.SIGNUP).toBe("auth.signup");
    expect(AUTH_PATTERNS.LOGIN).toBe("auth.login");
    expect(AUTH_PATTERNS.VALIDATE).toBe("auth.validate");
    expect(AUTH_PATTERNS.REFRESH).toBe("auth.refresh");
  });

  it("user 패턴은 'user.' 프리픽스를 가진다", () => {
    expect(USER_PATTERNS.CREATE).toBe("user.create");
    expect(USER_PATTERNS.FIND_BY_EMAIL).toBe("user.findByEmail");
    expect(USER_PATTERNS.FIND_BY_ID).toBe("user.findById");
  });

  it("company 패턴은 'company.' 프리픽스를 가진다", () => {
    expect(COMPANY_PATTERNS.SEARCH).toBe("company.search");
    expect(COMPANY_PATTERNS.CREATE).toBe("company.create");
  });
});

describe("DOCUMENT_TEMPLATE_PATTERNS / DOCUMENT_PATTERNS", () => {
  it("모든 값이 고유한 문자열이다", () => {
    const values = [...Object.values(DOCUMENT_TEMPLATE_PATTERNS), ...Object.values(DOCUMENT_PATTERNS)];
    expect(new Set(values).size).toBe(values.length);
    values.forEach((v) => expect(typeof v).toBe("string"));
  });
});
