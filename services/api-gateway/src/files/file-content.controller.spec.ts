import { PassThrough } from "node:stream";
import { of, throwError } from "rxjs";
import { HttpException } from "@nestjs/common";
import { FILE_PATTERNS } from "@lawai/contracts";
import { FileContentController } from "./file-content.controller";

/**
 * 게이트웨이 파일 내용 중계 단위 테스트.
 *
 * - 토큰 확인은 user-service(GET_CONTENT_SOURCE)에 위임하고, 받은 R2 주소를 서버가 fetch 해 그대로 흘려준다.
 * - Range 요청은 R2 로 넘기고 206·content-range 를 되돌려준다.
 */

// express Response 대역 — 스트림으로 받은 바이트와 상태·헤더를 기록한다.
class FakeResponse extends PassThrough {
  statusCode = 0;
  headers: Record<string, string> = {};
  chunks: Buffer[] = [];

  constructor() {
    super();
    this.on("data", (chunk: Buffer) => this.chunks.push(chunk));
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }

  get text() {
    return Buffer.concat(this.chunks).toString("utf8");
  }
}

describe("FileContentController (gateway)", () => {
  const sendMock = jest.fn();
  const fetchMock = jest.fn();
  const realFetch = global.fetch;
  let controller: FileContentController;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    controller = new FileContentController({ send: sendMock } as never);
    sendMock.mockReturnValue(of({ url: "https://r2.example/signed" }));
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  const makeReq = (headers: Record<string, string> = {}) => ({ headers }) as never;

  it("토큰 확인 후 R2 에서 받은 파일을 헤더와 함께 그대로 내려준다", async () => {
    fetchMock.mockResolvedValue(
      new Response("%PDF-1.3 body", {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-length": "13",
          "content-disposition": "attachment; filename*=UTF-8''a.pdf",
          "x-amz-request-id": "hidden",
        },
      }),
    );
    const res = new FakeResponse();

    await controller.content("file-1", "tok", makeReq(), res as never);

    expect(sendMock).toHaveBeenCalledWith(FILE_PATTERNS.GET_CONTENT_SOURCE, {
      fileId: "file-1",
      token: "tok",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://r2.example/signed", { headers: {} });
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("%PDF-1.3 body");
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-length"]).toBe("13");
    expect(res.headers["content-disposition"]).toContain("a.pdf");
    expect(res.headers["x-amz-request-id"]).toBeUndefined();
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });

  it("Range 요청은 R2 로 넘기고 206 부분 응답을 돌려준다", async () => {
    fetchMock.mockResolvedValue(
      new Response("%PDF", {
        status: 206,
        headers: { "content-range": "bytes 0-3/35154", "accept-ranges": "bytes" },
      }),
    );
    const res = new FakeResponse();

    await controller.content("file-1", "tok", makeReq({ range: "bytes=0-3" }), res as never);

    expect(fetchMock).toHaveBeenCalledWith("https://r2.example/signed", {
      headers: { Range: "bytes=0-3" },
    });
    expect(res.statusCode).toBe(206);
    expect(res.headers["content-range"]).toBe("bytes 0-3/35154");
    expect(res.text).toBe("%PDF");
  });

  it("토큰이 없으면 401 — user-service 에 묻지 않는다", async () => {
    await expect(
      controller.content("file-1", undefined, makeReq(), new FakeResponse() as never),
    ).rejects.toMatchObject({ status: 401 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("user-service 가 토큰을 거절하면 그 상태(401)를 그대로 전달한다", async () => {
    sendMock.mockReturnValue(
      throwError(() => ({ status: 401, message: "파일 주소가 만료되었거나 유효하지 않습니다" })),
    );
    await expect(
      controller.content("file-1", "expired", makeReq(), new FakeResponse() as never),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R2 가 거절(403)하면 502 로 바꿔 알린다", async () => {
    fetchMock.mockResolvedValue(new Response("<Error/>", { status: 403 }));
    const error = await controller
      .content("file-1", "tok", makeReq(), new FakeResponse() as never)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(502);
  });

  it("R2 에 연결하지 못하면 502", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const error = await controller
      .content("file-1", "tok", makeReq(), new FakeResponse() as never)
      .catch((e: unknown) => e);
    expect((error as HttpException).getStatus()).toBe(502);
  });
});
