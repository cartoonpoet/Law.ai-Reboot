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
} from "@lawai/contracts";

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
    });
    return user ? this.toWithHash(user) : null;
  }

  async findById(req: FindUserByIdRequest): Promise<UserWithHash | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.id },
    });
    return user ? this.toWithHash(user) : null;
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

  private toWithHash(u: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: Date;
  }): UserWithHash {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash: u.passwordHash,
      createdAt: u.createdAt.toISOString(),
    };
  }
}
