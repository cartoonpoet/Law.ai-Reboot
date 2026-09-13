import jwt from "jsonwebtoken";

// presign 응답에 포함되는 단기 JWT. confirm 단계에서 verify 해 사용자가 임의의 key 로
// confirm 호출하는 위변조를 차단한다.
export interface UploadTokenClaims {
  sub: string; // viewerId
  contractId: string;
  commentId?: string | null;
  // 어떤 슬롯의 파일인지 — 코멘트 첨부는 항상 attach, 계약 본 파일은 contract/attach/ref.
  // presign 시 클라이언트가 지정, confirm 시 token 에서 그대로 사용(서버 결정 유지).
  role: "contract" | "attach" | "ref" | "etc" | "signed";
  storageKey: string;
  fileName: string;
  sha256: string;
  size: number;
  mimeType: string;
}

const getSecret = (): string =>
  process.env.FILE_UPLOAD_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  "dev-upload-secret";

export const signUploadToken = (
  claims: UploadTokenClaims,
  expiresInSec: number,
): string =>
  jwt.sign(claims, getSecret(), { expiresIn: expiresInSec, algorithm: "HS256" });

export const verifyUploadToken = (token: string): UploadTokenClaims => {
  const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload &
    UploadTokenClaims;
  return {
    sub: payload.sub,
    contractId: payload.contractId,
    commentId: payload.commentId ?? null,
    role: payload.role,
    storageKey: payload.storageKey,
    fileName: payload.fileName,
    sha256: payload.sha256,
    size: payload.size,
    mimeType: payload.mimeType,
  };
};
