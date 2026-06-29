import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateUserRequest,
  FindUserByEmailRequest,
  FindUserByIdRequest,
  UserWithHash,
  CreateResetTokenRequest,
  ConsumeResetTokenRequest,
  ConsumeResetTokenResult,
  UpdatePasswordRequest,
  SearchUsersRequest,
  PublicUser,
} from "@lawai/contracts";

// department 관계를 include 한 User 행
type UserRow = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isSystemAdmin: boolean;
  departmentId: string | null;
  createdAt: Date;
  department?: { name: string } | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(req: CreateUserRequest): Promise<UserWithHash> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: req.email,
          name: req.name,
          passwordHash: req.passwordHash,
        },
      });
      return this.toWithHash(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new RpcException({
          status: 409,
          message: "이미 가입된 이메일입니다",
        });
      }
      throw error;
    }
  }

  async findByEmail(
    req: FindUserByEmailRequest,
  ): Promise<UserWithHash | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: req.email },
      include: { department: true },
    });
    return user ? this.toWithHash(user) : null;
  }

  async findById(req: FindUserByIdRequest): Promise<UserWithHash | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.id },
      include: { department: true },
    });
    return user ? this.toWithHash(user) : null;
  }

  async search(req: SearchUsersRequest): Promise<PublicUser[]> {
    const q = req.q?.trim();
    const rows = (await this.prisma.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      include: { department: true },
      take: req.limit ?? 20,
      orderBy: { name: "asc" },
    })) as UserRow[];
    return rows.map((r) => this.toPublic(r));
  }

  private toPublic(u: UserRow): PublicUser {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      departmentId: u.departmentId,
      departmentName: u.department?.name ?? null,
      createdAt: u.createdAt.toISOString(),
    };
  }

  async createResetToken(req: CreateResetTokenRequest): Promise<void> {
    // 사용자당 기존 미사용 토큰은 무효화하여 항상 최신 한 개만 유효하게 둔다.
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: req.userId, usedAt: null },
    });
    await this.prisma.passwordResetToken.create({
      data: {
        userId: req.userId,
        tokenHash: req.tokenHash,
        expiresAt: new Date(req.expiresAt),
      },
    });
  }

  async consumeResetToken(
    req: ConsumeResetTokenRequest,
  ): Promise<ConsumeResetTokenResult | null> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: req.tokenHash },
    });
    if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) {
      return null;
    }
    await this.prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    return { userId: token.userId };
  }

  async updatePassword(req: UpdatePasswordRequest): Promise<void> {
    await this.prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash: req.passwordHash },
    });
  }

  private toWithHash(u: UserRow): UserWithHash {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash: u.passwordHash,
      isSystemAdmin: u.isSystemAdmin,
      departmentId: u.departmentId,
      departmentName: u.department?.name ?? null,
      createdAt: u.createdAt.toISOString(),
    };
  }
}
