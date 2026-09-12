import { Injectable, Inject } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type { TenantContext, MyAiCredentialDto, SaveMyAiCredentialRequest } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import type { AiCredentialVerifier } from "./ai-credential-verifier";

// 암복호화 포트 — @lawai/crypto 직접 호출을 얇게 감싸 테스트에서 mock 가능하게.
export interface CryptoPort {
  encrypt(plain: string): string;
  decrypt(sealed: string): string;
}

@Injectable()
export class AiCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("AI_CRYPTO_PORT") private readonly crypto: CryptoPort,
    @Inject("AI_CREDENTIAL_VERIFIER") private readonly verifier: AiCredentialVerifier,
  ) {}

  async get(viewerId: string, _ctx: TenantContext): Promise<MyAiCredentialDto | null> {
    const row = await this.prisma.aiProviderCredential.findUnique({ where: { userId: viewerId } });
    if (!row) return null;
    return {
      provider: row.provider,
      model: row.model,
      hasApiKey: true,
      lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    };
  }

  async save(req: SaveMyAiCredentialRequest): Promise<MyAiCredentialDto> {
    if (!req.viewerId) {
      throw new RpcException({ status: 401, message: "인증이 필요합니다" });
    }
    const ok = await this.verifier.verify({ provider: req.provider, model: req.model, apiKey: req.apiKey });
    if (!ok) {
      throw new RpcException({ status: 400, message: "API 키 검증에 실패했습니다" });
    }
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
      throw new RpcException({ status: 400, message: "테넌트 컨텍스트가 없습니다" });
    }
    const now = new Date();
    const encryptedApiKey = this.crypto.encrypt(req.apiKey);
    await this.prisma.aiProviderCredential.upsert({
      where: { userId: req.viewerId },
      create: { userId: req.viewerId, tenantId, provider: req.provider, model: req.model, encryptedApiKey, lastVerifiedAt: now },
      update: { tenantId, provider: req.provider, model: req.model, encryptedApiKey, lastVerifiedAt: now },
    });
    return { provider: req.provider, model: req.model, hasApiKey: true, lastVerifiedAt: now.toISOString() };
  }
}
