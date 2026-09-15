import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { R2Client } from "../files/r2.client";
import { ProfileService } from "./profile.service";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://r2.example/signed"),
}));

/**
 * 내 정보 설정 단위 테스트 — 이름·이메일 알림 변경, 프로필 사진 올리기·지우기·보여주기(R2 mock).
 */
describe("ProfileService", () => {
  let service: ProfileService;
  const prismaMock = { user: { findUnique: jest.fn(), update: jest.fn() } };
  const sendMock = jest.fn();
  const r2Mock = {
    disabled: false,
    bucket: "test-bucket",
    client: { send: sendMock },
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };

  const userRow = (over: Record<string, unknown> = {}) => ({
    id: "u1",
    email: "a@b.com",
    name: "손준호",
    isSystemAdmin: false,
    departmentId: "d1",
    emailNotify: true,
    notifyApproval: true,
    notifyComment: true,
    avatarKey: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    department: { name: "법무팀" },
    ...over,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: R2Client, useValue: r2Mock },
      ],
    }).compile();
    service = moduleRef.get(ProfileService);
  });

  describe("get / update", () => {
    it("내 정보에 부서 이름·이메일 알림·사진 키를 담아 준다", async () => {
      prismaMock.user.findUnique.mockResolvedValue(userRow({ avatarKey: "avatars/u1/a.png" }));
      await expect(service.get({ userId: "u1" })).resolves.toMatchObject({
        name: "손준호",
        departmentName: "법무팀",
        emailNotify: true,
    notifyApproval: true,
    notifyComment: true,
        avatarKey: "avatars/u1/a.png",
      });
    });

    it("이름은 앞뒤 공백을 지우고 저장한다", async () => {
      prismaMock.user.update.mockResolvedValue(userRow({ name: "손준호2" }));
      await service.update({ userId: "u1", name: "  손준호2 " });
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "u1" }, data: { name: "손준호2" } }),
      );
    });

    it("이름이 2자 미만이거나 50자를 넘으면 400", async () => {
      await expect(service.update({ userId: "u1", name: " 손 " })).rejects.toMatchObject({ error: { status: 400 } });
      await expect(service.update({ userId: "u1", name: "가".repeat(51) })).rejects.toMatchObject({ error: { status: 400 } });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("이메일 알림만 바꿀 수 있다", async () => {
      prismaMock.user.update.mockResolvedValue(userRow({ emailNotify: false }));
      const res = await service.update({ userId: "u1", emailNotify: false });
      expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { emailNotify: false } }));
      expect(res.emailNotify).toBe(false);
    });
  });

  describe("프로필 사진", () => {
    it("PNG·JPG·WEBP 2MB 이하면 내 폴더 아래 새 키로 올릴 주소를 준다", async () => {
      const res = await service.avatarUploadTarget({ userId: "u1", mimeType: "image/png", size: 1024 });
      expect(res.url).toBe("https://r2.example/signed");
      expect(res.key).toMatch(/^avatars\/u1\/[0-9a-f-]{36}\.png$/);
    });

    it("이미지가 아니거나 2MB 를 넘으면 400", async () => {
      await expect(service.avatarUploadTarget({ userId: "u1", mimeType: "application/pdf", size: 10 })).rejects.toMatchObject({
        error: { status: 400, message: "PNG·JPG·WEBP 이미지만 올릴 수 있습니다" },
      });
      await expect(
        service.avatarUploadTarget({ userId: "u1", mimeType: "image/jpeg", size: 2 * 1024 * 1024 + 1 }),
      ).rejects.toMatchObject({ error: { status: 400, message: "프로필 사진은 2MB 이하만 올릴 수 있습니다" } });
    });

    it("업로드를 확인하면 내 사진으로 지정하고 이전 사진 객체를 지운다", async () => {
      sendMock.mockResolvedValue({});
      prismaMock.user.findUnique.mockResolvedValue({ avatarKey: "avatars/u1/old.png" });
      prismaMock.user.update.mockResolvedValue(userRow({ avatarKey: "avatars/u1/new.png" }));

      const res = await service.confirmAvatar({ userId: "u1", key: "avatars/u1/new.png" });

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "u1" }, data: { avatarKey: "avatars/u1/new.png" } }),
      );
      expect(r2Mock.deleteObject).toHaveBeenCalledWith("avatars/u1/old.png");
      expect(res.avatarKey).toBe("avatars/u1/new.png");
    });

    it("다른 사람 폴더의 키로는 확인할 수 없다 — 400", async () => {
      await expect(service.confirmAvatar({ userId: "u1", key: "avatars/u2/x.png" })).rejects.toMatchObject({
        error: { status: 400 },
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("R2 에 객체가 없으면(업로드 미완료) 400 — 사진을 바꾸지 않는다", async () => {
      sendMock.mockRejectedValue(new Error("NotFound"));
      await expect(service.confirmAvatar({ userId: "u1", key: "avatars/u1/new.png" })).rejects.toMatchObject({
        error: { status: 400 },
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("사진을 지우면 키를 비우고 R2 객체도 지운다", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ avatarKey: "avatars/u1/old.png" });
      prismaMock.user.update.mockResolvedValue(userRow());
      await service.removeAvatar({ userId: "u1" });
      expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { avatarKey: null } }));
      expect(r2Mock.deleteObject).toHaveBeenCalledWith("avatars/u1/old.png");
    });

    it("공개 이미지 경로는 그 사용자의 현재 사진일 때만 받아올 주소를 준다", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ avatarKey: "avatars/u1/now.png" });
      await expect(service.avatarSource({ userId: "u1", fileName: "now.png" })).resolves.toEqual({
        url: "https://r2.example/signed",
      });
    });

    it("지난 사진·없는 사진·경로 조작은 404", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ avatarKey: "avatars/u1/now.png" });
      await expect(service.avatarSource({ userId: "u1", fileName: "old.png" })).rejects.toMatchObject({ error: { status: 404 } });
      await expect(service.avatarSource({ userId: "u1", fileName: "../u2/now.png" })).rejects.toMatchObject({ error: { status: 404 } });
      prismaMock.user.findUnique.mockResolvedValue({ avatarKey: null });
      await expect(service.avatarSource({ userId: "u1", fileName: "now.png" })).rejects.toMatchObject({ error: { status: 404 } });
    });
  });
});
