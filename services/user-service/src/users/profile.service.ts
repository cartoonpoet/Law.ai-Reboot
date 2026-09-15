import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { randomUUID } from "node:crypto";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  type AvatarMimeType,
  type AvatarSource,
  type AvatarSourceRequest,
  type AvatarUploadTarget,
  type AvatarUploadTargetRequest,
  type ConfirmAvatarRequest,
  type GetProfileRequest,
  type RemoveAvatarRequest,
  type UpdateProfileRequest,
  type UserProfileRow,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { R2Client } from "../files/r2.client";

const AVATAR_PREFIX = "avatars";
// 게이트웨이가 본문을 받은 뒤 곧바로 올리고 받아가므로 짧게 둔다.
const UPLOAD_TTL_SEC = 300;
const SOURCE_TTL_SEC = 60;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;

const AVATAR_EXTENSIONS: Record<AvatarMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

type ProfileUserRow = {
  id: string;
  email: string;
  name: string;
  isSystemAdmin: boolean;
  departmentId: string | null;
  emailNotify: boolean;
  notifyApproval: boolean;
  notifyComment: boolean;
  notifyContractExpiry: boolean;
  avatarKey: string | null;
  createdAt: Date;
  department?: { name: string } | null;
};

const toProfileRow = (user: ProfileUserRow): UserProfileRow => ({
  id: user.id,
  email: user.email,
  name: user.name,
  isSystemAdmin: user.isSystemAdmin,
  departmentId: user.departmentId,
  departmentName: user.department?.name ?? null,
  createdAt: user.createdAt.toISOString(),
  emailNotify: user.emailNotify,
  notifyApproval: user.notifyApproval,
  notifyComment: user.notifyComment,
  notifyContractExpiry: user.notifyContractExpiry,
  avatarKey: user.avatarKey,
});

const getUserAvatarPrefix = (userId: string) => `${AVATAR_PREFIX}/${userId}/`;

const isAvatarMimeType = (mimeType: string): mimeType is AvatarMimeType =>
  (AVATAR_MIME_TYPES as readonly string[]).includes(mimeType);

/**
 * 내 정보 설정 — 이름·이메일 알림 변경과 프로필 사진(R2) 올리기·지우기·보여주기.
 * 이메일·부서·회사별 역할은 여기서 바꾸지 않는다(로그인 아이디·관리자 지정 값).
 */
@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Client,
  ) {}

  async get(req: GetProfileRequest): Promise<UserProfileRow> {
    const user = await this.prisma.user.findUnique({ where: { id: req.userId }, include: { department: true } });
    if (!user) throw new RpcException({ status: 404, message: "사용자를 찾을 수 없습니다" });
    return toProfileRow(user);
  }

  async update(req: UpdateProfileRequest): Promise<UserProfileRow> {
    const data: { name?: string; emailNotify?: boolean; notifyApproval?: boolean; notifyComment?: boolean; notifyContractExpiry?: boolean } = {};
    if (req.name !== undefined) {
      const name = req.name.trim();
      if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
        throw new RpcException({ status: 400, message: `이름은 ${NAME_MIN_LENGTH}~${NAME_MAX_LENGTH}자로 입력하세요` });
      }
      data.name = name;
    }
    if (req.emailNotify !== undefined) data.emailNotify = req.emailNotify;
    if (req.notifyApproval !== undefined) data.notifyApproval = req.notifyApproval;
    if (req.notifyComment !== undefined) data.notifyComment = req.notifyComment;
    if (req.notifyContractExpiry !== undefined) data.notifyContractExpiry = req.notifyContractExpiry;
    if (Object.keys(data).length === 0) return this.get({ userId: req.userId });

    const user = await this.prisma.user.update({ where: { id: req.userId }, data, include: { department: true } });
    return toProfileRow(user);
  }

  async avatarUploadTarget(req: AvatarUploadTargetRequest): Promise<AvatarUploadTarget> {
    this.ensureStorage();
    if (!isAvatarMimeType(req.mimeType)) {
      throw new RpcException({ status: 400, message: "PNG·JPG·WEBP 이미지만 올릴 수 있습니다" });
    }
    if (!(req.size > 0 && req.size <= MAX_AVATAR_SIZE_BYTES)) {
      throw new RpcException({ status: 400, message: "프로필 사진은 2MB 이하만 올릴 수 있습니다" });
    }
    const key = `${getUserAvatarPrefix(req.userId)}${randomUUID()}.${AVATAR_EXTENSIONS[req.mimeType]}`;
    const url = await getSignedUrl(
      this.r2.client as never,
      new PutObjectCommand({ Bucket: this.r2.bucket as string, Key: key, ContentType: req.mimeType }),
      { expiresIn: UPLOAD_TTL_SEC },
    );
    return { url, key };
  }

  // 업로드가 끝난 키를 내 사진으로 지정하고, 이전 사진 객체는 best-effort 로 지운다.
  async confirmAvatar(req: ConfirmAvatarRequest): Promise<UserProfileRow> {
    this.ensureStorage();
    if (!req.key.startsWith(getUserAvatarPrefix(req.userId))) {
      throw new RpcException({ status: 400, message: "잘못된 사진입니다" });
    }
    try {
      await (this.r2.client as never as { send: (cmd: HeadObjectCommand) => Promise<unknown> }).send(
        new HeadObjectCommand({ Bucket: this.r2.bucket as string, Key: req.key }),
      );
    } catch {
      throw new RpcException({ status: 400, message: "사진 업로드가 끝나지 않았습니다. 다시 올려주세요" });
    }

    const previous = await this.prisma.user.findUnique({ where: { id: req.userId }, select: { avatarKey: true } });
    if (!previous) throw new RpcException({ status: 404, message: "사용자를 찾을 수 없습니다" });
    const user = await this.prisma.user.update({
      where: { id: req.userId },
      data: { avatarKey: req.key },
      include: { department: true },
    });
    if (previous.avatarKey && previous.avatarKey !== req.key) {
      await this.r2.deleteObject(previous.avatarKey);
    }
    return toProfileRow(user);
  }

  async removeAvatar(req: RemoveAvatarRequest): Promise<UserProfileRow> {
    const previous = await this.prisma.user.findUnique({ where: { id: req.userId }, select: { avatarKey: true } });
    if (!previous) throw new RpcException({ status: 404, message: "사용자를 찾을 수 없습니다" });
    const user = await this.prisma.user.update({
      where: { id: req.userId },
      data: { avatarKey: null },
      include: { department: true },
    });
    if (previous.avatarKey) await this.r2.deleteObject(previous.avatarKey);
    return toProfileRow(user);
  }

  // 공개 이미지 경로의 파일이 그 사용자의 "현재" 사진일 때만 받아올 주소를 준다 — 지운·바뀐 사진이나
  // 다른 R2 객체를 이 경로로 읽지 못하게 한다.
  async avatarSource(req: AvatarSourceRequest): Promise<AvatarSource> {
    this.ensureStorage();
    const key = `${getUserAvatarPrefix(req.userId)}${req.fileName}`;
    const user = await this.prisma.user.findUnique({ where: { id: req.userId }, select: { avatarKey: true } });
    if (!user || !user.avatarKey || user.avatarKey !== key || req.fileName.includes("/")) {
      throw new RpcException({ status: 404, message: "사진을 찾을 수 없습니다" });
    }
    const url = await getSignedUrl(
      this.r2.client as never,
      new GetObjectCommand({ Bucket: this.r2.bucket as string, Key: key }),
      { expiresIn: SOURCE_TTL_SEC },
    );
    return { url };
  }

  private ensureStorage(): void {
    if (this.r2.disabled || !this.r2.client || !this.r2.bucket) {
      throw new RpcException({ status: 503, message: "파일 저장소가 구성되지 않았습니다 (R2 미설정)" });
    }
  }
}
