# AI 분석 실동작화 + OpenAI 연동 — 설계 문서

날짜: 2026-09-12
상태: 승인됨 (v2 — 개인별 자격증명 + API Key 단일 인증으로 조정)

## 1. 배경

계약 화면 곳곳의 "AI 사전 점검"(`aiPrecheck.ts`, 검토 요청 폼)과 "AI 계약 리스크"(`RISKS` mock, 계약 상세)는 전부 하드코딩된 mock이다. 이번 작업은 이걸 실제 LLM 호출로 대체하고, 결재 모듈(2026-09-12-approval-module) 설계 당시 "1차는 규칙 기반만"으로 미뤄뒀던 AI 상신 사전점검·AI 결재 브리핑까지 포함해 총 4개 지점을 실동작시킨다. 1차 프로바이더는 OpenAI이며, 이후 다른 프로바이더를 추가할 수 있는 구조로 처음부터 만든다.

## 2. 확정 요구사항

| 항목 | 결정 |
|---|---|
| 인증 방식 | **API Key만**. ChatGPT OAuth(Codex CLI 방식)는 조사 결과 제외 — §3 참고 |
| 자격증명 주체 | **개인(사용자)별** 등록 — 테넌트 공용 아님. 같은 회사 안에서도 각자 자기 키를 등록 |
| 실행 트리거 | 계약 상태 진입 시 자동(백그라운드). 버튼 클릭 방식 아님 |
| 분석 결과 범위 | 대상·kind당 결과 1개(트리거한 사람 기준) — 여러 사람이 같은 계약을 봐도 결과는 공유. 다만 "누구 자격증명으로 생성됐는지"는 기록 |
| 실행 신뢰성 | 새 인프라(Redis 등) 없이 **DB 테이블이 잡 큐 겸 결과 저장소** 역할 |
| 백엔드 위치 | 새 `ai-service` 마이크로서비스 — 자체 DB는 갖지 않음(auth-service 선례와 동일하게 무상태, DB는 user-service가 소유) |
| 프로바이더 확장성 | 인터페이스로 추상화, 지금은 OpenAI만 구현 |
| 모델 선택 | 설정 화면에서 등급(절약/표준/고정밀) 안내와 함께 선택. **기본값은 표준(mini급) 모델** — 최저가(nano/lite급)는 기본값으로 쓰지 않음(품질 우선) |
| 암호화 | 새 `packages/crypto`(AES-256-GCM) — `AiProviderCredential.encryptedApiKey`에만 적용. 기존 도메인 필드(Company/Contract.details 등) 암호화는 별도 후속 스펙 |
| 설정 화면 접근 | 로그인한 누구나 — 본인 설정만 보고 고침(테넌트 admin 개념 아님) |
| 프론트 갱신 방식 | SSE 신설 없이 단순 폴링(`status`가 pending/running인 동안만) |

## 3. 조사 결과 — ChatGPT OAuth(Codex CLI 방식)를 제외한 이유

`openai/codex` 오픈소스 저장소를 직접 확인했다(`codex-rs/login/src/auth/manager.rs`, `server.rs`).

- `client_id = "app_EMoamEEZ73f0CkXaXp7hrann"`, 인가서버 `auth.openai.com`.
- **redirect_uri가 `http://localhost:{포트}/auth/callback`로 고정** — 코드 주석에 "Hydra redirect URI allow-list"라 명시되어 있어, 이 client_id에 허용된 리다이렉트 주소가 로컬호스트로 한정되어 있다고 봐야 한다.
- 즉 이 흐름은 "사용자 PC에서 실행되는 프로세스가 자기 PC의 포트로 리다이렉트를 직접 받는" 네이티브 앱 전제다. Lawai는 웹 앱이라 리다이렉트를 받아야 하는 주체가 Lawai 서버인데, 이 client_id는 그런 리다이렉트를 허용하지 않을 가능성이 매우 높고, 설사 흘러들어와도 서버가 사용자 PC의 localhost로 간 코드를 받을 방법이 없다.
- **리스크 감수의 문제가 아니라 이 구조로는 구현 자체가 안 됨** — 그래서 API Key 단일 인증으로 확정한다.

## 4. 서비스 구조

- **DB 소유**: user-service가 전체 DB를 계속 소유. 새 Postgres 스키마 `ai`에 `AiProviderCredential`, `AiAnalysis` 두 테이블 추가.
- **ai-service**: 무상태 마이크로서비스. TCP RPC 두 가지만 받는다.
  - `ai.analyze` — user-service가 "이 대상을 이 kind로 분석해줘 + 복호화된 API 키 + 입력 페이로드"를 넘기면 OpenAI를 호출해 결과를 **반환만** 한다(자기 DB에 아무것도 안 씀).
  - `ai.listModels` — 설정 화면 드롭다운용, 프로바이더가 제공하는 모델 목록(+등급 라벨)을 반환.
- **트리거 배선**: `contracts.service`의 `create()`/`updateStatus()`/`submitApproval()` 성공 직후, 해당 kind에 맞는 `AiAnalysis` 행을 `pending`으로 upsert(같은 `(targetType,targetId,kind)`면 덮어씀) → 트리거 주체(§6 참고)의 `AiProviderCredential`을 조회 → 없으면 `skipped` 상태로 즉시 종료(에러 아님, "설정 필요" 안내) → 있으면 `ai.analyze` RPC를 **await 하지 않고** 호출(fire-and-forget) → 응답 오면 콜백에서 `succeeded`/`failed` 갱신. RPC 실패/타임아웃 시 `failed` + `errorMessage`, `attempts` 증가.
- **결과 전파**: 별도 알림/SSE 배선 없음. 프론트가 `AiAnalysis` 조회 API를 폴링.
- **경계 원칙**: ai-service와 `AiAnalysis`는 결재 모듈과 동일하게 대상 도메인을 모른다 — `(targetType, targetId, kind)` 폴리모픽. 프롬프트 구성(kind별 입력 스키마·지시문)은 user-service 쪽 kind별 어댑터가 담당, ai-service는 "이 메시지를 보내고 이 JSON 스키마로 받아라"만 안다.

## 5. 데이터 모델 (user-service, 신규 `ai` 스키마)

```prisma
model AiProviderCredential {
  id            String   @id @default(uuid())
  userId        String   @unique   // 개인별 — 테넌트 공용 아님
  tenantId      String             // 소속 테넌트(감사·조회용 스냅샷)
  provider      String             // "openai"
  model         String             // 선택된 모델 id
  encryptedApiKey String
  lastVerifiedAt  DateTime?        // 저장 시 검증 호출 성공 시각
  updatedAt     DateTime @updatedAt
  createdAt     DateTime @default(now())

  @@schema("ai")
}

model AiAnalysis {
  id               String   @id @default(uuid())
  tenantId         String
  targetType       String   // "contract"
  targetId         String
  kind             String   // "precheck" | "risk" | "submitBriefing" | "approvalBriefing"
  status           String   // "pending" | "running" | "succeeded" | "failed" | "skipped"
  model            String?
  triggeredByUserId String  // 이 결과를 생성한 자격증명의 소유자(표시: "OOO님의 AI 설정으로 생성됨")
  input            Json     // 분석에 넘긴 입력 스냅샷(재현/디버깅용)
  result           Json?
  errorMessage     String?
  attempts         Int      @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([targetType, targetId, kind])
  @@index([tenantId, status])
  @@schema("ai")
}
```

`AiProviderCredential.encryptedApiKey`는 `packages/crypto`의 `encryptString`/`decryptString`으로 저장 전/조회 후 명시적으로 암복호화한다(서비스 코드에서 직접 호출 — 기존 코드베이스의 `as unknown as X` 캐스팅 관행과 같은 결의 명시적 호출).

## 6. 트리거 지점 (4곳) — 누구의 자격증명을 쓰는가

| kind | 트리거 시점 | 자격증명 주체 | 대체하는 mock |
|---|---|---|---|
| `precheck` | 계약 생성 시 계약서 파일(`role=contract`)이 있으면 | 작성자(`createdById`) | `aiPrecheck.ts`(요청 폼) — **UX 변화**: 폼 작성 중 즉시 뜨던 것에서 저장 후 비동기로 채워지는 방식으로 변경(확인 완료) |
| `risk` | `legalReview` 진입 또는 계약서 파일 교체 시 | 담당 법무(`ownerId`) | `RISKS` mock(상세 페이지) |
| `submitBriefing` | `reviewDone` 진입 시 | 작성자(`createdById`) | 결재 모듈 규칙 기반 사전점검(`getSubmitPrecheck.ts`)과 **병행**(대체 아님) |
| `approvalBriefing` | `signing` 진입 시(상신 직후) | 상신을 실행한 사람(`submitApproval` 호출자, `viewerId`) | 결재 시안의 "AI 결재 브리핑"(미구현이었음) |

전부 `contracts.service`의 `create()`/`updateStatus()`/`submitApproval()` 성공 직후 훅으로 배선한다. 자격증명 주체가 키를 등록 안 했으면 `AiAnalysis.status="skipped"`로 남기고 프론트는 "OOO님의 AI 설정이 필요합니다" 안내만 보여준다(에러 취급 안 함).

## 7. 프로바이더 추상화

```ts
// services/ai-service/src/providers/provider.ts
export interface AiProvider {
  id: string; // "openai"
  listModels(): Promise<{ id: string; label: string; tier: "economy" | "standard" | "precision" }[]>;
  analyze(input: {
    kind: string;
    model: string;
    payload: unknown;
    apiKey: string;
  }): Promise<{ result: unknown }>;
}
```

`OpenAiProvider`: OpenAI Chat/Responses API에 `Authorization: Bearer {apiKey}`로 직접 호출(Node 22 native `fetch`, 별도 SDK 의존성 없음). kind별 system prompt + JSON 스키마 강제(structured output)로 구조화된 결과를 받는다 — 등급이 낮은 모델도 자유서술이 아니라 "이 필드를 채워라" 형태라 상대적으로 안정적이다.

프로바이더 레지스트리(`AiProviderRegistry`)가 `id → AiProvider` 맵을 들고 있고, 이후 다른 프로바이더(DeepSeek 등 저가 대안 포함) 추가 시 새 클래스 등록만 하면 된다.

## 8. 프론트 연동

- 계약 상세의 "AI 계약 리스크" 카드 자리 하나가 계약의 현재 상태에 맞는 kind 결과를 표시(승인 모듈 시안에서 이미 이 방식으로 디자인함).
- `useQuery(["aiAnalysis", targetType, targetId, kind])` — `status`가 `pending`/`running`이면 2초 간격 `refetchInterval`, 끝나면 정지.
- `skipped`: "OOO님의 AI 설정이 필요합니다 · 설정하러 가기" 링크.
- `failed`: "분석 실패 · 다시 시도" 버튼 → 클릭 시 재분석 RPC(같은 행을 `pending`으로 재설정 + `attempts` 증가).
- `succeeded`: 결과 + 하단에 옅은 글씨로 "OOO님의 AI 설정으로 생성됨".

## 9. 설정 화면 (`apps/web` `/system`)

- 접근: 로그인한 누구나. 화면은 항상 **본인의** `AiProviderCredential` 행만 대상으로 한다(테넌트 admin 개념 없음).
- **내 AI 연동** 카드: 프로바이더 드롭다운(현재 OpenAI 단일, `ai.listModels` 응답으로 확장 가능한 구조) → 모델 드롭다운(등급 라벨 economy/standard/precision 표시, 기본 선택은 standard).
- API Key 입력 → 저장 시 서버가 실제 호출 1회로 검증하고 성공해야 저장(`lastVerifiedAt` 기록). 실패 시 에러 노출, 저장 안 됨.
- 연결 상태 배지(정상/미설정/키 만료·거부) + 최근 내 분석 성공/실패 이력 간단 노출.

## 10. 암호화 (`packages/crypto`, 최소 범위)

```ts
export function loadMasterKey(envVar = "AI_CREDENTIAL_MASTER_KEY"): Buffer; // 32바이트 검증
export function encryptString(plain: string, masterKey: Buffer): string; // AES-256-GCM, base64(iv|tag|ciphertext)
export function decryptString(sealed: string, masterKey: Buffer): string;
```

`AiProviderCredential.encryptedApiKey`에만 적용. Company/Contract.details 등 기존 도메인 PII 암호화(블라인드 인덱스 필요한 email/bizNo 포함)는 이번 스펙 범위 밖 — 이 패키지를 재사용할 별도 후속 스펙에서 다룬다.

## 11. 테스트

- **ai-service**: `OpenAiProvider` 단위 테스트(mock HTTP) — 성공·인증실패(401)·레이트리밋 케이스. `ai.analyze`/`ai.listModels` RPC 핸들러 테스트.
- **user-service**: 트리거 4곳 각각 — 상태 전이 성공 시 `AiAnalysis` upsert 확인, 자격증명 없으면 `skipped`, RPC 실패 시 `failed`. `AiProviderCredential` CRUD — 암호화 저장/복호화 조회, API Key 검증 실패하면 저장 안 됨.
- **packages/crypto**: encrypt/decrypt 라운드트립, 잘못된 마스터키로 복호화 시 실패.
- **apps/web**: 설정 화면 렌더(본인 행만 노출), AI 분석 카드의 pending/succeeded/failed/skipped 렌더 분기, 폴링 훅 단위 테스트.

## 12. 구현 순서

A. `packages/crypto` → B. user-service `ai` 스키마 + `AiProviderCredential`/`AiAnalysis` + CRUD RPC(개인별 저장·검증) → C. `ai-service` 신설(provider 인터페이스 + OpenAI 구현 + registry) → D. contracts.service 트리거 배선 4곳(자격증명 주체 결정 로직 포함) → E. gateway 엔드포인트(내 설정 CRUD, 분석 조회) → F. 프론트 설정 화면 → G. 프론트 AI 분석 카드 통합(폴링).
