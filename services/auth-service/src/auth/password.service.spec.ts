import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const svc = new PasswordService();

  it("해시는 평문과 달라야 한다", async () => {
    const hash = await svc.hash("s3cret!");
    expect(hash).not.toBe("s3cret!");
    expect(hash.startsWith("$argon2")).toBe(true);
  });

  it("올바른 비밀번호는 검증을 통과한다", async () => {
    const hash = await svc.hash("s3cret!");
    await expect(svc.verify(hash, "s3cret!")).resolves.toBe(true);
  });

  it("틀린 비밀번호는 검증에 실패한다", async () => {
    const hash = await svc.hash("s3cret!");
    await expect(svc.verify(hash, "wrong")).resolves.toBe(false);
  });
});
