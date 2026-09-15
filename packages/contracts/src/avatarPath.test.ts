import { describe, expect, it } from "vitest";
import { toAvatarPath } from "./dto/user.dto";

describe("toAvatarPath", () => {
  it("R2 키의 파일 이름만 꺼내 공개 이미지 경로로 만든다", () => {
    expect(toAvatarPath("u1", "avatars/u1/1b2c.png")).toBe("/users/u1/avatar/1b2c.png");
  });

  it("사진이 없으면 null", () => {
    expect(toAvatarPath("u1", null)).toBeNull();
    expect(toAvatarPath("u1", undefined)).toBeNull();
    expect(toAvatarPath("u1", "")).toBeNull();
  });
});
