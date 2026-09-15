import { Readable } from "node:stream";
import { of } from "rxjs";
import { HttpException } from "@nestjs/common";
import { USER_PATTERNS, type UserProfileRow } from "@lawai/contracts";
import { UsersController } from "./users.controller";
import { toMyProfile } from "./to-my-profile";

/**
 * 게이트웨이 내 정보 설정 경로 단위 테스트 — 내 정보 조회·수정, 프로필 사진 올리기(R2 fetch mock).
 */
const ROW: UserProfileRow = {
  id: "u1",
  email: "a@b.com",
  name: "손준호",
  isSystemAdmin: false,
  departmentId: "d1",
  departmentName: "법무팀",
  createdAt: "2026-01-01T00:00:00.000Z",
  emailNotify: true,
  notifyApproval: true,
  notifyComment: true,
  notifyContractExpiry: true,
  avatarKey: "avatars/u1/abc.png",
};

describe("toMyProfile", () => {
  it("R2 키는 감추고 공개 이미지 경로로 바꾼다", () => {
    const profile = toMyProfile(ROW);
    expect(profile.avatarUrl).toBe("/users/u1/avatar/abc.png");
    expect(profile).not.toHaveProperty("avatarKey");
  });

  it("사진이 없으면 avatarUrl 은 null", () => {
    expect(toMyProfile({ ...ROW, avatarKey: null }).avatarUrl).toBeNull();
  });
});

describe("UsersController (gateway) 내 정보 설정", () => {
  const sendMock = jest.fn();
  const fetchMock = jest.fn();
  const realFetch = global.fetch;
  let controller: UsersController;

  const makeReq = (over: Record<string, unknown> = {}, bytes: string[] = []) =>
    Object.assign(Readable.from(bytes.map((b) => Buffer.from(b))), {
      headers: {},
      user: { sub: "u1" },
      ...over,
    }) as never;

  const statusOf = (error: unknown) => (error as HttpException).getStatus();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    controller = new UsersController({ send: sendMock } as never);
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it("내 정보 조회는 JWT 사용자로 묻고 MyProfile 로 내보낸다", async () => {
    sendMock.mockReturnValue(of(ROW));
    const profile = await controller.me(makeReq());
    expect(sendMock).toHaveBeenCalledWith(USER_PATTERNS.GET_PROFILE, { userId: "u1" });
    expect(profile).toMatchObject({ name: "손준호", emailNotify: true, avatarUrl: "/users/u1/avatar/abc.png" });
  });

  it("내 정보 수정은 이름·이메일 알림만 넘긴다", async () => {
    sendMock.mockReturnValue(of({ ...ROW, emailNotify: false }));
    await controller.updateMe({ emailNotify: false }, makeReq());
    expect(sendMock).toHaveBeenCalledWith(USER_PATTERNS.UPDATE_PROFILE, { userId: "u1", name: undefined, emailNotify: false });
  });

  it("사진을 받아 R2 에 올린 뒤 그 키로 내 사진을 지정한다", async () => {
    sendMock.mockImplementation((pattern: string) =>
      pattern === USER_PATTERNS.AVATAR_UPLOAD_TARGET
        ? of({ url: "https://r2.example/put", key: "avatars/u1/new.png" })
        : of({ ...ROW, avatarKey: "avatars/u1/new.png" }),
    );
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const profile = await controller.uploadAvatar(
      makeReq({ headers: { "content-length": "4", "content-type": "image/png" } }, ["abcd"]),
    );

    expect(sendMock).toHaveBeenCalledWith(USER_PATTERNS.AVATAR_UPLOAD_TARGET, { userId: "u1", mimeType: "image/png", size: 4 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://r2.example/put");
    expect(init).toMatchObject({ method: "PUT", headers: { "Content-Type": "image/png" } });
    expect(sendMock).toHaveBeenCalledWith(USER_PATTERNS.AVATAR_CONFIRM, { userId: "u1", key: "avatars/u1/new.png" });
    expect(profile.avatarUrl).toBe("/users/u1/avatar/new.png");
  });

  it("2MB 를 넘는 사진은 본문을 받기 전에 400", async () => {
    const error = await controller
      .uploadAvatar(makeReq({ headers: { "content-length": String(2 * 1024 * 1024 + 1), "content-type": "image/png" } }))
      .catch((e: unknown) => e);
    expect(statusOf(error)).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("R2 가 거절하면 502 — 내 사진을 바꾸지 않는다", async () => {
    sendMock.mockReturnValue(of({ url: "https://r2.example/put", key: "avatars/u1/new.png" }));
    fetchMock.mockResolvedValue(new Response("<Error/>", { status: 403 }));
    const error = await controller
      .uploadAvatar(makeReq({ headers: { "content-length": "3", "content-type": "image/png" } }, ["abc"]))
      .catch((e: unknown) => e);
    expect(statusOf(error)).toBe(502);
    expect(sendMock).not.toHaveBeenCalledWith(USER_PATTERNS.AVATAR_CONFIRM, expect.anything());
  });
});
