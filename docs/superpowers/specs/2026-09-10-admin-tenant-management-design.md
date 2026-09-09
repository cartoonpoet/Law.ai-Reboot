# Admin 회사별 관리 (Spec 3) — 설계

> 멀티테넌시 Spec 1(백엔드)·Spec 2(회사 전환 UI)의 후속. 시스템 관리자가 admin 콘솔에서
> 고객사(테넌트) 전체를 조회·관리한다. UI 는 `admin-tenant-mockup.html` 시안(목록 + 상세) 채택 확정.
> "+ 고객사 추가"(온보딩)는 Spec 4 — 이번 범위 아님.

## 0. 배경 · 목표

- **현재**: admin 대시보드 통계(`/admin/stats`)는 전 테넌트 합산. 회사 단위 조회·관리 수단이 없고,
  Tenant.plan/status 는 DB 에 있지만 읽고 쓰는 API 가 없다. status=suspended 는 아무 효력이 없다.
- **목표**: ① 고객사 목록/상세(회사별 집계) 화면, ② 요금제·상태 변경(감사 기록 포함),
  ③ suspended 의 실제 효력(로그인·전환 차단), ④ 체험판 만료일(trialEndsAt) 도입 + D-day 표시.
- **성공 기준**: 관리자가 회사별 사용 현황을 한눈에 보고, 이용 정지 시 그 회사 멤버가 새로 로그인/전환할 수 없다.

## 1. DB — `Tenant.trialEndsAt` (승인됨)

```prisma
model Tenant {
  // ... 기존 필드
  trialEndsAt DateTime? // status=trial 일 때 체험판 만료 시각. active/suspended 면 null 권장(강제 안 함)
}
```

- 마이그레이션: 컬럼 추가(nullable) — 백필 불필요(기존 행 null, 기본 테넌트는 active).
- **ERD 동기화 필수**: erdify MCP 로 "Law.ai Reboot" ERD 에 컬럼 반영 (CLAUDE.md 규칙).

## 2. 백엔드 API (gateway `/admin/*` → user-service RPC)

기존 체계 그대로: gateway `AdminController`(JwtAuthGuard + AdminRoleGuard) → `ADMIN_PATTERNS` RPC → user-service `admin.service`.

### 2.1 contracts 확장 (`admin.dto.ts`, `patterns.ts`)

```ts
// patterns.ts ADMIN_PATTERNS 에 추가
LIST_TENANTS: "admin.listTenants",
GET_TENANT: "admin.getTenant",
UPDATE_TENANT: "admin.updateTenant",

// admin.dto.ts 에 추가
export interface AdminTenantListItem {
  id: string; name: string;
  plan: TenantPlan; status: TenantStatus;
  trialEndsAt: string | null; createdAt: string;
  memberCount: number; contractCount: number;
  lastActivityAt: string | null; // 해당 테넌트 AuditLog 최신 createdAt
}
export interface AdminTenantListResponse {
  tenants: AdminTenantListItem[];
  totals: { tenants: number; users: number; contracts: number; trials: number };
}
export interface AdminTenantDetailResponse {
  tenant: AdminTenantListItem;
  stats: {
    memberCount: number;
    activeContracts: number;  // status NOT IN (signed, fulfilling, closed), deletedAt null
    signedContracts: number;  // status IN (signed, fulfilling, closed), deletedAt null
    storageBytes: number;     // File.size 합 (tenantId 기준, storageKey != null)
  };
  roleBreakdown: { role: TenantRole; count: number }[];
  recentAudit: AdminAuditEntry[]; // 기존 타입 재사용, tenantId 필터, 최근 10건
}
export interface AdminTenantUpdateRequest {
  tenantId?: string; // gateway 가 path param 주입
  plan?: TenantPlan;
  status?: TenantStatus;
  trialEndsAt?: string | null; // status=trial 로 바꿀 때 설정, null 로 해제
}
// 응답: AdminTenantListItem (갱신된 값)
```

### 2.2 gateway 엔드포인트

- `GET  /admin/tenants` → LIST_TENANTS
- `GET  /admin/tenants/:id` → GET_TENANT (없으면 404)
- `PATCH /admin/tenants/:id` body `{plan?, status?, trialEndsAt?}` → UPDATE_TENANT

### 2.3 user-service `admin.service` 구현 방침

- **listTenants**: `tenant.findMany` + `userTenant.groupBy(tenantId)` + `contract.groupBy(tenantId, deletedAt null)`
  + `auditLog.groupBy(tenantId, _max.createdAt)` 를 병렬 실행 후 머지. totals 는 기존 stats 카운트 재사용 수준
  (users=User 전체, contracts=Contract 전체(deletedAt null), trials=status trial 인 테넌트 수).
- **getTenant**: 위 상세 집계 4종 + `userTenant.groupBy(role)` + 기존 `getRecentAudit` 로직에 `tenantId` where 추가
  (actorName 조인 방식 재사용 — 중복 구현 대신 내부 헬퍼로 추출).
- **updateTenant**: `tenant.update` 후 `AuditLog` 기록
  (action: 기존 enum `update` 재사용 — AuditAction enum 확장(스키마 변경) 회피. targetType "Tenant", detail 에 변경 전/후).
  admin 행위라 tenantId 는 대상 테넌트 id 로 기록.

## 3. suspended 효력 (auth-service) — 승인됨

- `MembershipRow` 에 `tenantStatus: TenantStatus` 추가 (user-service findMemberships 가 tenant 조인해 채움).
- auth-service `buildResult`:
  - **로그인**(활성 테넌트 자동 선택): suspended 가 아닌 첫 멤버십 선택. 전부 suspended 면
    403 "이용이 정지된 회사입니다. 관리자에게 문의하세요."
  - **switch-tenant**(명시 선택): 대상이 suspended 면 동일 403.
- 시스템 admin 은 영향 없음(테넌트 무관 통과, 기존 로직 유지).
- 기존 발급 토큰은 만료까지 유효(수 분) — 즉시 강제 로그아웃·refresh 차단은 범위 외(후속).
- 웹(apps/web) 변경 없음: 스위처에서 suspended 회사 전환 시도 → 403 → 기존 "회사 전환 실패" 에러 UI 가 처리.

## 4. admin 프론트 (apps/admin) — 시안 그대로

- **네비**: AdminShell 에 "고객사" 메뉴 추가 (대시보드 / 고객사 / …기존 구조 유지).
- **`pages/tenants/TenantListPage`**: 상단 KPI 4개(전체 고객사·전체 사용자·전체 계약·체험판(가장 임박한 만료 D-day 표기))
  + 회사 표(이니셜 배지·이름·요금제 pill·상태 pill·멤버·계약·최근 활동 상대시각) — 행 클릭 시 `/tenants/:id`.
  상태 필터 드롭다운(전체/사용 중/체험판/정지). "+ 고객사 추가" 버튼 없음(Spec 4).
- **`pages/tenants/TenantDetailPage`**: 뒤로 링크 + 회사 헤더(배지·가입일·요금제·상태 pill)
  + 우측 버튼 "요금제 변경", "이용 정지"(active/trial 일 때) 또는 "정지 해제"(suspended 일 때)
  + KPI 4개(멤버/진행 중 계약/체결 완료/저장 용량) + 역할별 멤버 구성 바 + 최근 활동(이 회사만).
  - 변경 동작: 확인 다이얼로그 후 PATCH. 상태를 "체험판"으로 바꿀 때 만료일 입력(기본 30일 후).
- **api/데이터**: `api/adminTenants.ts`(3개 함수) + react-query 훅. admin 앱의 기존 스타일/패턴(style.css, api/admin.ts 방식)을 따른다 — apps/web 전용 컨벤션(vanilla-extract 강제)은 admin 에 적용되지 않음.

## 5. 범위 경계

**한다**: 위 1~4. **안 한다**: 고객사 생성·초대(Spec 4), 결제/과금, 기존 토큰 즉시 무효화,
suspended 테넌트의 refresh 차단, 웹 앱 변경, 대시보드(기존 stats) 개편.

## 6. 테스트 전략

- **user-service** `admin.service.spec`: listTenants 집계 머지(멤버/계약/최근활동), getTenant 상세 집계
  (진행중·체결 분류 경계), updateTenant 갱신+감사 기록, 없는 id 404.
- **auth-service** `auth.service.spec`: suspended 단독 멤버 로그인 403, 혼합 멤버는 active 쪽 자동 선택,
  suspended 로 switch 403, 시스템 admin 무영향.
- **admin 프론트**: 테스트 인프라 부재(스크립트 없음) — 기존 상태 유지, 백엔드 테스트가 로직 커버. 화면은 수동 확인.
- 전체 `pnpm turbo lint build test` 통과.

## 7. 리스크

| 리스크 | 대응 |
|---|---|
| 집계 쿼리 N+1 | groupBy 배치 4회 + 메모리 머지(테넌트 수십 규모 전제 — 현재 SaaS 초기 단계에 충분) |
| suspended 검사로 로그인 흐름 회귀 | 기존 auth spec 전부 유지 + 신규 케이스 추가로 회귀 감지 |
| MembershipRow 확장의 다운스트림 파급 | tenantStatus 는 추가 필드(기존 소비처 비파괴). my-tenants 응답(TenantMembership)은 불변 |
| trialEndsAt 과거 시각인데 status=trial 방치 | 이번 범위선 표기만(D-0 이하 "만료됨" 표시). 자동 전환은 과금 도입 시 후속 |
