import { of, throwError } from "rxjs";
import { HttpException } from "@nestjs/common";
import { AUTH_PATTERNS, type AuthTokens } from "@lawai/contracts";
import { AuthController } from "./auth.controller";

/**
 * 게이트웨이 AuthController.refresh 단위 테스트.
 *
 * - REFRESH 패턴으로 authClient.send 위임 → AuthTokens 반환.
 * - RPC 가 401 RpcException 을 던지면 rpcToHttp() 가 HTTP 401 로 전파.
 */
describe("AuthController (gateway) refresh", () => {
  const sendMock = jest.fn();
  const authClient = { send: sendMock };
  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authClient as never);
  });

  it("REFRESH 패턴으로 위임하고 새 AuthTokens 를 반환한다", async () => {
    const tokens: AuthTokens = { accessToken: "newA", refreshToken: "newR" };
    sendMock.mockReturnValue(of(tokens));

    const result = await controller.refresh({ refreshToken: "validR" });

    expect(sendMock).toHaveBeenCalledWith(AUTH_PATTERNS.REFRESH, {
      refreshToken: "validR",
    });
    expect(result).toEqual(tokens);
  });

  it("RPC 401 에러 페이로드는 rpcToHttp 로 HTTP 401 로 전파한다", async () => {
    // TCP 전송에서 RpcException 은 { status, message } 페이로드로 직렬화돼 도착한다.
    sendMock.mockReturnValue(
      throwError(() => ({ status: 401, message: "세션이 만료되었습니다" })),
    );

    await expect(
      controller.refresh({ refreshToken: "expired" }),
    ).rejects.toBeInstanceOf(HttpException);

    try {
      await controller.refresh({ refreshToken: "expired" });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(401);
      expect((err as HttpException).message).toBe("세션이 만료되었습니다");
    }
  });
});
