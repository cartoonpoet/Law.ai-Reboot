import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import { firstValueFrom } from "rxjs";
import {
  USER_PATTERNS,
  type SignupRequest,
  type LoginRequest,
  type ValidateTokenRequest,
  type PublicUser,
  type AuthTokens,
  type UserWithHash,
  type JwtPayload,
} from "@lawai/contracts";
import { PasswordService } from "./password.service";

interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  async signup(req: SignupRequest): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(req.password);
    const created = await firstValueFrom(
      this.userClient.send<UserWithHash>(USER_PATTERNS.CREATE, {
        email: req.email,
        name: req.name,
        passwordHash,
      }),
    );
    return this.buildResult(created);
  }

  async login(req: LoginRequest): Promise<AuthResult> {
    const user = await firstValueFrom(
      this.userClient.send<UserWithHash | null>(USER_PATTERNS.FIND_BY_EMAIL, {
        email: req.email,
      }),
    );
    if (!user) {
      throw new RpcException({ status: 401, message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }
    const ok = await this.passwords.verify(user.passwordHash, req.password);
    if (!ok) {
      throw new RpcException({ status: 401, message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }
    return this.buildResult(user);
  }

  async validate(req: ValidateTokenRequest): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(req.token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new RpcException({ status: 401, message: "유효하지 않은 토큰" });
    }
  }

  private async buildResult(user: UserWithHash): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessOptions: JwtSignOptions = {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_TTL ??
        "900s") as JwtSignOptions["expiresIn"],
    };
    const refreshOptions: JwtSignOptions = {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_TTL ??
        "7d") as JwtSignOptions["expiresIn"],
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, accessOptions),
      this.jwt.signAsync(payload, refreshOptions),
    ]);
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
    return { user: publicUser, tokens: { accessToken, refreshToken } };
  }
}
