import { getApiBaseUrl } from "./client";

// 서버가 API 기준 경로(/files/..., /users/.../avatar/...)로 준 주소 앞에 API 주소를 붙인다.
// <img>·PDF 뷰어·새 탭처럼 apiFetch 를 거치지 않는 곳에서 그대로 쓰기 위함. 완전한 주소는 그대로 둔다.
export const toApiUrl = (url: string) =>
  url.startsWith("/") ? `${getApiBaseUrl()}${url}` : url;
