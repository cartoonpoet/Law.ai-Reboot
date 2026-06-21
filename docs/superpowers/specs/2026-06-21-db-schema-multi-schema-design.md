# DB 스키마 재설계 (멀티 스키마 + 유연 폼 + 보안 골격)

- 날짜: 2026-06-21
- 대상: `services/*/prisma/schema.prisma` (현재 `services/user-service`, 향후 도메인별 확장)
- 방향: Postgres **멀티 스키마(네임스페이스)** 경계 분리 + 코어 컬럼 / `details(JSONB)` 분리 + 법무용 보안 골격 내장
- 시안(관계도): 레포 루트 `lawai_erd_시안.png` (PIL 렌더, erdify 미반영)
- erdify: **개발 착수 시점에만** "Law.ai Reboot" ERD에 반영한다 (설계 단계에서는 미반영). `[[erdify-erd-sync]]`

## 0. 구현 결정 (2026-06-21, 계약검토 요청 API 연동)

폼(`apps/web/src/pages/contract/request-schema.ts`) 전수 재검토 + 기존 코드 확인 후 확정:

- **1차 범위 = 코어 컬럼 + `details(JSONB)` MVP.** `contracts.Contract` + `shared.Counterparty`만 정규 테이블로 추가하고, 계약서 작성/제출이 실제 DB에 저장·재조회되도록 `create`/`get` API를 연동한다. 결재선(`ApprovalLine/Step`)·참조(cc)·첨부(`File`)·`AccessGrant`·`AuditLog`·`relatedDocs`·`ContractCategory`는 **이번엔 `details` JSONB로 보관**하고 후속에서 정규 테이블로 승격한다.
- **멀티 스키마 지금 도입.** 기존 모델을 스키마에 배치: `User/PasswordResetToken → users`, `Company → companies`, 신규 `Contract → contracts`, `Counterparty → shared`. (Prisma 6.2 multiSchema GA — preview 불필요.)
- **기존 `Company` 모델 유지.** 실제 코드의 Company는 임베디드 담당자(`managerName/managerPhone/managerEmail`), `type`(enum), `ceo`, `address/addressDetail` 구조이고 폼·companies API가 이미 동작 중. 본 스펙의 `CompanyContact` 분리/`zipCode` 분할/`repName` 리네임(§3.2)은 **후속 마이그레이션으로 미룬다.** 체결 무결성은 `Counterparty.snapshot`만 추가해 확보.

### 폼 재검토로 추가된 갭

- **보안 등급 누락** → `Contract.securityLevel`(top/secure/normal) **컬럼 추가**. 폼 `secure` 필드. ACL·PII 마스킹·열람 감사(view)를 구동하는 핵심이라 컬럼.
- **계약 분류가 4단계** (`party`(당사자)/`catMajor`/`catMinor`/`catSub`) — 폼 기준. MVP에서는 `ContractCategory` 테이블 대신 **4개 문자열 컬럼**으로 보관(옵션은 현재 클라이언트 정적值). 후속에서 `ContractCategory` 트리로 정규화.
- 아키텍처: gateway(REST+JWT) → user-service(NestJS MessagePattern) → Prisma. 신규 contracts 모듈은 **user-service**에 추가, gateway에 REST 엔드포인트 추가, DTO/PATTERN은 `@lawai/contracts`.

## 1. 배경 · 목표

현재 스키마는 `user-service` 한 곳에 `users` 스키마로 뭉쳐 있고(`User`, `PasswordResetToken`), 계약/회사/결재/감사 등 도메인이 아직 없다. 계약서 검토 요청 화면(`2026-06-11-contract-review-request-redesign-design.md`)은 30여 필드의 가변 폼이라, 이를 곧이곧대로 컬럼화하면 폼이 바뀔 때마다 마이그레이션이 발생한다.

목표:

1. **도메인 경계**를 Postgres 멀티 스키마로 분리하되, **DB는 하나로 유지**(분산 FK 문제 회피).
2. **컬럼은 "목록/필터/정렬/검색/워크플로/보안에 쓰이는 것"만**. 나머지 가변 폼 필드는 `details(JSONB)` + 버전드 zod로 관리 → 폼이 바뀌어도 **마이그레이션 0**.
3. 법무 시스템 기준의 **보안 골격**(소프트 삭제·레코드 ACL·열람 감사·첨부 무결성·PII 마스킹)을 기본 구조에 박는다.
4. 회사/상대계약자는 **재사용 마스터 + 체결 시점 스냅샷**으로 모델링(과거 계약서 표기 무결성 보장).

## 2. 스키마(네임스페이스) 분리

| Postgres schema | 테이블 |
| --- | --- |
| `users` | `User`, `PasswordResetToken` |
| `companies` | `Company`, `CompanyContact` |
| `contracts` | `Contract`, `ContractCategory` |
| `shared` | `File`, `ApprovalLine`, `ApprovalStep`, `Counterparty`, `AuditLog`, `AccessGrant` |

- `shared`는 폴리모픽 공용(어느 도메인이든 재사용).
- 별도 `contract-service`로 **DB까지** 쪼개는 것은 현재 과함 — `Counterparty`가 `Company`를 FK로 물어서 DB가 분산되면 무결성 관리가 어려워진다. **경계만 스키마로 나누고 DB는 단일.**
- Prisma 멀티 스키마: `datasource`에 `schemas = ["users","companies","contracts","shared"]`, 모델마다 `@@schema("...")`. (`previewFeatures` 불필요 — 최신 Prisma 기본 지원 여부 확인 후 적용)

## 3. 테이블 정의

> 타입은 Prisma 표기 기준. `?`는 nullable. 모든 PK는 `id String @id @default(uuid())`.

### 3.1 `users`

**User** (기존 유지)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | String PK | uuid |
| email | String `@unique` | |
| name | String | |
| passwordHash | String | |
| createdAt | DateTime `@default(now())` | |

**PasswordResetToken** (기존 유지) — `userId` FK→User `onDelete: Cascade`, `tokenHash @unique`, `expiresAt`, `usedAt?`, `createdAt`, `@@index([userId])`.

### 3.2 `companies`

**Company** — 재사용 마스터(회사 디렉토리). 회사 기본정보는 스키마가 안정적이므로 **JSONB 아닌 정규 컬럼**.
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | String PK | |
| name | String | 상호/회사명 (검색) |
| bizNo | String? `@unique` | 사업자등록번호. nullable(개인) + 중복 회사 방지. 응답 시 마스킹 |
| corpNo | String? | 법인등록번호 |
| isIndividual | Boolean `@default(false)` | 개인/법인 구분 (개인이면 bizNo 없음) |
| repName | String? | 대표자명 |
| repPhone | String? | 대표전화 |
| email | String? | 대표 이메일 |
| zipCode | String? | 우편번호 ┐ |
| address1 | String? | 기본주소 ├ 카카오 우편번호 연동(구조화 저장) |
| address2 | String? | 상세주소 ┘ |
| createdAt | DateTime `@default(now())` | |
| updatedAt | DateTime `@updatedAt` | |

**CompanyContact** — 회사 담당자(1:N). 한 회사에 영업/법무 담당자 여러 명.
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | String PK | |
| companyId | String FK→Company | `onDelete: Cascade`, `@@index` |
| name | String | 담당자명 |
| title | String? | 직책 |
| phone | String? | 연락처(마스킹) |
| email | String? | |
| isPrimary | Boolean `@default(false)` | 대표 담당자 |

### 3.3 `contracts`

**Contract** — 코어 컬럼 + `details(JSONB)`.
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | String PK | |
| title | String | 계약명 (목록/검색) |
| securityLevel | enum(top/secure/normal) | **보안 등급** — ACL·마스킹·열람감사 구동 (폼 `secure`) |
| companyId | String? FK→Company | 자사 측/주체 회사 |
| party / catMajor / catMinor / catSub | String? | 4단 분류 (MVP 컬럼, 후속 `ContractCategory` 트리로 정규화) |
| requesterId | String FK→User | **명의상 요청자** |
| ownerId | String FK→User | 업무담당자 |
| createdById | String FK→User | **실제 생성 행위자** (requester와 구분 — 감사/보안) |
| period | (start/end) | 계약기간 (만료조회/정렬) — `periodStart DateTime?`, `periodEnd DateTime?` |
| dueDate | DateTime? | 검토 마감 (정렬/알림) |
| reviewType | String | 일반검토 / 표준양식체결 (백엔드 분기) |
| schemaVersion | Int `@default(1)` | `details` 모양의 버전 |
| details | Json | 가변 폼 필드 전부 (JSONB) |
| deletedAt | DateTime? | **소프트 삭제** (하드삭제 금지) |
| createdAt / updatedAt | DateTime | |

- `stage`(신규/변경)는 목록·필터·검색 어디에도 안 쓰여 **컬럼 미채택 → `details`로**.
- `reviewType`은 백엔드가 표준양식 로직으로 분기하므로 **컬럼 유지**.

**ContractCategory** — `id`, `name` (+ 필요 시 `parentId`로 대/중분류 트리). `1:N → Contract`.

### 3.4 `shared` (폴리모픽 공용)

**File**
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | String PK | |
| ownerType / ownerId | String | 폴리모픽 소유자 (예: `Contract`+id) |
| storageKey | String | **비공개 버킷 키** (공개 URL 금지, 단기 서명 URL 발급) |
| checksum | String | sha256 — 위변조 검증 |
| deletedAt | DateTime? | 소프트 삭제 |
| createdAt | DateTime | |

**ApprovalLine** — `id`, `ownerType/ownerId`(폴리모픽), `createdAt`.
**ApprovalStep** — `id`, `lineId` FK→ApprovalLine(`onDelete: Cascade`), `approverId` FK→User, `order Int`, `status`(pending/approved/rejected).

**Counterparty** — 계약별 상대계약자 + **체결 시점 스냅샷**.
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | String PK | |
| contractId | String FK→Contract | `onDelete: Cascade`, `@@index` |
| companyId | String FK→Company | 어느 회사 |
| contactId | String? FK→CompanyContact | 그 계약의 담당자 |
| partyType | String | 갑/을 등 |
| snapshot | Json | **체결 당시 회사·담당자 정보 동결** |

> 마스터(`Company`)를 나중에 수정해도 `snapshot` 덕분에 **과거 계약서 표기는 불변**(법적 무결성). 동시에 마스터는 재사용·중복체크·"회사 X와의 모든 계약" 집계를 지원.

**AuditLog**
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | String PK | |
| action | String/enum | create/update/delete/**view** — top/secure 계약 **열람**까지 기록 |
| actorId | String FK→User | 행위자 |
| targetType / targetId | String | 감사 대상(폴리모픽) |
| at | DateTime `@default(now())` | |

**AccessGrant** — 레코드별 접근제어(폴리모픽).
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | String PK | |
| ownerType / ownerId | String | 대상 레코드 |
| principalType | String | user / dept / role |
| principalId | String | |
| level | String | view / edit |

> 폼의 비밀 참조자(ccSecret)·top 보안계약의 제한 공유를 `AccessGrant`로 구현, **앱 레벨에서 row-level 강제**.

## 4. 관계 요약

| 관계 | 카디널리티 | 비고 |
|---|---|---|
| User → PasswordResetToken | 1:N | Cascade |
| User → Contract (requester/owner/createdBy) | 1:N ×3 | 명의상 요청자 ≠ 실제 생성자 |
| ContractCategory → Contract | 1:N | |
| Company → Contract | 1:N | 자사 측 |
| Company → CompanyContact | 1:N | 담당자 |
| Company → Counterparty | 1:N | 상대계약자 재사용 |
| CompanyContact → Counterparty | 1:N | 계약별 담당자 지정 |
| Contract → Counterparty | 1:N | |
| ApprovalLine → ApprovalStep | 1:N | |
| User → ApprovalStep (approver) | 1:N | |
| User → AuditLog (actor) | 1:N | |
| Contract →(poly) File/ApprovalLine/AccessGrant | ownerType+ownerId | DB FK 아님, 앱 무결성 |

## 5. 컬럼 vs JSONB 규칙 (유연 폼 보장)

- **컬럼이 되는 것은 오직** 목록/필터/정렬/검색/워크플로/보안에 쓰이는 값. 그 외 폼 필드는 전부 `details(JSONB)`.
- `details`의 모양은 `@lawai/contracts`의 **버전별 zod 레지스트리**가 소유. 폼이 바뀌면 → zod 수정 + `schemaVersion + 1`, **마이그레이션 0**.
- 백엔드는 쓰기 시 `details`를 해당 `schemaVersion`의 zod로 **검증**(오염 차단). 과거 레코드는 자기 `schemaVersion` 스키마로 그대로 해석.
- **폼 빌더(EAV)는 하지 않는다.** 이 구조가 "유연 + 타입안전 + 저복잡도"의 균형점.

## 6. 보안 골격 (법무 기본)

| 항목 | 구현 |
|---|---|
| 소프트 삭제·보존 | `Contract.deletedAt`, `File.deletedAt` — 하드 삭제 금지(legal hold) |
| 레코드별 ACL | `AccessGrant`(폴리모픽) + 앱 레벨 row-level 강제 |
| 열람 감사 | `AuditLog.action = view` — top/secure 계약 "누가 언제 열람" 기록 |
| 첨부 무결성 | `File.checksum`(sha256), `storageKey` 비공개 버킷 + 단기 서명 URL(권한 체크 후 발급) |
| 암호화 | DB at-rest(TDE) + 오브젝트스토리지 암호화 기본. 컬럼 단위 암호화는 top-secret 한정 옵션 |
| PII 마스킹 | 목록 응답에서 `Company.bizNo`·담당자 연락처 마스킹, 권한 있을 때만 원문 |

## 7. 적용 절차 (구현 시)

1. Prisma `datasource`에 멀티 스키마 활성화, 모델별 `@@schema` 부여.
2. 도메인별 서비스 분리 여부 결정(현재는 `user-service` 단일 DB 유지 권장).
3. 마이그레이션 생성 → `companies`/`contracts`/`shared` 스키마 및 테이블 생성.
4. `@lawai/contracts`에 `schemaVersion`별 zod 레지스트리 + 검증 미들웨어.
5. 파일 스토리지: 비공개 버킷 + 서명 URL 발급 엔드포인트(권한 체크).
6. **erdify "Law.ai Reboot" ERD** — 06-20 시점에 이미 **목표 설계 전체**(Contract/ContractCategory/File/ApprovalLine/ApprovalStep/Counterparty/AuditLog, 폴리모픽 포함)가 그려져 있다. 이번 MVP는 그 부분집합이라 **ERD는 목표 상태로 그대로 둔다**(덮어쓰지 않음). MVP 분기는 §9 참조. CLAUDE.md의 DB↔ERD 규칙은 "최종 목표 스키마가 ERD에 반영" 상태로 충족됨. `[[erdify-erd-sync]]`

## 9. ERD(목표) ↔ MVP 구현 차이 (2026-06-21 기준)

erdify ERD는 목표를, 실제 `schema.prisma`는 MVP 부분집합을 표현한다. MVP를 목표로 수렴시킬 때 정리할 항목:

| 항목 | ERD (목표) | MVP 구현 (현재 코드) | 수렴 방향 |
|---|---|---|---|
| 버전 컬럼 | `Contract.formVersion` | `Contract.schemaVersion` | **개명 확정** — 목표 수렴 시 ERD를 `schemaVersion`으로 |
| Counterparty | 폴리모픽(`ownerType/ownerId/role`) | `contractId`(FK) + `companyId` + `partyType` + **`snapshot(JSONB)`** | snapshot 체결 동결 확정 → ERD에 `snapshot` 추가 + 모델 재검토 |
| **ApprovalLine/Step** | 폴리모픽(`ownerType/ownerId`) | **`contractId`(FK) 직접** + steps(`stepOrder/name/dept/type/status`) | **2026-06-21 정규화 완료**(JSONB→테이블). ERD는 폴리모픽이나 MVP는 Counterparty 와 동일하게 contractId 직접 FK |
| **File** | 폴리모픽(`ownerType/ownerId`) + `size/mimeType/storageKey` | **`contractId`(FK) 직접** + `role/name/meta/sortOrder` (`size/mimeType/storageKey` nullable) | **2026-06-21 정규화 완료**(메타 행만, 실제 업로드는 후속). ERD 폴리모픽 → MVP contractId 직접 FK |
| 분류 | `categoryId`(FK→ContractCategory) + `partyType` | `party/catMajor/catMinor/catSub`(String) | 후속에서 `ContractCategory` 트리로 정규화 |
| **status/code** | `ContractStatus` enum + `code`(unique) | **2026-06-21 추가**: `status`(ContractStatus, 기본 unassigned) + `code`(unique, C{YYYYMMDD}-{4자리}) | ERD 수렴 — 추가됨 |
| Contract 부가 | `stage·updatedById` 등 | 없음(`stage`는 details) | 후속에서 코어 승격 검토 |
| AuditLog/AccessGrant | 정규 테이블 | 미구현(이번엔 `details` JSONB) | 후속 Phase에서 정규 테이블 승격 |

### 결재선 정규화 (2026-06-21 완료)

폼 `approvers:[{name,dept,type}]` 를 `details` JSONB 에서 빼내 정규 테이블로 승격:

- `shared.ApprovalLine`(contractId FK, status) `1:N` `shared.ApprovalStep`(stepOrder, name, dept, type, status). 둘 다 Contract 에 cascade.
- enum: `ApproverType(draft/approve/agree/refer)`, `ApprovalStatus`, `StepStatus`(pending/approved/rejected).
- 생성 시 `CreateContractRequest.approvers`(최상위, details 아님)를 배열 순서대로 단계화. 빈 배열이면 결재선 미생성(`approvalLine: null`).
- `ContractResponse.approvalLine`(steps `stepOrder` 오름차순)로 반환. `ContractDetailsV1`에서 `approvers` 제거.
- 마이그레이션: `20260621010000_add_approval_line`(순수 추가).

### 첨부 파일 정규화 (2026-06-21 완료, 메타 행만)

폼 `contractFiles/attachFiles/refFiles`(각 `{name,meta}`)를 `details` JSONB 에서 빼내 단일 `shared.File` 테이블로 승격:

- `shared.File`(contractId FK cascade): `role(FileRole: contract/attach/ref)`, `name`, `meta`(표시문자열 보존), `sortOrder`, `createdAt`. **실제 업로드 전까지** `size/mimeType/storageKey` 는 nullable(미전송 → null).
- 생성 시 `CreateContractRequest.files`(최상위) 한 배열로 평탄화: 3개 폼 배열을 `role` 부여 + role 내 `sortOrder`(index)로 매핑.
- `ContractResponse.files`(role asc, sortOrder asc)로 반환. `ContractDetailsV1`에서 3개 파일 배열 제거.
- 마이그레이션: `20260621020000_add_file`(순수 추가).
- 미구현(후속): 실제 바이너리 업로드(비공개 버킷 + 서명 URL), checksum(sha256). `[[deploy-cicd-setup]]` 스토리지 선택 필요.

### 참조수신자(cc) 정규화 (2026-06-21 완료) — 신규 설계

폼 `ccUsers/ccDepts/ccSecret`(각 `EntityRef{id,name}[]`)는 **ERD에 없던 항목**. 새 테이블 `shared.ContractReference` 로 설계·정규화:

- 폼 의미: `ccUsers`=사용자 cc, `ccDepts`=부서 cc, `ccSecret`=사용자 cc(비밀). → `ccType(user/dept)` + `isSecret(bool)` 두 축으로 통합.
- `shared.ContractReference`(contractId FK cascade): `ccType(CcType: user/dept)`, `isSecret(Boolean @default(false))`, `refId`(디렉토리 id — 현재 mock), `name`(표시 스냅샷), `createdAt`. `@@index([contractId])`.
  - ccUsers → (user, false), ccDepts → (dept, false), ccSecret → (user, true).
- 생성: `CreateContractRequest.references`(최상위) 한 배열로. get/response: `references`(ccType asc, isSecret asc) 반환. `ContractDetailsV1`에서 cc 3개 배열 제거.
- 마이그레이션: `20260621030000_add_contract_reference`(순수 추가).
- **보안 미구현(후속)**: `isSecret=true` 행의 **읽기 마스킹·ACL**(AccessGrant)은 아직 없음 — 현재는 데이터만 정규화. 응답에서 권한 없는 사용자에게 비밀 참조자 숨김 처리는 AccessGrant 도입 시 적용. §6 참조.

### 계약 조회(목록/상세) API + status/code (2026-06-21 완료)

- **status/code 코어 컬럼 추가**: `Contract.status`(ContractStatus enum: draft/unassigned/assigning/legalReview/requesterReview/reviewDone/signing/signed/fulfilling/closed, 기본 `unassigned`), `Contract.code`(unique, `C{YYYYMMDD}-{4자리}` 생성, 충돌 시 재시도). 마이그레이션 `20260621040000_add_contract_status_code` — 기존 행은 `createdAt` 순 백필(`C{날짜}-{0001..}`).
- **목록 API** `GET /contracts`: 필터(`q`·`status`·`party`·`mine`) + 페이지네이션(`page`/`pageSize`, 기본 20, 최대 100). `q`는 title·code·상대회사명 부분일치. 응답 `ListContractsResponse{items: ContractSummary[], total, page, pageSize}`. `mine=true`면 gateway가 JWT sub를 `mineOf`로 주입.
- **상세 API** `GET /contracts/:id`: 기존(전체 관계 포함).
- **웹 연동**: `ContractListPage`(useContractsList 훅 — useQuery, status enum→한글 라벨, 칩/검색/내업무/페이지네이션), `ContractDetailPage`(useQuery + `toDetailView` 매퍼). AI 리스크·코멘트·라이프사이클은 별도 기능이라 mock 유지.
- 표시: `code`=관리번호, status enum→`contractStatus.ts`의 한글 라벨(StatusBadge 색상 매핑).

### 계약 수정 / 상태 전이 API (2026-06-21 완료)

- **상태 전이** `PATCH /contracts/:id/status` `{ status, ownerId? }`: `ALLOWED_TRANSITIONS` 맵으로 검증(허용 외 전이는 400). `ownerId` 지정 시 함께 배정. 전이 맵: unassigned→{assigning,legalReview}, legalReview→{requesterReview,reviewDone}, requesterReview→{legalReview,reviewDone}, reviewDone→{signing,legalReview}, signing→signed→fulfilling→closed 등.
- **필드 수정** `PATCH /contracts/:id`: 제공된 core 필드 + `details`만 부분 갱신(undefined는 미변경). **관계(상대계약자/결재선/파일/참조)는 변경하지 않음** — 관계 편집은 후속.
- 패턴 `CONTRACT_PATTERNS.UPDATE`/`UPDATE_STATUS`, DTO `UpdateContractRequest`/`UpdateContractStatusRequest`.
- **웹**: 상세 페이지 "검토 액션" — `useContractStatus` 훅(useMutation + 캐시 무효화)으로 **반려**(→requesterReview)·**검토 완료**(→reviewDone) 버튼 라이브 연동, "현재 단계"에 실제 status 표시.
- 미구현(후속): 관계 편집 UI(수정 폼 prefill), 배정 화면, 코멘트.

### 보안: 비밀참조·PII 마스킹 (2026-06-21 완료)

- **상세 응답(GET /contracts/:id)** 에서 조회자 권한에 따라 민감정보 보호. gateway가 JWT sub를 `viewerId`로 주입.
- 권한 기준(MVP): `viewerId === createdById || viewerId === ownerId` 면 원문, 아니면:
  - 비밀 참조자(`references` 중 `isSecret=true`) **응답에서 제외**(need-to-know).
  - 상대회사 스냅샷 PII **마스킹**: `bizNo`(124-**-*****), `phone`/`managerPhone`(010-****-****), `managerEmail`(h***@domain). 이름·대표자·주소는 유지.
- 향후 **AccessGrant** 도입 시 권한 기준을 레코드별 ACL로 확장(현재는 생성자/담당자 기준). 열람 감사(AuditLog `view`)도 후속.
- 목록(ContractSummary)은 bizNo·비밀참조를 애초에 포함하지 않아 누출 없음. companies.search는 생성 플로우상 원문 유지.

> MVP 구현 위치: `services/user-service/prisma/schema.prisma`(멀티스키마+Contract/Counterparty), `@lawai/contracts`(contract.dto/패턴), user-service `contracts` 모듈, api-gateway `contracts` 컨트롤러, web `api/contracts.ts`·`toCreateRequest.ts`·`useContractSubmit.ts`.

## 8. 후속 · 미해결

- `ContractCategory` 대/중분류를 `parentId` 트리로 갈지, 별도 레벨 컬럼으로 갈지 — 폼의 cascade 3단(당사자/대/중)과 맞춰 확정.
- `AuditAction`을 Prisma enum으로 둘지 String으로 둘지(스키마 분리 시 enum 위치).
- `snapshot`/`details` JSONB의 zod 스키마 초안은 별도 작업으로 `@lawai/contracts`에 작성.
- 도메인 서비스 물리 분리(별도 NestJS 서비스) 시점/기준.
