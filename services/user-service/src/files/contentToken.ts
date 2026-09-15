import jwt from "jsonwebtoken";
import { getFileTokenSecret } from "./uploadToken";

// 다운로드 주소(/files/:id/content?token=)에 붙는 단기 JWT.
// 발급 시점에 열람 권한을 확인했다는 증표라, 게이트웨이는 로그인 헤더를 못 붙이는 요청
// (이미지·PDF 뷰어·새 탭)도 이 토큰만으로 파일 내용을 중계한다.
// 업로드 토큰과 같은 비밀키를 쓰므로 purpose 로 용도를 구분해 서로 바꿔 쓰지 못하게 한다.
const PURPOSE = "file-content";

interface ContentTokenPayload {
  fileId: string;
  purpose: typeof PURPOSE;
}

export const signContentToken = (fileId: string, expiresInSec: number): string =>
  jwt.sign({ fileId, purpose: PURPOSE } satisfies ContentTokenPayload, getFileTokenSecret(), {
    expiresIn: expiresInSec,
    algorithm: "HS256",
  });

// 서명·만료·용도가 맞고 fileId 가 일치할 때만 true.
export const checkContentToken = (token: string, fileId: string): boolean => {
  try {
    const payload = jwt.verify(token, getFileTokenSecret(), {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload & Partial<ContentTokenPayload>;
    return payload.purpose === PURPOSE && payload.fileId === fileId;
  } catch {
    return false;
  }
};
