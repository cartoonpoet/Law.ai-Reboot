import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/** 32바이트 마스터키를 base64 환경변수에서 읽는다. 누락/길이 불일치 시 즉시 예외(fail-fast). */
export function loadMasterKey(envVar = "AI_CREDENTIAL_MASTER_KEY"): Buffer {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`${envVar} 환경변수가 설정되어 있지 않습니다`);
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`${envVar} 는 base64 인코딩된 32바이트 키여야 합니다 (현재 ${key.length}바이트)`);
  }
  return key;
}

/** AES-256-GCM 암호화. 반환값 = base64(iv(12) + authTag(16) + ciphertext). */
export function encryptString(plain: string, masterKey: Buffer): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptString(sealed: string, masterKey: Buffer): string {
  const buf = Buffer.from(sealed, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, masterKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
