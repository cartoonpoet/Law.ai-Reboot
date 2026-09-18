import jwt from "jsonwebtoken";

// presign 응답에 포함되는 단기 JWT. confirm 단계에서 verify 해 사용자가 임의의 key 로
// confirm 호출하는 위변조를 차단한다.
export interface UploadTokenClaims {
  sub: string; // viewerId
  // 계약 첨부면 contractId, 자문 첨부면 adviceId.
  contractId?: string | null;
  adviceId?: string | null;
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

// 파일 토큰(업로드·다운로드 주소) 공용 비밀키.
export const getFileTokenSecret = (): string =>
  process.env.FILE_UPLOAD_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  "dev-upload-secret";

export const signUploadToken = (
  claims: UploadTokenClaims,
  expiresInSec: number,
): string =>
  jwt.sign(claims, getFileTokenSecret(), { expiresIn: expiresInSec, algorithm: "HS256" });

export const verifyUploadToken = (token: string): UploadTokenClaims => {
  const payload = jwt.verify(token, getFileTokenSecret()) as jwt.JwtPayload &
    UploadTokenClaims & { purpose?: unknown };
  // 같은 비밀키로 서명하는 다운로드 주소 토큰(purpose 있음)을 업로드 토큰으로 쓰지 못하게 막는다.
  if (payload.purpose !== undefined || typeof payload.storageKey !== "string") {
    throw new Error("업로드 토큰이 아닙니다");
  }
  return {
    sub: payload.sub,
    contractId: payload.contractId ?? null,
    adviceId: payload.adviceId ?? null,
    commentId: payload.commentId ?? null,
    role: payload.role,
    storageKey: payload.storageKey,
    fileName: payload.fileName,
    sha256: payload.sha256,
    size: payload.size,
    mimeType: payload.mimeType,
  };
};
