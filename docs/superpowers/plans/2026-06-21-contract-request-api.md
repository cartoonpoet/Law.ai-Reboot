# 계약검토 요청 API 연동 Plan

**Goal:** 계약서 검토 요청 폼 제출이 실제 DB에 저장·재조회되도록 멀티스키마 Prisma + create/get API를 연동한다 (코어+JSONB MVP).
**Stack:** Prisma 6.2 (multiSchema), NestJS(user-service msg pattern + api-gateway REST/JWT), @lawai/contracts(DTO+pattern+zod), React(apps/web).

상세 설계: `docs/superpowers/specs/2026-06-21-db-schema-multi-schema-design.md` (§0 구현 결정).

---

## Phase A: Prisma 멀티스키마 + Contract/Counterparty

### Task A1: schema.prisma 멀티스키마 + 신규 모델
**Files:** Modify `services/user-service/prisma/schema.prisma`
- datasource에 `schemas = ["users","companies","contracts","shared"]`
- 기존: `User`,`PasswordResetToken` `@@schema("users")`; `Company`,`CompanyType` `@@schema("companies")`
- enum `SecurityLevel { top secure normal }`, `ReviewType { normal std }` `@@schema("contracts")`
- model `Contract` `@@schema("contracts")`: id, title, securityLevel, reviewType, party/catMajor/catMinor/catSub(String?), requesterId/ownerId(String?, FK 없음 — mock id), createdById(FK→User), periodStart/periodEnd/dueDate(DateTime?), schemaVersion(Int @default(1)), details(Json), deletedAt(DateTime?), createdAt/updatedAt. relation: createdBy, counterparties[]. `@@index([createdById]),([deletedAt])`
- model `Counterparty` `@@schema("shared")`: id, contractId(FK→Contract cascade), companyId(FK→Company), partyType(String?), snapshot(Json), createdAt. `@@index([contractId]),([companyId])`
- User에 `contracts Contract[]`, Company에 `counterparties Counterparty[]` 역관계 추가

### Task A2: 마이그레이션
- `cd services/user-service && npx prisma migrate dev --name add_contracts_multischema`
- 기대: companies 스키마로 Company 이동 + contracts/shared 스키마·테이블 생성, client 재생성
- drift로 reset 요구 시 dev 데이터 폐기 가능 → 확인 후 진행

## Phase B: @lawai/contracts (계약 DTO/패턴/zod)

### Task B1: patterns + dto
**Files:** Modify `packages/contracts/src/patterns.ts`; Create `packages/contracts/src/dto/contract.dto.ts`; Modify `src/index.ts`
- `CONTRACT_PATTERNS = { CREATE:"contract.create", GET:"contract.get" }`
- `contractDetailsV1` zod (stage, period 보조필드, lang, legal, negotiation, money[], moneyNote, payTerms, purpose, keyPoints, concerns, urls, ccUsers/ccDepts/ccSecret, owner, project, relatedDocs, approvers, attachFiles/refFiles/contractFiles meta)
- `CreateContractRequest`(코어 필드 + details + counterparties: {companyId, snapshot}[]), `ContractResponse`
- build: `pnpm --filter @lawai/contracts build`

## Phase C: user-service contracts 모듈

### Task C1: contracts service/controller/module
**Files:** Create `services/user-service/src/contracts/{contracts.service.ts,contracts.controller.ts,contracts.module.ts}`; Modify `app.module.ts`
- service.create: Contract + Counterparty[] 트랜잭션 저장(details/snapshot JSON), securityLevel/reviewType 매핑, 날짜 파싱
- service.get(id): deletedAt null 조회 + counterparties include
- controller: `@MessagePattern(CONTRACT_PATTERNS.CREATE/GET)`
- spec: `contracts.service.spec.ts` (create/get 1개씩)

## Phase D: api-gateway contracts 컨트롤러

### Task D1: REST 엔드포인트
**Files:** Create `services/api-gateway/src/contracts/{contracts.controller.ts,contracts.module.ts,dto.ts}`; Modify `app.module.ts`
- `POST /contracts` (JwtAuthGuard) → createdById = JWT sub 주입 후 USER_CLIENT.send(CREATE)
- `GET /contracts/:id` → send(GET)
- rpcToHttp 파이프 사용

## Phase E: web API 연동

### Task E1: api/contracts.ts + 폼→DTO 매퍼
**Files:** Create `apps/web/src/api/contracts.ts`; Create `apps/web/src/pages/contract/toCreateRequest.ts` (+ test)
- `createContract(req)`, `getContract(id)` apiFetch
- `toCreateRequest(form)`: ContractRequestForm → CreateContractRequest (코어 분리 + details + counterparties snapshot)

### Task E2: ContractRequestPage 제출 연동
**Files:** Modify `apps/web/src/pages/contract/ContractRequestPage.tsx` (+ 훅 분리 `hooks/useContractSubmit.ts`)
- handleValid → async: createContract(toCreateRequest(form)) → 성공 시 navigate(`/contract/${id}`), 실패 시 에러 표시(Alert)
- 로딩/에러 상태 선언적 처리

## Phase F: Evaluate
- `cd services/user-service && npx tsc --noEmit` / `pnpm --filter @lawai/contracts test`
- `pnpm --filter web test`(영향 테스트) / `pnpm build`
- 마이그레이션 적용 확인, 라운드트립(create→get) 수동 점검
