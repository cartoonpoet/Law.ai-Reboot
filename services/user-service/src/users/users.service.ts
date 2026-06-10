import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateUserRequest,
  FindUserByEmailRequest,
  FindUserByIdRequest,
  UserWithHash,
} from "@lawai/contracts";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(req: CreateUserRequest): Promise<UserWithHash> {
    const user = await this.prisma.user.create({
      data: {
        email: req.email,
        name: req.name,
        passwordHash: req.passwordHash,
      },
    });
    return this.toWithHash(user);
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
