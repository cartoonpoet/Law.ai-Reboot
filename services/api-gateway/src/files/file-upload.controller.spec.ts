import { Readable } from "node:stream";
import { of, throwError } from "rxjs";
import { HttpException } from "@nestjs/common";
import { FILE_PATTERNS } from "@lawai/contracts";
import { FileUploadController } from "./file-upload.controller";

/**
 * 게이트웨이 파일 업로드 중계 단위 테스트.
 *
 * - 토큰 확인·R2 PUT 주소는 user-service(GET_UPLOAD_TARGET)에 위임한다.
 * - 신청한 크기와 같은 본문만 받아 R2 로 올리고 ETag 를 돌려준다.
 */
describe("FileUploadController (gateway)", () => {
  const sendMock = jest.fn();
  const fetchMock = jest.fn();
  const realFetch = global.fetch;
  let controller: FileUploadController;

  const makeReq = (bytes: string[], contentLength: string) =>
    Object.assign(Readable.from(bytes.map((b) => Buffer.from(b))), {
      headers: { "content-length": contentLength },
    }) as never;

  const makeRes = () => {
    const headers: Record<string, string> = {};
    return { headers, setHeader: (name: string, value: string) => (headers[name] = value) };
  };

  const statusOf = (error: unknown) => (error as HttpException).getStatus();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    controller = new FileUploadController({ send: sendMock } as never);
    sendMock.mockReturnValue(
      of({ url: "https://r2.example/put", size: 8, mimeType: "application/pdf" }),
    );
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it("토큰 확인 후 받은 본문을 R2 로 올리고 ETag 를 돌려준다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200, headers: { etag: '"abc123"' } }));
    const res = makeRes();

    const result = await controller.upload("tok", makeReq(["%PDF", "-1.3"], "8"), res as never);

    expect(sendMock).toHaveBeenCalledWith(FILE_PATTERNS.GET_UPLOAD_TARGET, { token: "tok" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://r2.example/put");
    expect(init.method).toBe("PUT");
    expect(init.headers).toEqual({ "Content-Type": "application/pdf" });
    expect(Buffer.from(init.body).toString()).toBe("%PDF-1.3");
    expect(result).toEqual({ etag: "abc123" });
    expect(res.headers.ETag).toBe('"abc123"');
    expect(res.headers["Access-Control-Expose-Headers"]).toBe("ETag");
  });

  it("토큰이 없으면 401 — user-service 에 묻지 않는다", async () => {
    const error = await controller
      .upload(undefined, makeReq(["x"], "1"), makeRes() as never)
      .catch((e: unknown) => e);
    expect(statusOf(error)).toBe(401);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("user-service 가 토큰을 거절하면 그 상태(401)를 그대로 전달한다", async () => {
    sendMock.mockReturnValue(
      throwError(() => ({ status: 401, message: "업로드 토큰이 만료되었거나 유효하지 않습니다" })),
    );
    const error = await controller
      .upload("expired", makeReq(["%PDF-1.3"], "8"), makeRes() as never)
      .catch((e: unknown) => e);
    expect(statusOf(error)).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("요청 크기가 신청 크기와 다르면 본문을 받기 전에 400", async () => {
    const error = await controller
      .upload("tok", makeReq(["%PDF-1.3-more"], "13"), makeRes() as never)
      .catch((e: unknown) => e);
    expect(statusOf(error)).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("실제 본문이 신청 크기를 넘으면 400 — R2 로 올리지 않는다", async () => {
    const error = await controller
      .upload("tok", makeReq(["%PDF-1.3", "extra"], "8"), makeRes() as never)
      .catch((e: unknown) => e);
    expect(statusOf(error)).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("실제 본문이 신청 크기보다 작으면 400", async () => {
    const error = await controller
      .upload("tok", makeReq(["%PDF"], "8"), makeRes() as never)
      .catch((e: unknown) => e);
    expect(statusOf(error)).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R2 가 거절하면 502", async () => {
    fetchMock.mockResolvedValue(new Response("<Error/>", { status: 403 }));
    const error = await controller
      .upload("tok", makeReq(["%PDF-1.3"], "8"), makeRes() as never)
      .catch((e: unknown) => e);
    expect(statusOf(error)).toBe(502);
  });

  it("R2 에 연결하지 못하면 502", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const error = await controller
      .upload("tok", makeReq(["%PDF-1.3"], "8"), makeRes() as never)
      .catch((e: unknown) => e);
    expect(statusOf(error)).toBe(502);
  });
});
