import { describe, it, expect, vi, beforeEach } from "vitest";
import { getApiBaseUrl } from "./client";

describe("client api base url", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "");
  });

  it("VITE_API_URL이 있으면 우선 사용한다", () => {
    vi.stubEnv("VITE_API_URL", "http://api.example.com:3000");
    expect(getApiBaseUrl()).toBe("http://api.example.com:3000");
  });

  it("기본값은 현재 호스트의 3000 포트를 사용한다", () => {
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, hostname: "61.98.69.247" },
    });

    expect(getApiBaseUrl()).toBe("http://61.98.69.247:3000");
  });
});
