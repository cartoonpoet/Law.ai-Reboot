import jwt from "jsonwebtoken";

// presign 응답에 포함되는 단기 JWT. confirm 단계에서 verify 해 사용자가 임의의 key 로
// confirm 호출하는 위변조를 차단한다.
export interface UploadTokenClaims {
  sub: string; // viewerId
  contractId: string;
  commentId?: string | null;
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
    storageKey: payload.storageKey,
    fileName: payload.fileName,
    sha256: payload.sha256,
    size: payload.size,
    mimeType: payload.mimeType,
  };
};
