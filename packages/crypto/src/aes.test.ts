import { describe, it, expect } from "vitest";
import { encryptString, decryptString, loadMasterKey } from "./aes";

const KEY = Buffer.alloc(32, 7); // 테스트용 32바이트 키

describe("aes", () => {
  it("암호화한 값을 같은 키로 복호화하면 원문이 나온다", () => {
    const sealed = encryptString("sk-test-1234", KEY);
    expect(decryptString(sealed, KEY)).toBe("sk-test-1234");
  });

  it("같은 원문도 매번 다른 암호문을 만든다(랜덤 IV)", () => {
    const a = encryptString("same-plain", KEY);
    const b = encryptString("same-plain", KEY);
    expect(a).not.toBe(b);
  });

  it("잘못된 키로 복호화하면 실패한다", () => {
    const sealed = encryptString("secret", KEY);
    const wrongKey = Buffer.alloc(32, 9);
    expect(() => decryptString(sealed, wrongKey)).toThrow();
  });

  it("loadMasterKey: 32바이트 base64 환경변수를 읽어 Buffer 로 반환", () => {
    const b64 = Buffer.alloc(32, 1).toString("base64");
    process.env.TEST_MASTER_KEY = b64;
    const key = loadMasterKey("TEST_MASTER_KEY");
    expect(key.length).toBe(32);
    delete process.env.TEST_MASTER_KEY;
  });

  it("loadMasterKey: 환경변수 없으면 에러", () => {
    delete process.env.MISSING_KEY_VAR;
    expect(() => loadMasterKey("MISSING_KEY_VAR")).toThrow();
  });

  it("loadMasterKey: 32바이트가 아니면 에러", () => {
    process.env.TEST_MASTER_KEY_BAD = Buffer.alloc(16, 1).toString("base64");
    expect(() => loadMasterKey("TEST_MASTER_KEY_BAD")).toThrow();
    delete process.env.TEST_MASTER_KEY_BAD;
  });
});
