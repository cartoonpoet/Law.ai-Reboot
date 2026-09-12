import { Injectable, Inject } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type { MyAiCredentialDto, SaveMyAiCredentialRequest } from "@lawai/contracts";
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

  // 자격증명은 userId 유니크(사용자 1인당 1건)라 테넌트 스코프가 개입할 여지가 없다 —
  // 그래서 TenantContext 를 받지 않는다.
  async get(viewerId: string | undefined): Promise<MyAiCredentialDto | null> {
    if (!viewerId) {
      throw new RpcException({ status: 401, message: "인증이 필요합니다" });
    }
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

  // 내부 전용(RPC 미노출) — 다른 서비스 로직(예: AiAnalysisService)이 특정 사용자의
  // 복호화된 AI 자격증명을 직접 조회할 때 사용.
  async getDecryptedKeyFor(
    userId: string,
  ): Promise<{ provider: string; model: string; apiKey: string } | null> {
    const row = await this.prisma.aiProviderCredential.findUnique({ where: { userId } });
    if (!row) return null;
    return { provider: row.provider, model: row.model, apiKey: this.crypto.decrypt(row.encryptedApiKey) };
  }
}
