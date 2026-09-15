import { describe, expect, it } from "vitest";
import { getAvatarFileError } from "./avatarFile";
import { passwordChangeSchema } from "./passwordChangeSchema";
import { toSettingsTab } from "./settingsTabs";

describe("toSettingsTab", () => {
  it("알려진 탭만 받고 나머지는 null", () => {
    expect(toSettingsTab("password")).toBe("password");
    expect(toSettingsTab("system")).toBeNull();
    expect(toSettingsTab(undefined)).toBeNull();
  });
});

describe("getAvatarFileError", () => {
  it("PNG·JPG·WEBP 2MB 이하만 통과한다", () => {
    expect(getAvatarFileError(new File(["x"], "a.png", { type: "image/png" }))).toBeNull();
    expect(getAvatarFileError(new File(["x"], "a.gif", { type: "image/gif" }))).toBe("PNG·JPG·WEBP 이미지만 올릴 수 있어요");
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    expect(getAvatarFileError(big)).toBe("2MB 이하 사진만 올릴 수 있어요");
  });
});

describe("passwordChangeSchema", () => {
  const messagesOf = (values: Record<string, string>) => {
    const result = passwordChangeSchema.safeParse(values);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it("조건을 모두 만족하면 통과한다", () => {
    expect(messagesOf({ currentPassword: "Old1234!", newPassword: "New1234!", newPasswordConfirm: "New1234!" })).toEqual([]);
  });

  it("규칙 미달·확인 불일치·현재와 같음을 각각 알려준다", () => {
    expect(messagesOf({ currentPassword: "Old1234!", newPassword: "short", newPasswordConfirm: "short" })).toContain(
      "영문·숫자·특수문자 포함 8자 이상이어야 합니다",
    );
    expect(messagesOf({ currentPassword: "Old1234!", newPassword: "New1234!", newPasswordConfirm: "New1234" })).toContain(
      "새 비밀번호와 같지 않아요",
    );
    expect(messagesOf({ currentPassword: "Same1234!", newPassword: "Same1234!", newPasswordConfirm: "Same1234!" })).toContain(
      "현재 비밀번호와 다른 비밀번호를 입력하세요",
    );
  });
});
