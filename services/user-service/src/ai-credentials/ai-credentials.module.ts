import { Module } from "@nestjs/common";
import { loadMasterKey, encryptString, decryptString } from "@lawai/crypto";
import { AiCredentialsController } from "./ai-credentials.controller";
import { AiCredentialsService, type CryptoPort } from "./ai-credentials.service";
import type { AiCredentialVerifier } from "./ai-credential-verifier";

// crypto port 실제 구현 — 마스터키는 호출 시점에 로드(모듈 로드 시점 즉시 실패 방지).
const cryptoPort: CryptoPort = {
  encrypt: (plain) => encryptString(plain, loadMasterKey()),
  decrypt: (sealed) => decryptString(sealed, loadMasterKey()),
};

// 임시 더미 검증기 — Task 6 에서 실제 ai-service RPC(ai.listModels) 클라이언트로 교체.
const dummyVerifier: AiCredentialVerifier = {
  verify: async () => true,
};

@Module({
  controllers: [AiCredentialsController],
  providers: [
    AiCredentialsService,
    { provide: "AI_CRYPTO_PORT", useValue: cryptoPort },
    { provide: "AI_CREDENTIAL_VERIFIER", useValue: dummyVerifier },
  ],
})
export class AiCredentialsModule {}
