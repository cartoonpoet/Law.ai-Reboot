import { assertAuthEnv } from "./env.validation";

describe("assertAuthEnv", () => {
  it("필수 시크릿이 모두 있으면 통과한다", () => {
    expect(() =>
      assertAuthEnv({
        JWT_ACCESS_SECRET: "a",
        JWT_REFRESH_SECRET: "b",
      }),
    ).not.toThrow();
  });

  it("시크릿이 없으면 누락된 키를 알리며 throw한다", () => {
    expect(() => assertAuthEnv({ JWT_ACCESS_SECRET: "a" })).toThrow(
      /JWT_REFRESH_SECRET/,
    );
  });

  it("둘 다 없으면 둘 다 보고한다", () => {
    expect(() => assertAuthEnv({})).toThrow(
      /JWT_ACCESS_SECRET.*JWT_REFRESH_SECRET/,
    );
  });
});
