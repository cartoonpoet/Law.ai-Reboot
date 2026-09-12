import { Module } from "@nestjs/common";
import { loadMasterKey, encryptString, decryptString } from "@lawai/crypto";
import { AiCredentialsController } from "./ai-credentials.controller";
import { AiCredentialsService, type CryptoPort } from "./ai-credentials.service";
import { AiServiceClient } from "./ai-service.client";

// crypto port 실제 구현 — 마스터키는 호출 시점에 로드(모듈 로드 시점 즉시 실패 방지).
const cryptoPort: CryptoPort = {
  encrypt: (plain) => encryptString(plain, loadMasterKey()),
  decrypt: (sealed) => decryptString(sealed, loadMasterKey()),
};

@Module({
  controllers: [AiCredentialsController],
  providers: [
    AiCredentialsService,
    AiServiceClient,
    { provide: "AI_CRYPTO_PORT", useValue: cryptoPort },
    { provide: "AI_CREDENTIAL_VERIFIER", useExisting: AiServiceClient },
  ],
})
export class AiCredentialsModule {}
