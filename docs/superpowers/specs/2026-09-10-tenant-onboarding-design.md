# 고객사 온보딩 (Spec 4) — 설계

> 멀티테넌시 마지막 조각. UI 는 `onboarding-mockup.html` 시안(3단계 흐름) 채택 확정.
> Spec 3(feat/admin-tenant-management) 위에 스택 — admin 고객사 목록/테넌트 API 에 의존.
> ※ 사용자 취침 중 야간 자율 작업으로 작성·자체 승인됨 — 아침 리뷰 대상.

## 0. 배경 · 목표

- **현재**: 새 고객사를 받으려면 DB 직접 조작 필요. `/signup` 으로 가입해도 소속이 없어 로그인 거부.
- **목표**: ① 운영자가 admin 에서 회사 생성 + 첫 담당자 초대, ② 고객사 담당자가 웹에서 멤버 초대·관리,
  ③ 초대받은 사람이 링크로 가입(신규) 또는 기존 계정에 소속 추가.
- **성공 기준**: DB 를 만지지 않고 "회사 생성 → 담당자 초대 → 담당자가 직원 초대 → 직원 가입·로그인" 전체가 화면으로 완결.

## 1. 데이터 모델 — Invitation (users 스키마)

```prisma
model Invitation {
  id          String     @id @default(uuid())
  tenantId    String
  email       String
  role        TenantRole @default(general)
  tokenHash   String     @unique  // sha256(rawToken) — PasswordResetToken 과 동일 방식
  invitedById String               // 초대한 사용자 id (admin 또는 담당자)
  expiresAt   DateTime
  acceptedAt  DateTime?
  canceledAt  DateTime?
  createdAt   DateTime   @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([email])
  @@schema("users")
}
```

- 유효 초대 = `acceptedAt null && canceledAt null && expiresAt > now`.
- TTL 기본 7일(`INVITE_TTL_DAYS` env, 기본 7). 재발송 = tokenHash/expiresAt 회전(새 링크, 구 링크 무효).
- ERD 동기화: Invitation 테이블 + Tenant FK — erdify MCP (미로드 시 보류 명시).

## 2. 흐름 · API

토큰 발급·메일은 **auth-service**(비밀번호 재설정과 동일 소유), 저장·소비는 **user-service**.
초대 링크: `${APP_WEB_URL}/invite?token=<raw>`. 메일은 기존 MailService 에 `sendInviteLink` 추가(dev 로그 스텁).

### 2.1 1단계 — 운영자 회사 생성 (admin)

- `POST /admin/tenants` (AdminRoleGuard) body `{ name, plan, status: "active"|"trial", trialEndsAt?, managerEmail }`
  → AUTH_PATTERNS.ADMIN_CREATE_TENANT → auth-service:
  ① USER_PATTERNS.CREATE_TENANT 로 Tenant 생성 ② managerEmail 에 role=**contractManager** 초대 발급+메일.
  응답 `{ tenant: TenantDto, invited: true }`.
- admin TenantListPage 에 "+ 고객사 추가" 버튼 + 모달(시안 1단계: 이름/요금제/시작상태(체험판 기본 30일)/담당자 이메일).

### 2.2 2단계 — 담당자 멤버 초대 (web)

- `GET /tenants/members` (JwtAuthGuard) → USER_PATTERNS.LIST_TENANT_MEMBERS + tenantContext
  → `{ members: [{userId, name, email, role, joinedAt}], invites: [{id, email, role, expiresAt, createdAt}] }` (유효 초대만).
- `POST /tenants/invites` body `{ emails: string[], role }` → AUTH_PATTERNS.INVITE_MEMBERS
  (JWT 의 activeTenantId/sub/activeRole 주입). **권한**: activeRole ∈ {contractManager, inHouseCounsel} 또는 isSystemAdmin, 아니면 403.
  이미 이 테넌트 멤버인 이메일·유효 초대가 있는 이메일은 건너뜀 → 응답 `{ sent: n, skipped: string[] }`.
- `POST /tenants/invites/:id/resend` → AUTH_PATTERNS.RESEND_INVITE (권한 동일) — 토큰 회전 + 재메일.
- `DELETE /tenants/invites/:id` → USER_PATTERNS.CANCEL_INVITATION + tenantContext (권한: gateway 에서 동일 검사 불가 → user-service 로 inviterRole 전달해 검사). canceledAt 세팅.
- web `/members` 페이지(사이드바 "관리" 섹션에 "멤버 관리" 추가): 멤버 표 + 초대 대기 표(재발송/취소) + "+ 멤버 초대" 모달(이메일 여러 개 줄바꿈/쉼표 구분 + 역할 1개 선택 — 시안 단순화).

### 2.3 3단계 — 초대 수락 (public)

- `GET /auth/invites/:token` → AUTH_PATTERNS.GET_INVITE → 유효하면 `{ tenantName, email, role }`, 아니면 400.
- `POST /auth/invites/accept` body `{ token, name, password }` → AUTH_PATTERNS.ACCEPT_INVITE:
  ① passwordHash 생성 ② USER_PATTERNS.ACCEPT_INVITATION (user-service 트랜잭션):
  초대 소비(유효 검증) → email 로 기존 User 조회 →
  - **신규**: User 생성(name, passwordHash) + UserTenant(role) → `{ user, existingUser: false }`
  - **기존**: UserTenant 만 추가(이미 멤버면 초대만 소비) → `{ user, existingUser: true }`
  ③ 신규면 buildResult(activeTenantId=초대 테넌트) 로 토큰 발급 → `{ tokens, existingUser: false }`,
  기존이면 `{ existingUser: true }` (로그인 유도 — 다음 로그인부터 멤버십 반영).
- web `/invite` 페이지(AuthLayout, 공개): 토큰으로 초대 정보 표시(시안 3단계 카드) + 이름/비밀번호/확인 폼(react-hook-form+zod).
  성공: 신규 → 토큰 저장 후 `/` 이동. 기존 → "기존 계정에 {회사} 소속이 추가되었습니다" 안내 + 로그인 링크.
  무효/만료 토큰 → 에러 카드.

## 3. 범위 경계

**한다**: §1~2 전부. **안 한다(후속)**: 공개 `/signup` 차단·초대 전용 전환(기존 동작 유지),
초대별 개별 역할 UI(배치당 단일 역할), 만료 초대 자동 정리 배치, SMTP 실연동(로그 스텁 유지),
suspended 테넌트 초대 수락 차단(로그인 시점에 이미 차단됨).

## 4. 테스트 전략

- user-service: invitations.service spec — 생성/회전/취소/소비(만료·중복 멤버·기존 사용자 분기), listMembers 테넌트 격리.
- auth-service: invite 흐름 spec — 권한 403, 스킵 규칙, accept 신규(토큰 발급)/기존(existingUser), 무효 토큰 400.
- web: InviteAcceptPage·MembersPage api/훅 테스트(기존 페이지 테스트 패턴).
- admin: 빌드 검증(테스트 인프라 없음). 전체 `pnpm turbo lint build test`.

## 5. 리스크

| 리스크 | 대응 |
|---|---|
| 기존 사용자 수락 시 name/password 입력이 무의미 | 응답 existingUser 로 안내 문구 처리(MVP). 후속: 이메일 기존 여부 사전 조회 |
| 초대 이메일 오타 → 잘못된 사람 가입 | 초대 취소 + 만료 TTL 7일. 수락은 초대 이메일로만 User 생성(입력 이메일 없음) |
| 트랜잭션 없는 이중 수락 | user-service 에서 $transaction 으로 소비+생성 원자화, tokenHash unique |
