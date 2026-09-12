# AI 분석 실동작화 + Codex(OpenAI) 연동 — 설계 문서

날짜: 2026-09-12
상태: 승인됨

## 1. 배경

계약 화면 곳곳의 "AI 사전 점검"(`aiPrecheck.ts`, 검토 요청 폼)과 "AI 계약 리스크"(`RISKS` mock, 계약 상세)는 전부 하드코딩된 mock이다. 이번 작업은 이걸 실제 LLM 호출로 대체하고, 결재 모듈(2026-09-12-approval-module) 설계 당시 "1차는 규칙 기반만"으로 미뤄뒀던 AI 상신 사전점검·AI 결재 브리핑까지 포함해 총 4개 지점을 실동작시킨다. 1차 프로바이더는 OpenAI(Codex 계열 모델)이며, 이후 다른 프로바이더를 추가할 수 있는 구조로 처음부터 만든다.

## 2. 확정 요구사항

| 항목 | 결정 |
|---|---|
| 인증 방식 | 테넌트별로 **API Key** 또는 **ChatGPT OAuth 로그인**(Codex CLI 방식) 중 선택. 후자는 개인 ChatGPT 구독 한도를 쓰는 비공식 연동 — 리스크 인지하고 진행 |
| 과금/자격증명 주체 | 테넌트(고객사)별 자체 등록 — Lawai가 대납하지 않음 |
| 실행 트리거 | 계약 상태 진입 시 자동(백그라운드). 사용자가 버튼을 누르는 방식 아님 |
| 실행 신뢰성 | 새 인프라(Redis 등) 없이 **DB 테이블이 잡 큐 겸 결과 저장소** 역할 |
| 백엔드 위치 | 새 `ai-service` 마이크로서비스 — 단, **자체 DB는 갖지 않음**(auth-service 선례와 동일하게 무상태, DB는 user-service가 소유) |
| 프로바이더 확장성 | 인터페이스로 추상화, 지금은 OpenAI만 구현 |
| 모델 선택 | 설정 화면에서 프로바이더가 제공하는 모델 목록 중 선택 |
| 암호화 | 새 `packages/crypto`(AES-256-GCM) — `AiProviderCredential`의 토큰류에만 적용. 기존 도메인 필드(Company/Contract.details 등) 암호화는 별도 후속 스펙 |
| 설정 화면 접근 | `inHouseCounsel` / `contractManager` 만 |
| 프론트 갱신 방식 | SSE 신설 없이 단순 폴링(`status`가 pending/running인 동안만) |

## 3. 서비스 구조

- **DB 소유**: user-service가 계속 전체 DB를 소유한다. 새 Postgres 스키마 `ai`에 `AiProviderCredential`, `AiAnalysis` 두 테이블을 추가(마이그레이션은 user-service `schema.prisma`에서 관리).
- **ai-service**: 무상태 마이크로서비스. TCP RPC로 두 가지만 받는다.
  - `ai.analyze` — user-service가 "이 대상을 이 kind로 분석해줘 + 복호화된 자격증명 + 입력 페이로드"를 통째로 넘기면, ai-service는 OpenAI를 호출해 결과를 **반환만** 한다(자기 DB에 아무것도 안 씀). user-service가 응답을 받아 `AiAnalysis` 행에 저장한다.
  - `ai.listModels` — 설정 화면 드롭다운용, 프로바이더가 제공하는 모델 목록을 반환.
- **트리거 배선**: `contracts.service`의 `create()`/`updateStatus()`/`submitApproval()` 성공 직후, 해당 kind에 맞는 `AiAnalysis` 행을 `pending`으로 생성(upsert, 같은 `(targetType,targetId,kind)`면 덮어씀) → `ai.analyze` RPC를 **await 하지 않고** 호출(fire-and-forget) → 응답이 오면 콜백에서 상태를 `succeeded`/`failed`로 갱신. RPC 실패/타임아웃 시 `failed` + `errorMessage` 기록, `attempts` 증가.
- **결과 전파**: 별도 알림/SSE 배선 없음. 프론트가 `AiAnalysis` 조회 API를 폴링.
- **경계 원칙**: ai-service와 `AiAnalysis`는 결재 모듈과 동일하게 대상 도메인을 모른다 — `(targetType, targetId, kind)` 폴리모픽. 프롬프트 구성(어떤 kind가 어떤 입력 스키마·지시문을 쓰는지)은 user-service 쪽 kind별 어댑터가 담당하고, ai-service는 "모델에 이 메시지를 보내고 이 JSON 스키마로 받아라"만 안다.

## 4. 데이터 모델 (user-service, 신규 `ai` 스키마)

```prisma
model AiProviderCredential {
  id            String   @id @default(uuid())
  tenantId      String   @unique
  provider      String   // "openai"
  authMode      String   // "apiKey" | "chatgptOAuth"
  model         String   // 선택된 모델 id
  encryptedApiKey       String?  // authMode=apiKey
  encryptedAccessToken  String?  // authMode=chatgptOAuth
  encryptedRefreshToken String?
  tokenExpiresAt        DateTime?
  connectedByUserId     String?  // OAuth 로그인을 수행한 사용자(감사 로그 + "누구 구독인지" 표시)
  updatedAt     DateTime @updatedAt
  createdAt     DateTime @default(now())

  @@schema("ai")
}

model AiAnalysis {
  id           String   @id @default(uuid())
  tenantId     String
  targetType   String   // "contract"
  targetId     String
  kind         String   // "precheck" | "risk" | "submitBriefing" | "approvalBriefing"
  status       String   // "pending" | "running" | "succeeded" | "failed"
  model        String
  input        Json     // 분석에 넘긴 입력 스냅샷(재현/디버깅용)
  result       Json?
  errorMessage String?
  attempts     Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([targetType, targetId, kind])
  @@index([tenantId, status])
  @@schema("ai")
}
```

`AiProviderCredential.encryptedApiKey`/`encryptedAccessToken`/`encryptedRefreshToken`은 `packages/crypto`의 `encryptString`/`decryptString`으로 저장 전/조회 후 명시적으로 암복호화한다(서비스 코드에서 직접 호출 — Prisma 미들웨어 마법 없이, 기존 코드베이스의 `as unknown as X` 캐스팅 관행과 같은 결의 명시적 호출).

## 5. 프로바이더 추상화

```ts
// services/ai-service/src/providers/provider.ts
export interface AiProvider {
  id: string; // "openai"
  listModels(): Promise<{ id: string; label: string }[]>;
  analyze(input: {
    kind: string;
    model: string;
    payload: unknown;
    credential: ResolvedCredential;
  }): Promise<{ result: unknown }>;
}

export type ResolvedCredential =
  | { authMode: "apiKey"; apiKey: string }
  | { authMode: "chatgptOAuth"; accessToken: string };
```

`OpenAiApiKeyProvider`: OpenAI Chat/Responses API에 `Authorization: Bearer {apiKey}`로 직접 호출. kind별 system prompt + JSON 스키마 강제(structured output)로 구조화된 결과를 받는다.

`OpenAiChatGptOAuthProvider`: Codex CLI와 동일한 PKCE 인가 코드 → 토큰 교환 → 발급받은 액세스 토�큰으로 ChatGPT 백엔드 API 호출. **정확한 `client_id`/인가 URL/토큰 엔드포인트는 이 스펙에 확정 기재하지 않는다** — 구현 단계에서 [openai/codex](https://github.com/openai/codex) 오픈소스 저장소의 인증 코드를 직접 확인해 채운다(추측값 사용 금지). 액세스 토큰 만료 시 refresh_token으로 자동 갱신, 갱신 실패 시 `AiProviderCredential`에 "재로그인 필요" 상태를 표시할 수 있게 `tokenExpiresAt` 지난 뒤 갱신도 실패하면 에러를 그대로 올려 설정 화면이 배지로 노출한다.

프로바이더 레지스트리(`AiProviderRegistry`)가 `id → AiProvider` 맵을 들고 있고, 이후 다른 프로바이더(예: Anthropic) 추가 시 새 클래스 등록만 하면 된다.

## 6. 트리거 지점 (4곳)

| kind | 트리거 시점 | 대체하는 mock |
|---|---|---|
| `precheck` | 계약 생성 시 계약서 파일(`role=contract`)이 있으면 | `aiPrecheck.ts`(요청 폼) — **UX 변화**: 폼 작성 중 즉시 결과를 보여주던 것에서, 저장 후 비동기로 채워지는 방식으로 바뀐다(사용자 확인 완료) |
| `risk` | `legalReview` 진입 또는 계약서 파일 교체 시 | `RISKS` mock(상세 페이지) |
| `submitBriefing` | `reviewDone` 진입 시 | 결재 모듈의 규칙 기반 사전점검(`getSubmitPrecheck.ts`)을 대체하지 않고 **병행** — 규칙 기반 체크리스트(필수 항목)는 그대로 두고, AI 요약은 추가 정보로 옆에 노출 |
| `approvalBriefing` | `signing` 진입 시(상신 완료 직후) | 결재 시안의 "AI 결재 브리핑"(미구현이었음) |

전부 `contracts.service`의 `create()`/`updateStatus()`/`submitApproval()` 성공 직후 훅으로 배선한다.

## 7. 프론트 연동

- 계약 상세의 "AI 계약 리스크" 카드 자리 하나가 계약의 현재 상태에 맞는 kind 결과를 표시(승인 모듈 시안에서 이미 이 방식으로 디자인함).
- `useQuery(["aiAnalysis", targetType, targetId, kind])` — `status`가 `pending`/`running`이면 2초 간격 `refetchInterval`, 끝나면 정지.
- 실패 시 카드에 "분석 실패 · 다시 시도" 노출 → 클릭 시 재분석 RPC(같은 `(targetType,targetId,kind)` 행을 `pending`으로 재설정 + `attempts` 증가).

## 8. 설정 화면 (`apps/web` `/system`)

- 접근: `inHouseCounsel`/`contractManager`만(백엔드 RPC 가드 + 프론트 숨김).
- **AI 연동** 카드: 프로바이더 드롭다운(현재 OpenAI 단일, `ai.listModels` 응답으로 확장 가능한 구조) → 모델 드롭다운.
- 인증 방식 탭:
  - **API Key**: 입력 후 저장 시 서버가 실제 호출 1회로 검증하고 성공해야 저장(틀린 키가 조용히 저장돼 나중에 실패하는 상황 방지).
  - **ChatGPT 로그인**: 상단 경고 배너("개인 계정 ChatGPT 구독 한도 사용 · 비공식 연동 · 예고 없이 중단될 수 있음") + "ChatGPT로 로그인" 버튼(팝업 OAuth) → 완료 시 "OO님 계정으로 연결됨" 표시 + 재로그인 버튼.
- 연결 상태 배지(정상/토큰 만료/미설정) + 최근 분석 성공/실패 이력 간단 노출.

## 9. 암호화 (`packages/crypto`, 최소 범위)

```ts
export function loadMasterKey(envVar = "AI_CREDENTIAL_MASTER_KEY"): Buffer; // 32바이트 검증
export function encryptString(plain: string, masterKey: Buffer): string; // AES-256-GCM, base64(iv|tag|ciphertext)
export function decryptString(sealed: string, masterKey: Buffer): string;
```

`AiProviderCredential`의 토큰 필드에만 적용. Company/Contract.details 등 기존 도메인 PII 암호화(블라인드 인덱스 필요한 email/bizNo 포함)는 이번 스펙 범위 밖 — 이 패키지를 재사용할 별도 후속 스펙에서 다룬다.

## 10. 테스트

- **ai-service**: provider 단위 테스트(mock HTTP) — API Key/OAuth 각각 성공·토큰만료·실패 케이스. `ai.analyze`/`ai.listModels` RPC 핸들러 테스트.
- **user-service**: 트리거 4곳 각각 — 상태 전이 성공 시 `AiAnalysis` upsert 확인, RPC 실패 시 `failed` 반영. `AiProviderCredential` CRUD — 암호화 저장/복호화 조회, API Key 저장 시 검증 실패하면 저장 안 됨.
- **packages/crypto**: encrypt/decrypt 라운드트립, 잘못된 마스터키로 복호화 시 실패.
- **apps/web**: 설정 화면 렌더(권한 없는 role은 접근 불가), AI 분석 카드의 pending/succeeded/failed 렌더 분기, 폴링 훅 단위 테스트.

## 11. 구현 순서

A. `packages/crypto` → B. user-service `ai` 스키마 + `AiProviderCredential`/`AiAnalysis` + CRUD RPC → C. `ai-service` 신설(provider 인터페이스 + OpenAI API Key 구현 + registry) → D. OpenAI ChatGPT OAuth 구현(client_id 등 확인 후) → E. contracts.service 트리거 배선 4곳 → F. gateway 엔드포인트(설정 CRUD, OAuth 콜백, 분석 조회) → G. 프론트 설정 화면 → H. 프론트 AI 분석 카드 통합(폴링).
