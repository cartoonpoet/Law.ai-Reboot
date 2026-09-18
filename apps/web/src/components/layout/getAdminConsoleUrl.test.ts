import { describe, expect, it } from "vitest";
import { getAdminConsoleUrl } from "./getAdminConsoleUrl";

describe("getAdminConsoleUrl", () => {
  it("설정값이 있으면 그대로 쓴다", () => {
    expect(getAdminConsoleUrl("https://admin.example.com", { protocol: "https:", hostname: "app.example.com" })).toBe(
      "https://admin.example.com",
    );
  });

  it("배포 주소는 앞에 admin 을 붙인다", () => {
    expect(getAdminConsoleUrl(undefined, { protocol: "https:", hostname: "lawai-reboot.kro.kr" })).toBe(
      "https://admin.lawai-reboot.kro.kr",
    );
  });

  it("이미 admin 도메인이면 그대로 둔다", () => {
    expect(getAdminConsoleUrl(undefined, { protocol: "https:", hostname: "admin.lawai-reboot.kro.kr" })).toBe(
      "https://admin.lawai-reboot.kro.kr",
    );
  });

  it("로컬은 관리자 앱 개발 서버를 연다", () => {
    expect(getAdminConsoleUrl(undefined, { protocol: "http:", hostname: "localhost" })).toBe("http://localhost:5175");
  });
});
