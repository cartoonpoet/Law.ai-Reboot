# 멀티테넌시 백엔드 (Spec 1) — 설계

> Law.ai 를 단일 조직에서 멀티테넌트(다중 고객사) 법무 SaaS 로 전환하는 첫 단계.
> 이 spec 은 **백엔드 완결**(데이터 모델 + 격리 + 인증)만 다룬다. 회사 전환 UI / admin cross-tenant API / 온보딩은 후속 spec(2/3/4).

## 0. 배경 · 목표

- **현재**: 모든 데이터가 단일 조직 가정. User/Contract/Comment/File 등에 테넌트 개념 없음.
- **목표**: 고객사(Tenant)별로 데이터를 완전히 격리하되, 한 사용자가 여러 고객사에 속할 수 있게(N:M — 사외변호사 멀티 담당). 시스템 admin 은 전 테넌트를 가로질러 관리.
- **격리 전략**: Row-level (모든 테이블 tenantId + 쿼리 스코프). 단일 DB/서버로 충분(954MB 약한 서버), 운영 단순.
- **성공 기준**: 테넌트 A 사용자가 테넌트 B 데이터를 어떤 경로로도 조회/수정할 수 없다. 시스템 admin 만 cross-tenant. 기존 데이터는 무손실로 "기본 테넌트"에 귀속.

## 1. 데이터 모델

### 1.1 신규 모델

```prisma
// 고객사(테넌트). 최상위 격리 단위.
model Tenant {
  id        String       @id @default(uuid())
  name      String
  plan      TenantPlan   @default(starter)
  status    TenantStatus @default(active)
  createdAt DateTime     @default(now())

  memberships UserTenant[]

  @@schema("users")
}

enum TenantPlan {
  enterprise
  pro
  starter
  @@schema("users")
}

enum TenantStatus {
  active
  trial
  suspended
  @@schema("users")
}

// N:M 멤버십. role 은 "테넌트 안에서의 역할" (사외변호사가 A사 inHouseCounsel, B사 outsideCounsel 가능).
model UserTenant {
  id        String     @id @default(uuid())
  userId    String
  tenantId  String
  role      TenantRole @default(general)
  joinedAt  DateTime   @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId])
  @@index([userId])
  @@index([tenantId])
  @@schema("users")
}
```

### 1.2 Role 분해

현재 `Role` enum: `general | contractManager | inHouseCounsel | outsideCounsel | sealManager | admin`.

- **admin 을 시스템 레벨로 분리** → `User.isSystemAdmin: Boolean @default(false)`.
- 나머지 5개는 **테넌트 내 역할** → `TenantRole` enum (= 기존 Role 에서 admin 제거).
- `User.role` 컬럼은 **제거**(마이그레이션에서 UserTenant.role 로 이전). admin 이었던 사용자는 isSystemAdmin=true + 기본 테넌트 멤버십은 general(또는 적절 역할).

```prisma
enum TenantRole {
  general
  contractManager
  inHouseCounsel
  outsideCounsel
  sealManager
  @@schema("users")
}

model User {
  // ... 기존 필드에서 role 제거
  isSystemAdmin Boolean @default(false)
  tenantMemberships UserTenant[]
}
```

> **authz 영향**: `contracts.authz` 의 `evaluate(viewer, contract)` 는 viewer.role 을 본다. viewer.role 을 **활성 테넌트의 UserTenant.role** 로 공급하도록 변경(인터페이스 동일, 공급원만 교체).

### 1.3 tenantId 확산

**직접 tenantId FK 추가(루트 엔티티)** — 쿼리 진입점이 되는 것:

| 모델 | 비고 |
|---|---|
| `Contract` | 핵심. 모든 계약 쿼리에 tenantId 필터 |
| `Company` (상대계약사) | `bizNo` unique → `@@unique([tenantId, bizNo])` (회사마다 같은 상대사 별개 관리) |
| `ContractCategory` | 카테고리 트리는 테넌트별 |
| `Department` | `name` unique → `@@unique([tenantId, name])` |
| `AuditLog` | 감사도 테넌트 스코프 (admin 은 전체) |
| `Notification` | 알림 테넌트 스코프 |
| `PasswordResetToken` | 불필요(User 종속, 테넌트 무관) — 추가 안 함 |

**간접 격리(Contract 통해)** — contractId 로 부모 도달 가능한 것:
`Comment, CommentMention, Counterparty, ApprovalLine, ApprovalStep, File, ContractReference`

- 원칙: 부모 Contract 의 tenantId 로 격리(쿼리 시 contract 조인 또는 부모 소유 검증).
- **예외 — `File` 에는 tenantId denormalize**: 파일 다운로드(`getDownloadUrl`)가 `fileId` 단독으로 들어와 contractId 없이 접근하므로, 방어적으로 File 에 tenantId 직접 둔다. presign/confirm 시 contract.tenantId 를 복사.

> denormalize 는 File 만. 나머지 하위는 부모 Contract 검증으로 충분(쿼리가 항상 contractId 경유).

## 2. 인증 · 활성 테넌트

한 사용자가 여러 테넌트 소속 → 토큰에 tenantId 고정 불가. **"활성 테넌트" 개념** 도입.

### 2.1 JWT 클레임

```ts
interface JwtPayload {
  sub: string;
  email: string;
  isSystemAdmin: boolean;     // role 클레임 대체
  activeTenantId?: string;    // 일반 사용자: 현재 활성 테넌트. 시스템 admin: 생략 가능
  activeRole?: string;        // 활성 테넌트에서의 TenantRole (authz 공급원)
}
```

- 로그인 시: 사용자의 첫(또는 마지막 사용) 멤버십을 활성 테넌트로 → activeTenantId/activeRole 세팅.
- 멤버십이 0개면: 일반 사용자는 로그인 거부("소속 회사 없음"), 시스템 admin 은 통과(activeTenantId 없음).

### 2.2 회사 전환 = 토큰 재발급

```
POST /auth/switch-tenant  { tenantId }
```
- 호출자의 UserTenant 멤버십 검증(이 사용자가 그 테넌트 멤버인가) → 통과 시 activeTenantId/activeRole 갱신한 **새 access/refresh 토큰** 발급.
- 멤버 아니면 403.

### 2.3 내 멤버십 조회

```
GET /auth/me/tenants  →  [{ tenantId, name, role, isActive }]
```
- 회사 스위처 UI(Spec 2)가 사용. 이번 spec 에선 엔드포인트만 제공.

## 3. 격리 가드

### 3.1 gateway → user-service

현재 gateway 가 `viewerId`(JWT sub)를 RPC payload 에 주입하는 패턴 그대로 확장:
- 모든 도메인 RPC payload 에 `tenantContext: { tenantId, isSystemAdmin }` 주입.
- `tenantId` 는 JWT `activeTenantId`. 시스템 admin 은 `isSystemAdmin: true`.

### 3.2 user-service 쿼리 스코프

- **공통 헬퍼** `tenantScope(ctx)`: 시스템 admin 이면 `{}`(필터 없음), 아니면 `{ tenantId: ctx.tenantId }`.
- 모든 루트 엔티티 조회/수정/삭제에 적용:
  - 조회: `where: { ...tenantScope(ctx), ...기존조건 }`
  - 생성: `data: { tenantId: ctx.tenantId, ... }` (admin 이 특정 테넌트 대신 생성 시 명시 tenantId)
  - 수정/삭제: 먼저 `findFirst({ where: { id, ...tenantScope(ctx) } })` 로 소유 검증 후 진행(타 테넌트 id 위조 차단).
- **멤버십 가드**: activeTenantId 가 실제 멤버십과 일치하는지 토큰 발급 시점에 보장되므로 매 요청 재검증은 불필요(토큰 위조는 JWT 서명이 방어). 단 switch-tenant 시 1회 검증.

### 3.3 시스템 admin cross-tenant

- 시스템 admin RPC 는 tenantScope 우회(전체 조회). admin 전용 엔드포인트(`/admin/*`)는 Spec 3 에서 회사별 집계 추가. 이번 spec 은 기존 `/admin/stats|audit` 가 전체 풀 집계(테넌트 무관) 유지.

## 4. 기존 데이터 마이그레이션

Prisma migration + 데이터 백필 SQL:

1. `Tenant`, `UserTenant`, enum 들 생성.
2. **기본 테넌트 1개 생성**: name="기본 조직"(또는 손준호님 회사명), plan=enterprise, status=active. id 는 고정 UUID(스크립트 상수).
3. 모든 루트 엔티티에 `tenantId` 컬럼 추가(nullable 로 우선) → 기존 행 전부 기본 테넌트 id 로 UPDATE → `NOT NULL` 로 전환.
4. `User.role` 값을 읽어 각 User 의 UserTenant(기본테넌트, role=기존role 중 admin 제외) 생성. admin 이던 User 는 `isSystemAdmin=true` + UserTenant.role=general(또는 inHouseCounsel).
5. `User.role` 컬럼 제거.
6. unique 제약 변경: `Company.bizNo` → `@@unique([tenantId, bizNo])`, `Department.name` → `@@unique([tenantId, name])`.
7. File.tenantId 백필: `UPDATE File SET tenantId = (SELECT c.tenantId FROM Contract c WHERE c.id = File.contractId)`.

> 손준호님(cartoonpoet@naver.com)은 현재 prod 에서 role=admin → isSystemAdmin=true 로 이전.

## 5. 범위 경계 (이번 spec 에서 하는 것 / 안 하는 것)

**한다**:
- Tenant/UserTenant 모델 + Role 분해 + 마이그레이션 + 백필
- JWT activeTenantId/isSystemAdmin + switch-tenant + me/tenants 엔드포인트
- 모든 도메인 서비스에 tenantScope 격리 적용
- 격리 단위 테스트(타 테넌트 접근 차단 검증)

**안 한다(후속 spec)**:
- 회사 전환 UI(web) — Spec 2
- admin 회사 목록/회사별 stats/대시보드 실데이터 — Spec 3
- 새 고객사 생성·사용자 초대 온보딩 — Spec 4
- 테넌트별 결제/플랜 과금 로직

## 6. 테스트 전략

- **격리 유닛테스트**: 각 도메인 서비스(contracts/comments/files/...) spec 에 "타 테넌트 id 로 접근 시 404/403" 케이스 추가.
- **authz**: 활성 테넌트 role 기반 evaluate 검증.
- **switch-tenant**: 멤버 아닌 테넌트로 전환 시 403, 멤버면 새 토큰에 activeTenantId 반영.
- **마이그레이션 dry-run**: 로컬 DB 에 기존 데이터 시드 후 백필 결과 검증(모든 행 tenantId not null, UserTenant 생성 수 = User 수).

## 7. 리스크 · 완화

| 리스크 | 완화 |
|---|---|
| 쿼리 한 곳에서 tenantScope 누락 → 데이터 유출 | tenantScope 헬퍼 단일 출처 + 격리 유닛테스트로 도메인별 커버. 코드리뷰 체크리스트 |
| 마이그레이션 중 기존 prod 데이터 손상 | nullable→백필→not null 3단계. prod 적용 전 로컬 dry-run. 백업 |
| File fileId 단독 접근 격리 누락 | File.tenantId denormalize + getDownloadUrl 에 tenantScope |
| 기존 access token(activeTenantId 없음) 호환 | 토큰에 activeTenantId 없으면 격리 불가 → 전 사용자 재로그인 강제(refresh 거부). 배포 시 공지 |
| authz role 공급원 변경 누락 | viewer.role 공급 지점을 activeRole 로 일괄 교체, 기존 authz 로직은 불변 |
