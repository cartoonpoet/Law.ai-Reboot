# AI 분석 실동작화 + OpenAI 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계약 화면의 mock AI 분석(사전점검/리스크) 4개 지점을 실제 OpenAI 호출로 대체한다. 개인별 API Key 등록, 새 무상태 `ai-service`, DB 테이블 기반 잡 큐, 상태 전이 시 자동 트리거.

**Architecture:** user-service가 DB(`ai` 스키마: `AiProviderCredential`, `AiAnalysis`)를 계속 소유하고, 새 `ai-service`는 자체 DB 없이 "복호화된 API 키 + 입력을 받아 OpenAI 호출 결과만 반환"하는 무상태 서비스(auth-service와 동일한 선례). 트리거는 계약 상태 전이 성공 직후 fire-and-forget RPC. 프론트는 폴링으로 결과를 받는다.

**Tech Stack:** NestJS 11 (TCP RPC + api-gateway REST/JWT), Prisma 6 (multiSchema), Node 22 native `fetch`(OpenAI 호출, 별도 SDK 없음), React 19 + react-query + vanilla-extract(`themeVars`), Jest(백엔드)/Vitest(프론트)

**Spec:** `docs/superpowers/specs/2026-09-12-ai-provider-integration-design.md`

## Global Constraints

- 커밋: `<type>: <내용>`, 이모지 금지.
- 프론트(apps/web): 화살표 함수, 커스텀 훅(`use~`), `useEffect`/`useMemo`/`useCallback` 금지(파생은 렌더 중 계산), 인라인 style 금지 — vanilla-extract + `themeVars` 토큰만.
- 백엔드 테스트: `cd services/<service> && pnpm test -- <파일명 일부>` (jest). 프론트: `cd apps/web && pnpm test -- <경로>` (vitest run).
- API Key는 반드시 `packages/crypto`로 암호화 후 저장 — 평문 저장 금지.
- OpenAI 호출은 Node 22 native `fetch` 사용, 새 SDK 의존성 추가 안 함.
- DB 스키마 변경 후 erdify MCP 로 "Law.ai Reboot" ERD 동기화(연결 안 되면 사용자에게 보고 후 보류, 작업은 계속).

---

### Task 1: `packages/crypto` — AES-256-GCM 암복호화 유틸

**Files:**
- Create: `packages/crypto/package.json`, `packages/crypto/tsconfig.json`, `packages/crypto/src/index.ts`, `packages/crypto/src/aes.ts`, `packages/crypto/src/aes.test.ts`

**Interfaces:**
- Produces: `loadMasterKey(envVar?: string): Buffer`, `encryptString(plain: string, masterKey: Buffer): string`, `decryptString(sealed: string, masterKey: Buffer): string`

- [ ] **Step 1: 패키지 스캐폴딩** — `packages/contracts/package.json`을 그대로 본떠 작성(이름만 `@lawai/crypto`로, `@lawai/contracts` 의존성은 뺌):

```json
{
  "name": "@lawai/crypto",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --clean",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@lawai/typescript-config": "workspace:*",
    "tsup": "^8.3.5",
    "typescript": "5.5.4",
    "vitest": "^2.1.8"
  }
}
```

`tsconfig.json`은 `packages/contracts/tsconfig.json`을 그대로 복사.

- [ ] **Step 2: 실패하는 테스트 작성** (`src/aes.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { encryptString, decryptString, loadMasterKey } from "./aes";

const KEY = Buffer.alloc(32, 7); // 테스트용 32바이트 키

describe("aes", () => {
  it("암호화한 값을 같은 키로 복호화하면 원문이 나온다", () => {
    const sealed = encryptString("sk-test-1234", KEY);
    expect(decryptString(sealed, KEY)).toBe("sk-test-1234");
  });

  it("같은 원문도 매번 다른 암호문을 만든다(랜덤 IV)", () => {
    const a = encryptString("same-plain", KEY);
    const b = encryptString("same-plain", KEY);
    expect(a).not.toBe(b);
  });

  it("잘못된 키로 복호화하면 실패한다", () => {
    const sealed = encryptString("secret", KEY);
    const wrongKey = Buffer.alloc(32, 9);
    expect(() => decryptString(sealed, wrongKey)).toThrow();
  });

  it("loadMasterKey: 32바이트 base64 환경변수를 읽어 Buffer 로 반환", () => {
    const b64 = Buffer.alloc(32, 1).toString("base64");
    process.env.TEST_MASTER_KEY = b64;
    const key = loadMasterKey("TEST_MASTER_KEY");
    expect(key.length).toBe(32);
    delete process.env.TEST_MASTER_KEY;
  });

  it("loadMasterKey: 환경변수 없으면 에러", () => {
    delete process.env.MISSING_KEY_VAR;
    expect(() => loadMasterKey("MISSING_KEY_VAR")).toThrow();
  });

  it("loadMasterKey: 32바이트가 아니면 에러", () => {
    process.env.TEST_MASTER_KEY_BAD = Buffer.alloc(16, 1).toString("base64");
    expect(() => loadMasterKey("TEST_MASTER_KEY_BAD")).toThrow();
    delete process.env.TEST_MASTER_KEY_BAD;
  });
});
```

- [ ] **Step 2b: 테스트 실패 확인** — `cd packages/crypto && pnpm install && pnpm test` (모듈 없음으로 FAIL 예상)
- [ ] **Step 3: 구현** (`src/aes.ts`):

```ts
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/** 32바이트 마스터키를 base64 환경변수에서 읽는다. 누락/길이 불일치 시 즉시 예외(fail-fast). */
export function loadMasterKey(envVar = "AI_CREDENTIAL_MASTER_KEY"): Buffer {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`${envVar} 환경변수가 설정되어 있지 않습니다`);
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`${envVar} 는 base64 인코딩된 32바이트 키여야 합니다 (현재 ${key.length}바이트)`);
  }
  return key;
}

/** AES-256-GCM 암호화. 반환값 = base64(iv(12) + authTag(16) + ciphertext). */
export function encryptString(plain: string, masterKey: Buffer): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptString(sealed: string, masterKey: Buffer): string {
  const buf = Buffer.from(sealed, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, masterKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
```

`src/index.ts`: `export * from "./aes";`

- [ ] **Step 4: 테스트 통과 확인** — `pnpm test` → PASS. `pnpm build` → dist 생성 확인.
- [ ] **Step 5: Commit** — `git add packages/crypto && git commit -m "feat: AES-256-GCM 암복호화 유틸 패키지 추가"`

### Task 2: user-service — `ai` 스키마 (AiProviderCredential/AiAnalysis) + 마이그레이션

**Files:**
- Modify: `services/user-service/prisma/schema.prisma`
- Modify: `services/user-service/package.json` (`@lawai/crypto` 의존성 추가)
- Modify: `services/user-service/.env`(.example) — `AI_CREDENTIAL_MASTER_KEY` 추가

**Interfaces:**
- Produces: `AiProviderCredential { userId(unique), tenantId, provider, model, encryptedApiKey, lastVerifiedAt }`, `AiAnalysis { targetType, targetId, kind, status, model, triggeredByUserId, input, result, errorMessage, attempts }` (둘 다 `ai` 스키마)

- [ ] **Step 1: datasource schemas 목록에 `ai` 추가** — `schema.prisma` 상단 `datasource db { schemas = [...] }`에 `"ai"` 추가.
- [ ] **Step 2: 모델 추가** — 스펙 §5의 두 모델을 그대로 `schema.prisma` 끝에 추가.
- [ ] **Step 3: 마이그레이션** — `cd services/user-service && npx prisma migrate dev --name ai_provider_integration`. drift 로 reset 요구 시 수락(dev 데이터 폐기 허용).
- [ ] **Step 4: `@lawai/crypto` 의존성 추가** — `package.json` `dependencies`에 `"@lawai/crypto": "workspace:*"` 추가 후 `pnpm install`.
- [ ] **Step 5: 환경변수 준비** — `.env`/`.env.example`에 `AI_CREDENTIAL_MASTER_KEY=`(로컬 개발용 32바이트 base64 예시값 주석으로 생성 커맨드 안내: `openssl rand -base64 32`) 추가.
- [ ] **Step 6: erdify MCP 로 "Law.ai Reboot" ERD 에 두 신규 테이블 반영** (미연결이면 보고 후 보류)
- [ ] **Step 7: Commit** — `git commit -m "feat: AI 자격증명/분석 결과 스키마 추가 (ai 스키마)"`

### Task 3: `@lawai/contracts` — AI DTO/패턴

**Files:**
- Create: `packages/contracts/src/dto/ai.dto.ts`
- Modify: `packages/contracts/src/patterns.ts`, `packages/contracts/src/index.ts`

**Interfaces:**
- Produces: `AI_PATTERNS = { ANALYZE:"ai.analyze", LIST_MODELS:"ai.listModels" }`, `AI_CREDENTIAL_PATTERNS = { GET:"aiCredential.get", SAVE:"aiCredential.save" }`, `AI_ANALYSIS_PATTERNS = { GET:"aiAnalysis.get", RETRY:"aiAnalysis.retry" }`, 아래 DTO 전부.

- [ ] **Step 1: `ai.dto.ts` 작성**

```ts
import type { TenantContext } from "./tenant.dto";

export type AiModelTier = "economy" | "standard" | "precision";
export interface AiModelOption {
  id: string;
  label: string;
  tier: AiModelTier;
}

// ai-service 내부 RPC(무상태 — 자기 DB 없음).
export interface AiAnalyzeRequest {
  kind: string;
  model: string;
  apiKey: string;
  payload: unknown;
}
export interface AiAnalyzeResult {
  result: unknown;
}
export interface AiListModelsRequest {
  provider: string;
}
export interface AiListModelsResult {
  models: AiModelOption[];
}

// 내 AI 연동 설정(개인별).
export interface GetMyAiCredentialRequest {
  viewerId?: string;
  tenantContext?: TenantContext;
}
export interface MyAiCredentialDto {
  provider: string;
  model: string;
  hasApiKey: boolean;
  lastVerifiedAt: string | null;
}
export interface SaveMyAiCredentialRequest {
  provider: string;
  model: string;
  apiKey: string;
  viewerId?: string;
  tenantContext?: TenantContext;
}

// 대상(계약 등)의 AI 분석 결과 조회/재시도.
export type AiAnalysisStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";
export interface AiAnalysisDto {
  kind: string;
  status: AiAnalysisStatus;
  result: unknown;
  errorMessage: string | null;
  triggeredByUserId: string;
  updatedAt: string;
}
export interface GetAiAnalysisRequest {
  targetType: string;
  targetId: string;
  kind: string;
  tenantContext?: TenantContext;
}
export interface RetryAiAnalysisRequest {
  targetType: string;
  targetId: string;
  kind: string;
  viewerId?: string;
  tenantContext?: TenantContext;
}
```

- [ ] **Step 2: patterns.ts 추가**

```ts
export const AI_PATTERNS = {
  ANALYZE: "ai.analyze",
  LIST_MODELS: "ai.listModels",
} as const;

export const AI_CREDENTIAL_PATTERNS = {
  GET: "aiCredential.get",
  SAVE: "aiCredential.save",
} as const;

export const AI_ANALYSIS_PATTERNS = {
  GET: "aiAnalysis.get",
  RETRY: "aiAnalysis.retry",
} as const;
```

- [ ] **Step 3: index.ts 에 `export * from "./dto/ai.dto";` 추가**
- [ ] **Step 4: 빌드 확인** — `cd packages/contracts && pnpm build && npx tsc --noEmit`
- [ ] **Step 5: Commit** — `git commit -m "feat: AI 연동 계약 추가 (DTO/패턴)"`

### Task 4: user-service — `ai-credentials` 모듈 (개인별 CRUD + 검증)

**Files:**
- Create: `services/user-service/src/ai-credentials/ai-credentials.service.ts`
- Create: `services/user-service/src/ai-credentials/ai-credentials.service.spec.ts`
- Create: `services/user-service/src/ai-credentials/ai-credentials.controller.ts`
- Create: `services/user-service/src/ai-credentials/ai-credentials.module.ts`
- Modify: `services/user-service/src/app.module.ts`

**Interfaces:**
- Consumes: `AiClientService.listModels`(Task 6에서 제공, 검증 호출용) — 이 태스크에서는 인터페이스만 의존, 실제 배선은 Task 6 이후.
- Produces: `AiCredentialsService.get(viewerId, ctx): Promise<MyAiCredentialDto | null>`, `AiCredentialsService.save(req: SaveMyAiCredentialRequest): Promise<MyAiCredentialDto>`(저장 전 `ai.listModels` 또는 간단 검증 RPC로 키 유효성 확인 — Task 6에서 실제 연결, 이 태스크는 검증 단계를 인터페이스로 주입받아 mock 가능하게 설계)

- [ ] **Step 1: 실패하는 테스트 작성** (`ai-credentials.service.spec.ts`)

```ts
import { RpcException } from "@nestjs/microservices";
import { AiCredentialsService } from "./ai-credentials.service";

describe("AiCredentialsService", () => {
  let prisma: any;
  let crypto: any;
  let verifier: { verify: jest.Mock };
  let svc: AiCredentialsService;

  beforeEach(() => {
    prisma = {
      aiProviderCredential: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    crypto = {
      encrypt: jest.fn((v: string) => `enc(${v})`),
      decrypt: jest.fn((v: string) => v.replace(/^enc\(|\)$/g, "")),
    };
    verifier = { verify: jest.fn().mockResolvedValue(true) };
    svc = new AiCredentialsService(prisma, crypto, verifier);
  });

  it("get: 설정이 없으면 null", async () => {
    prisma.aiProviderCredential.findUnique.mockResolvedValue(null);
    const result = await svc.get("u1", { tenantId: "t1", isSystemAdmin: false });
    expect(result).toBeNull();
  });

  it("get: 있으면 apiKey 는 노출하지 않고 hasApiKey=true 만 반환", async () => {
    prisma.aiProviderCredential.findUnique.mockResolvedValue({
      provider: "openai", model: "gpt-mini", encryptedApiKey: "enc(sk-x)", lastVerifiedAt: new Date("2026-09-01"),
    });
    const result = await svc.get("u1", { tenantId: "t1", isSystemAdmin: false });
    expect(result).toEqual({ provider: "openai", model: "gpt-mini", hasApiKey: true, lastVerifiedAt: "2026-09-01T00:00:00.000Z" });
  });

  it("save: 검증 실패하면 400 이고 저장하지 않는다", async () => {
    verifier.verify.mockResolvedValue(false);
    await expect(
      svc.save({ provider: "openai", model: "gpt-mini", apiKey: "sk-bad", viewerId: "u1", tenantContext: { tenantId: "t1", isSystemAdmin: false } }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(prisma.aiProviderCredential.upsert).not.toHaveBeenCalled();
  });

  it("save: 검증 성공하면 암호화해서 저장", async () => {
    const result = await svc.save({ provider: "openai", model: "gpt-mini", apiKey: "sk-good", viewerId: "u1", tenantContext: { tenantId: "t1", isSystemAdmin: false } });
    expect(crypto.encrypt).toHaveBeenCalledWith("sk-good");
    expect(prisma.aiProviderCredential.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        create: expect.objectContaining({ userId: "u1", tenantId: "t1", provider: "openai", model: "gpt-mini", encryptedApiKey: "enc(sk-good)" }),
      }),
    );
    expect(result.hasApiKey).toBe(true);
  });

  it("save: viewerId 없으면 401", async () => {
    await expect(
      svc.save({ provider: "openai", model: "gpt-mini", apiKey: "sk-x", tenantContext: { tenantId: "t1", isSystemAdmin: false } }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
```

- [ ] **Step 2: 실패 확인** — `cd services/user-service && pnpm test -- ai-credentials`
- [ ] **Step 3: `AiCredentialVerifier` 인터페이스 + 구현** — `ai-credentials.service.ts`와 같은 파일 또는 인접 파일에 최소 인터페이스 정의(Task 6에서 실제 ai-service RPC로 구현체 교체):

```ts
export interface AiCredentialVerifier {
  verify(input: { provider: string; model: string; apiKey: string }): Promise<boolean>;
}
```

- [ ] **Step 4: `AiCredentialsService` 구현**

```ts
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
```

- [ ] **Step 5: 테스트 통과 확인** — `pnpm test -- ai-credentials`
- [ ] **Step 6: controller/module** — `ai-credentials.controller.ts`에 `@MessagePattern(AI_CREDENTIAL_PATTERNS.GET/SAVE)` 2개(contracts.controller 패턴과 동일 위임). `ai-credentials.module.ts`: providers에 `AiCredentialsService` + 두 포트의 **임시 더미 구현**(`AI_CRYPTO_PORT`는 `@lawai/crypto`의 `loadMasterKey`+`encryptString`/`decryptString`으로 실제 연결, `AI_CREDENTIAL_VERIFIER`는 Task 6에서 실제 ai-service 클라이언트로 교체 전까지 항상 `true` 반환하는 임시 구현):

```ts
// crypto port 실제 구현
const cryptoPort: CryptoPort = {
  encrypt: (plain) => encryptString(plain, loadMasterKey()),
  decrypt: (sealed) => decryptString(sealed, loadMasterKey()),
};
```

- [ ] **Step 7: app.module.ts 에 `AiCredentialsModule` 등록**
- [ ] **Step 8: 전체 테스트/타입체크** — `pnpm test && npx tsc --noEmit`
- [ ] **Step 9: Commit** — `git commit -m "feat: 개인별 AI 자격증명 저장/조회 (암호화 + 검증 포트)"`

### Task 5: `ai-service` 신설 — 스캐폴딩 + OpenAI 프로바이더

**Files:**
- Create: `services/ai-service/package.json`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `jest.config.js`, `.env`, `.env.example`, `Dockerfile`(auth-service 것 복사 후 포트만 교체)
- Create: `services/ai-service/src/main.ts`, `src/app.module.ts`
- Create: `services/ai-service/src/providers/provider.ts`(인터페이스+레지스트리)
- Create: `services/ai-service/src/providers/openai.provider.ts`
- Create: `services/ai-service/src/providers/openai.provider.spec.ts`
- Create: `services/ai-service/src/ai.controller.ts`
- Create: `services/ai-service/src/ai.module.ts`

**Interfaces:**
- Produces: RPC `ai.analyze(AiAnalyzeRequest): AiAnalyzeResult`, `ai.listModels(AiListModelsRequest): AiListModelsResult`. `AiProvider` 인터페이스 + `AiProviderRegistry.get(id): AiProvider`.

- [ ] **Step 1: 스캐폴딩** — `auth-service`의 `package.json`/`nest-cli.json`/`tsconfig*.json`/`jest.config.js`/`Dockerfile`을 복사해 이름/포트만 교체(`@lawai/ai-service`, `AI_SERVICE_PORT=4003`). `package.json` dependencies에서 `argon2`/`@nestjs/jwt` 제거(불필요), `@lawai/contracts` 유지.
- [ ] **Step 2: `main.ts`/`app.module.ts`** — auth-service 것을 그대로 본떠 포트만 `AI_SERVICE_PORT` 사용, `AppModule`은 `AiModule`만 import.
- [ ] **Step 3: provider 인터페이스 + 레지스트리** (`providers/provider.ts`)

```ts
export interface AiModelOption {
  id: string;
  label: string;
  tier: "economy" | "standard" | "precision";
}
export interface AiAnalyzeInput {
  kind: string;
  model: string;
  payload: unknown;
  apiKey: string;
}
export interface AiProvider {
  id: string;
  listModels(): Promise<AiModelOption[]>;
  analyze(input: AiAnalyzeInput): Promise<{ result: unknown }>;
}

export class AiProviderRegistry {
  private readonly providers = new Map<string, AiProvider>();
  register(provider: AiProvider): void {
    this.providers.set(provider.id, provider);
  }
  get(id: string): AiProvider {
    const p = this.providers.get(id);
    if (!p) throw new Error(`알 수 없는 AI 프로바이더: ${id}`);
    return p;
  }
}
```

- [ ] **Step 4: 실패하는 OpenAI provider 테스트 작성** (`openai.provider.spec.ts`) — `global.fetch` mock:

```ts
import { OpenAiProvider } from "./openai.provider";

describe("OpenAiProvider", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("listModels: 고정 목록을 등급과 함께 반환한다", async () => {
    const provider = new OpenAiProvider();
    const models = await provider.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.tier === "standard")).toBe(true);
  });

  it("analyze: 200 응답의 JSON 컨텐츠를 파싱해 result 로 반환", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"risks":[{"level":"high","clause":"제12조"}]}' } }],
      }),
    }) as unknown as typeof fetch;
    const provider = new OpenAiProvider();
    const { result } = await provider.analyze({
      kind: "risk", model: "gpt-mini", apiKey: "sk-test", payload: { text: "계약서 본문" },
    });
    expect(result).toEqual({ risks: [{ level: "high", clause: "제12조" }] });
  });

  it("analyze: 401 응답이면 인증 실패 에러를 던진다", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "invalid api key" }) as unknown as typeof fetch;
    const provider = new OpenAiProvider();
    await expect(
      provider.analyze({ kind: "risk", model: "gpt-mini", apiKey: "sk-bad", payload: {} }),
    ).rejects.toThrow(/401|인증/);
  });

  it("analyze: 429(레이트리밋)면 명확한 에러 메시지를 던진다", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" }) as unknown as typeof fetch;
    const provider = new OpenAiProvider();
    await expect(
      provider.analyze({ kind: "risk", model: "gpt-mini", apiKey: "sk-x", payload: {} }),
    ).rejects.toThrow(/429|rate/i);
  });
});
```

- [ ] **Step 5: 실패 확인** — `cd services/ai-service && pnpm test -- openai.provider`
- [ ] **Step 6: `OpenAiProvider` 구현** — kind별 system prompt 매핑 + JSON 스키마 강제(`response_format: { type: "json_object" }`), `fetch("https://api.openai.com/v1/chat/completions", { method:"POST", headers:{ Authorization:\`Bearer ${apiKey}\`, "Content-Type":"application/json" }, body: JSON.stringify({ model, messages:[{role:"system",content:KIND_PROMPT[kind]},{role:"user",content:JSON.stringify(payload)}], response_format:{type:"json_object"} }) })`. 응답 파싱 실패/비-2xx 시 상태코드를 포함한 에러 throw. `listModels()`는 고정 배열 반환(경량/표준/고정밀 각 최소 1개, 기본 표준 모델을 명확히 표시).
- [ ] **Step 7: 테스트 통과 확인**
- [ ] **Step 8: `ai.controller.ts`/`ai.module.ts`** — `@MessagePattern(AI_PATTERNS.ANALYZE/LIST_MODELS)` 2개, `AiProviderRegistry`에 `OpenAiProvider` 등록(`onModuleInit`으로).
- [ ] **Step 9: 부팅 확인** — `pnpm build && node dist/main.js`로 기동 로그에 에러 없는지 확인 후 종료.
- [ ] **Step 10: Commit** — `git commit -m "feat: ai-service 신설 (무상태, OpenAI 프로바이더)"`

### Task 6: user-service — ai-service 클라이언트 배선 + 검증 포트 실제 연결

**Files:**
- Modify: `services/user-service/src/app.module.ts`(또는 별도 `AiClientModule`)
- Create: `services/user-service/src/ai-credentials/ai-service.client.ts`(`AI_CREDENTIAL_VERIFIER` 실제 구현)
- Modify: `services/user-service/src/ai-credentials/ai-credentials.module.ts`

**Interfaces:**
- Consumes: `AI_PATTERNS.ANALYZE/LIST_MODELS` (TCP RPC to ai-service)
- Produces: `AiServiceClient.verify(...)`, `AiServiceClient.analyze(...)`, `AiServiceClient.listModels(...)` — user-service 안에서 ai-service RPC를 감싸는 얇은 클라이언트.

- [ ] **Step 1: TCP 클라이언트 등록** — `ClientsModule.register([{ name:"AI_CLIENT", transport:Transport.TCP, options:{ host: process.env.AI_SERVICE_HOST ?? "localhost", port: Number(process.env.AI_SERVICE_PORT ?? 4003) } }])`를 `@Global()` 모듈로(clients.module.ts 패턴과 동일하게 user-service 안에 신설).
- [ ] **Step 2: `AiServiceClient` 작성** — `@Inject("AI_CLIENT") private readonly client: ClientProxy`로 `analyze`/`listModels`를 `firstValueFrom(this.client.send(...))`로 감싸고, `verify(input)`는 `analyze`를 아주 짧은 검증용 payload(`kind:"__verify__"`)로 호출해 성공 여부만 boolean으로 반환(또는 `listModels` 호출 자체를 "키가 유효한 계정으로 인증되는지" 확인 용도로 재사용 — OpenAI models 목록 API는 이 서비스가 아니라 실제 계정 문의라 `listModels`는 고정 배열이므로 검증에 못 씀. **검증은 실제로 매우 짧은 analyze 호출**로 한다).
- [ ] **Step 3: ai-credentials.module.ts 갱신** — `AI_CREDENTIAL_VERIFIER` 토큰을 Task 4의 임시 더미 대신 `AiServiceClient`로 교체.
- [ ] **Step 4: 기존 테스트 확인** — Task 4의 스펙은 verifier를 직접 mock 주입했으므로 영향 없음. `pnpm test` 전체 통과 확인.
- [ ] **Step 5: Commit** — `git commit -m "feat: user-service→ai-service RPC 클라이언트 배선 (자격증명 검증 실연결)"`

### Task 7: user-service — `ai-analysis` 모듈 (잡 upsert/조회/재시도) + contracts 트리거 배선

**Files:**
- Create: `services/user-service/src/ai-analysis/ai-analysis.service.ts`
- Create: `services/user-service/src/ai-analysis/ai-analysis.service.spec.ts`
- Create: `services/user-service/src/ai-analysis/ai-analysis.controller.ts`
- Create: `services/user-service/src/ai-analysis/ai-analysis.module.ts`
- Create: `services/user-service/src/ai-analysis/prompt-payloads.ts`(kind별 입력 페이로드 빌더)
- Modify: `services/user-service/src/contracts/contracts.service.ts`(트리거 4곳)
- Modify: `services/user-service/src/contracts/contracts.module.ts`

**Interfaces:**
- Consumes: `AiServiceClient.analyze`, `AiCredentialsService`(내부적으로 특정 userId의 암복호화된 키 조회용 — Task 4 서비스에 `getDecryptedKey(userId)` 내부 메서드 추가 필요)
- Produces: `AiAnalysisService.trigger(input: { targetType, targetId, kind, tenantId, triggeredByUserId, payload }): Promise<void>`(fire-and-forget), `AiAnalysisService.get(targetType, targetId, kind): Promise<AiAnalysisDto | null>`, `AiAnalysisService.retry(...)`.

- [ ] **Step 1: `AiCredentialsService`에 내부 조회 메서드 추가** — `getDecryptedKeyFor(userId): Promise<{ provider, model, apiKey } | null>`(없으면 null, 있으면 복호화해서 반환). Task 4 스펙에 이 케이스 테스트 2개 추가(있음/없음).
- [ ] **Step 2: 실패하는 `AiAnalysisService` 테스트 작성**

```ts
describe("AiAnalysisService", () => {
  let prisma: any; let credentials: any; let aiClient: any; let svc: AiAnalysisService;
  beforeEach(() => {
    prisma = { aiAnalysis: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() } };
    credentials = { getDecryptedKeyFor: jest.fn() };
    aiClient = { analyze: jest.fn() };
    svc = new AiAnalysisService(prisma, credentials, aiClient);
  });

  it("trigger: 자격증명 없으면 skipped 로 upsert 하고 analyze 호출 안 함", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue(null);
    await svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: {} });
    expect(prisma.aiAnalysis.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ status: "skipped" }),
    }));
    expect(aiClient.analyze).not.toHaveBeenCalled();
  });

  it("trigger: 자격증명 있으면 pending→(analyze 성공)succeeded 로 갱신", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-mini", apiKey: "sk-x" });
    prisma.aiAnalysis.upsert.mockResolvedValue({ id: "a1" });
    aiClient.analyze.mockResolvedValue({ result: { risks: [] } });
    await svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: { text: "x" } });
    expect(prisma.aiAnalysis.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "a1" }, data: expect.objectContaining({ status: "succeeded", result: { risks: [] } }),
    }));
  });

  it("trigger: analyze 실패하면 failed + errorMessage + attempts 증가", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-mini", apiKey: "sk-x" });
    prisma.aiAnalysis.upsert.mockResolvedValue({ id: "a1", attempts: 0 });
    aiClient.analyze.mockRejectedValue(new Error("401 invalid key"));
    await svc.trigger({ targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", triggeredByUserId: "u1", payload: {} });
    expect(prisma.aiAnalysis.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "failed", errorMessage: expect.stringContaining("401") }),
    }));
  });

  it("get: 없으면 null, 있으면 DTO 매핑", async () => {
    prisma.aiAnalysis.findUnique.mockResolvedValue(null);
    expect(await svc.get("contract", "c1", "risk")).toBeNull();
  });

  it("retry: 기존 행을 pending 으로 되돌리고 다시 trigger 한다", async () => {
    prisma.aiAnalysis.findUnique.mockResolvedValue({ id: "a1", targetType: "contract", targetId: "c1", kind: "risk", tenantId: "t1", input: { text: "x" }, triggeredByUserId: "u1" });
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-mini", apiKey: "sk-x" });
    aiClient.analyze.mockResolvedValue({ result: {} });
    await svc.retry("contract", "c1", "risk");
    expect(aiClient.analyze).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 실패 확인** — `pnpm test -- ai-analysis`
- [ ] **Step 4: `AiAnalysisService` 구현**

```ts
@Injectable()
export class AiAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: AiCredentialsService,
    private readonly aiClient: AiServiceClient,
  ) {}

  async trigger(input: {
    targetType: string; targetId: string; kind: string;
    tenantId: string; triggeredByUserId: string; payload: unknown;
  }): Promise<void> {
    // 공통 식별 필드(payload 는 Prisma 필드명이 아니라 input 이므로 스프레드하지 않고 명시적으로 구성).
    const base = {
      targetType: input.targetType,
      targetId: input.targetId,
      kind: input.kind,
      tenantId: input.tenantId,
      triggeredByUserId: input.triggeredByUserId,
      input: input.payload as Prisma.InputJsonValue,
    };
    const cred = await this.credentials.getDecryptedKeyFor(input.triggeredByUserId);
    if (!cred) {
      await this.prisma.aiAnalysis.upsert({
        where: { targetType_targetId_kind: { targetType: input.targetType, targetId: input.targetId, kind: input.kind } },
        create: { ...base, model: null, status: "skipped", attempts: 0 },
        update: { status: "skipped", triggeredByUserId: base.triggeredByUserId, input: base.input },
      });
      return;
    }
    const row = await this.prisma.aiAnalysis.upsert({
      where: { targetType_targetId_kind: { targetType: input.targetType, targetId: input.targetId, kind: input.kind } },
      create: { ...base, model: cred.model, status: "pending", attempts: 0 },
      update: { status: "pending", model: cred.model, triggeredByUserId: base.triggeredByUserId, input: base.input, attempts: { increment: 1 } },
    });
    try {
      const { result } = await this.aiClient.analyze({ kind: input.kind, model: cred.model, apiKey: cred.apiKey, payload: input.payload });
      await this.prisma.aiAnalysis.update({ where: { id: row.id }, data: { status: "succeeded", result: result as Prisma.InputJsonValue, errorMessage: null } });
    } catch (err) {
      await this.prisma.aiAnalysis.update({ where: { id: row.id }, data: { status: "failed", errorMessage: String(err) } });
    }
  }

  async get(targetType: string, targetId: string, kind: string) { /* findUnique + toDto, null-safe */ }
  async retry(targetType: string, targetId: string, kind: string) { /* findUnique → trigger(같은 input) */ }
}
```

(`trigger`는 컨트롤러/contracts.service 에서 **await 하지 않고 호출** — fire-and-forget은 호출부 책임.)

- [ ] **Step 5: 테스트 통과 확인**
- [ ] **Step 6: `prompt-payloads.ts`** — kind별 payload 빌더 4개(순수 함수, 계약 row → payload 객체):

```ts
export const buildPrecheckPayload = (contract: ContractLike) => ({ title: contract.title, details: contract.details });
export const buildRiskPayload = (contract: ContractLike, fileText: string | null) => ({ title: contract.title, details: contract.details, fileText });
export const buildSubmitBriefingPayload = (contract: ContractLike) => ({ title: contract.title, details: contract.details, approvers: contract.plannedApprovers });
export const buildApprovalBriefingPayload = (contract: ContractLike, approvalLine: unknown) => ({ title: contract.title, details: contract.details, approvalLine });
```

(1차는 파일 원문 텍스트 추출 없이 계약 메타데이터만 넘긴다 — 파일 OCR/텍스트 추출은 범위 밖, `fileText: null` 고정. 후속 과제로 문서 상단에 주석 남김.)

- [ ] **Step 7: controller/module** — `ai-analysis.controller.ts`에 `@MessagePattern(AI_ANALYSIS_PATTERNS.GET/RETRY)`. module에서 `AiClientModule`/`AiCredentialsModule` import.
- [ ] **Step 8: contracts.service.ts 트리거 배선** — 아래 4곳에 `this.aiAnalysis.trigger(...)`를 **await 없이(`void this.aiAnalysis.trigger(...)`)** 호출 추가:
  - `create()`: 저장된 계약에 `role=contract` 파일이 있으면 `kind:"precheck"`, `triggeredByUserId: req.createdById`.
  - `updateStatus()`: 전이 후 `req.status === "legalReview"`면 `kind:"risk"`, `triggeredByUserId: updated.ownerId`(없으면 트리거 자체를 건너뜀 — `AiAnalysisService.trigger`가 자격증명 없음과 동일하게 처리하도록 호출부에서 `ownerId` null 체크 후 스킵). `req.status === "reviewDone"`면 `kind:"submitBriefing"`, `triggeredByUserId: updated.createdById`.
  - `submitApproval()`: 성공 후 `kind:"approvalBriefing"`, `triggeredByUserId: req.viewerId`.
  - `contracts.module.ts`에 `AiAnalysisModule` import 추가.
- [ ] **Step 9: 트리거 배선에 대한 contracts.service.spec.ts 테스트 추가** — `aiAnalysisMock = { trigger: jest.fn() }`를 생성자에 주입(기존 스펙의 provider mock 목록에 추가), 4개 케이스: create 시 계약서 파일 있으면 trigger 호출됨/없으면 호출 안 됨, legalReview 진입 시 trigger("risk") 호출, reviewDone 진입 시 trigger("submitBriefing") 호출, submitApproval 성공 시 trigger("approvalBriefing") 호출.
- [ ] **Step 10: 전체 테스트 + 타입체크** — `pnpm test && npx tsc --noEmit`
- [ ] **Step 11: Commit** — `git commit -m "feat: AI 분석 잡 큐 + 계약 상태 전이 4곳 트리거 배선"`

### Task 8: api-gateway — AI 엔드포인트

**Files:**
- Create: `services/api-gateway/src/ai/ai.controller.ts`
- Create: `services/api-gateway/src/ai/ai.module.ts`
- Create: `services/api-gateway/src/ai/dto.ts`
- Modify: `services/api-gateway/src/app.module.ts`

**Interfaces:**
- Produces: `GET /ai/my-credential`, `PUT /ai/my-credential`, `GET /ai/my-credential/models`(=`ai.listModels` 프록시), `GET /ai/analysis?targetType=&targetId=&kind=`, `POST /ai/analysis/retry`

- [ ] **Step 1: dto.ts** — `SaveMyAiCredentialDto { @IsString() provider; @IsString() model; @IsString() @MinLength(10) apiKey; }`
- [ ] **Step 2: controller** — notifications/contracts 컨트롤러와 동일 패턴(`@Inject("USER_CLIENT")`, `rpcToHttp()`, `extractTenantContext`). `GET /ai/analysis`는 query param 3개를 `GetAiAnalysisRequest`로 매핑.
- [ ] **Step 3: module/app.module 등록**
- [ ] **Step 4: 빌드 확인** — `npx tsc --noEmit`
- [ ] **Step 5: Commit** — `git commit -m "feat: gateway AI 엔드포인트 (내 자격증명/분석 조회·재시도)"`

### Task 9: web — AI API 모듈 + 설정 화면 (`/system`)

**Files:**
- Create: `apps/web/src/api/ai.ts`
- Create: `apps/web/src/pages/system/SystemSettingsPage.tsx`
- Create: `apps/web/src/pages/system/hooks/useMyAiCredential.ts`
- Create: `apps/web/src/pages/system/systemSettings.css.ts`
- Modify: `apps/web/src/routes.tsx`

**Interfaces:**
- Consumes: `GET/PUT /ai/my-credential`, `GET /ai/my-credential/models`
- Produces: 라우트 `/system`(사이드바 기존 링크 실제 연결)

- [ ] **Step 1: api 모듈** — `getMyAiCredential()`, `saveMyAiCredential(body)`, `getAiModels()`.
- [ ] **Step 2: `useMyAiCredential` 훅** — react-query `useQuery` + `useMutation`(저장 성공 시 invalidate).
- [ ] **Step 3: 화면 구현** — 프로바이더 드롭다운(고정 "OpenAI"), 모델 드롭다운(등급 라벨: 절약/표준/고정밀, 기본 표준), API Key `Input`(lawkit, `type="password"` 성격 — 마스킹) + 저장 버튼(검증 실패 시 에러 alert). 연결 상태 배지(`hasApiKey`/`lastVerifiedAt` 기반: 미설정/정상).
- [ ] **Step 4: 라우트 연결** — `routes.tsx`에 `<Route path="/system" element={<SystemSettingsPage />} />` 추가(기존 사이드바 링크가 실제로 동작하게 됨).
- [ ] **Step 5: 테스트** — `SystemSettingsPage.test.tsx`: 미설정 상태 렌더, 저장 성공/실패 렌더 분기.
- [ ] **Step 6: 테스트 실행 + 타입체크** — `pnpm test -- src/pages/system && npx tsc --noEmit`
- [ ] **Step 7: Commit** — `git commit -m "feat: 내 AI 연동 설정 화면 (/system)"`

### Task 10: web — 계약 상세 AI 분석 카드 통합 (mock 제거)

**Files:**
- Create: `apps/web/src/pages/contract/hooks/useAiAnalysis.ts`
- Modify: `apps/web/src/pages/contract/ContractDetailPage.tsx`(기존 "AI 계약 리스크" mock 섹션 교체)
- Modify: `apps/web/src/pages/contract/mock-data.ts`(`RISKS` export 제거 또는 유지 여부는 교체 후 미사용 시 제거)
- Delete: `apps/web/src/pages/contract/aiPrecheck.ts`, `apps/web/src/pages/contract/aiPrecheck.test.ts`, `apps/web/src/pages/contract/rail/AiPrecheckPanel.tsx`, `apps/web/src/pages/contract/rail/AiPrecheckPanel.test.tsx`(요청 폼의 동기 mock 패널 — §6 UX 변화에 따라 폼에서는 제거, 대신 안내 문구만 남김)
- Modify: `apps/web/src/pages/contract/ContractRequestPage.tsx`(AiPrecheckPanel 자리에 "저장 후 분석됩니다" 안내로 교체)

**Interfaces:**
- Consumes: `GET /ai/analysis?targetType=contract&targetId=&kind=`
- Produces: `useAiAnalysis(targetId, kind)` — `{ data, isPolling }`(status가 pending/running이면 2초 polling)

- [ ] **Step 1: `useAiAnalysis` 훅**

```ts
export const useAiAnalysis = (targetId: string, kind: string) => {
  const query = useQuery({
    queryKey: ["aiAnalysis", "contract", targetId, kind],
    queryFn: () => getAiAnalysis("contract", targetId, kind),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "pending" || status === "running" ? 2000 : false;
    },
  });
  return { analysis: query.data ?? null, isLoading: query.isLoading };
};
```

- [ ] **Step 2: 상세 페이지의 kind 결정 로직** — 순수 함수 `getActiveAiKind(status: ContractStatus): string | null`(draft/unassigned→"precheck", legalReview→"risk", reviewDone→"submitBriefing", signing→"approvalBriefing", 그 외 null) + 테스트.
- [ ] **Step 3: "AI 계약 리스크" 카드를 kind별 렌더로 교체** — `status`/`skipped`/`failed`/`succeeded` 4분기 렌더(로딩 스켈레톤, "OOO님의 AI 설정이 필요합니다 · 설정하러 가기"(`/system` 링크), "분석 실패 · 다시 시도"(재시도 버튼 → retry API), 결과 렌더는 kind별로 `result` JSON 구조를 가정한 최소 표시(리스트 형태로 range).
- [ ] **Step 4: 요청 폼의 AiPrecheckPanel 제거 + 안내 문구로 교체** — "저장 후 AI가 자동으로 사전 점검합니다" 정적 텍스트로 대체.
- [ ] **Step 5: 컴포넌트 테스트 갱신** — `ContractDetailPage.test.tsx`에 각 상태별 kind 렌더 케이스 추가(mock `getAiAnalysis`).
- [ ] **Step 6: 전체 프론트 테스트 + 타입체크** — `pnpm test && npx tsc --noEmit`
- [ ] **Step 7: Commit** — `git commit -m "feat: 계약 상세 AI 분석 실동작 통합 (mock 제거)"`

### Task 11: 수동 검증 + 마무리

- [ ] **Step 1: 로컬 기동** — Postgres + auth-service + user-service + ai-service + api-gateway + apps/web. 실제(또는 테스트용) OpenAI API 키로: 계약 생성(파일 첨부) → precheck 결과 확인 → legalReview 배정 → risk 결과 확인 → reviewDone → submitBriefing 확인 → 결재 상신 → approvalBriefing 확인. 자격증명 미설정 사용자로 트리거되는 경우 `skipped` 렌더 확인.
- [ ] **Step 2: erdify ERD 동기화 확인** (Task 2 에서 보류됐다면 재시도)
- [ ] **Step 3: 남은 체크박스 반영 후 Commit** — `git commit -m "docs: AI 연동 플랜 체크박스 갱신"`
