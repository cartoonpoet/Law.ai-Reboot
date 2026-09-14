import { ApiError } from "../../api/apiError";
import { ErrorPage } from "./ErrorPage";

const NOT_FOUND = new ApiError(404, "");

/** 없는 주소 — 홈으로 조용히 되돌리지 않고 404 오류 페이지를 보여준다. */
export const NotFoundPage = () => <ErrorPage error={NOT_FOUND} onRetry={null} />;
