# 고객사 온보딩 (Spec 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> ※ 야간 자율 작업: 컨트롤러가 인라인 실행 — 실코드는 커밋 diff 가 원본이며 본 계획은 태스크 경계·인터페이스·검증 기준을 고정한다.

**Goal:** admin 회사 생성+첫 담당자 초대, 웹 멤버 초대·관리, 초대 링크 가입(신규 자동 로그인/기존 소속 추가)을 완성한다.

**Architecture:** 토큰 발급·메일·권한 검사는 auth-service(비밀번호 재설정과 동일 소유), Invitation 저장·소비·멤버 목록은 user-service. gateway 는 JWT 클레임(sub/activeTenantId/activeRole)을 RPC 페이로드로 주입. 프론트는 web(엄격 컨벤션)·admin(기존 패턴) 각자 규칙.

**Tech Stack:** NestJS RPC + Prisma($transaction) + jest / React 19 + react-query + react-hook-form + zod + vanilla-extract(web) / lawkit.

**Spec:** `docs/superpowers/specs/2026-09-10-tenant-onboarding-design.md`

## Global Constraints

- 커밋 `<type>: <내용>`, 이모지 금지. web 은 useEffect/useMemo/인라인 스타일 금지 + vanilla-extract 토큰.
- 초대 유효성 = `acceptedAt null && canceledAt null && expiresAt > now`. TTL `INVITE_TTL_DAYS`(기본 7일).
- 초대 권한 = `activeRole ∈ {contractManager, inHouseCounsel}` 또는 `isSystemAdmin` — 403 메시지 "멤버 초대 권한이 없습니다".
- 링크 형식 `${APP_WEB_URL}/invite?token=<raw>` (raw=randomBytes(32).hex, 저장은 sha256).
- ERD: Invitation 테이블 추가 — erdify MCP 미로드 시 보류 기록.

### Task 1: contracts — 초대/온보딩 계약
- AUTH_PATTERNS: `ADMIN_CREATE_TENANT, INVITE_MEMBERS, RESEND_INVITE, GET_INVITE, ACCEPT_INVITE`
- USER_PATTERNS: `CREATE_TENANT, LIST_TENANT_MEMBERS, CREATE_INVITATION, ROTATE_INVITATION, CANCEL_INVITATION, FIND_INVITATION, ACCEPT_INVITATION`
- DTO(`dto/invite.dto.ts` 신규): AdminCreateTenantRequest/Response, TenantMemberRow, TenantInviteRow, ListTenantMembersResponse, InviteMembersRequest/Response, ResendInviteRequest, CancelInvitationRequest, InviteInfoResponse, AcceptInviteRequest/Response(+RPC 용 CreateInvitationRequest/AcceptInvitationRequest/AcceptInvitationResult)
- 검증: `pnpm --filter @lawai/contracts build` / 커밋 `feat: 온보딩 계약 추가 (초대 DTO/패턴)`

### Task 2: prisma — Invitation 모델 + 마이그레이션
- 스펙 §1 모델 그대로 + Tenant 에 `invitations Invitation[]` 역참조. migration SQL 수기(`20260910010000_add_invitation`): CREATE TABLE + 인덱스 + FK. `prisma format/validate/generate`. ERD 보류 기록. 커밋 `feat: Invitation 모델 추가`

### Task 3: user-service — invitations 모듈 + 멤버 목록 + 테넌트 생성 (TDD)
- `src/invitations/`(module/controller/service+spec): create/rotate/cancel(tenantScope+권한 role 전달분 검사)/findValid(tokenHash)/accept($transaction: 소비→기존User분기→User·UserTenant 생성)
- tenants.service: `createTenant({name, plan, status, trialEndsAt})`, `listMembers(tenantContext)` — UserTenant+User 조인 + 유효 초대 목록
- app.module 에 InvitationsModule 등록. jest 통과 후 커밋 `feat: 초대 저장·소비 RPC + 멤버 목록/테넌트 생성`

### Task 4: auth-service — 초대 발급·수락 흐름 (TDD)
- MailService.sendInviteLink(email, link, tenantName)
- auth.service: `adminCreateTenant`(CREATE_TENANT→초대 발급), `inviteMembers`(권한 검사→스킵 규칙→다건 발급), `resendInvite`(권한→ROTATE→재메일), `getInvite`(FIND_INVITATION→무효 400), `acceptInvite`(hash→ACCEPT_INVITATION→신규면 buildResult 토큰/기존이면 existingUser)
- controller 패턴 5개. jest 통과 후 커밋 `feat: 초대 발급·수락 인증 흐름`

### Task 5: gateway — 엔드포인트
- admin.controller: `POST /admin/tenants`(authClient 로 ADMIN_CREATE_TENANT, actorId 주입)
- 신규 tenant-members.controller(또는 auth.controller 확장): `GET /tenants/members`(userClient+tenantContext), `POST /tenants/invites`·`POST /tenants/invites/:id/resend`(authClient, sub/activeTenantId/activeRole/isSystemAdmin 주입), `DELETE /tenants/invites/:id`(userClient+tenantContext+inviterRole)
- public auth.controller: `GET /auth/invites/:token`, `POST /auth/invites/accept`
- 빌드+기존 테스트 통과 후 커밋 `feat: gateway 온보딩 엔드포인트`

### Task 6: admin 프론트 — "+ 고객사 추가" 모달
- api/adminTenants.ts 에 `createAdminTenant`. TenantListPage 헤더 버튼 + 모달(이름/요금제/시작상태/체험판 만료(기본 30일)/담당자 이메일) → 성공 시 목록 invalidate. 빌드 검증 후 커밋 `feat: admin 고객사 추가 모달`

### Task 7: web — 멤버 관리 페이지
- api/members.ts(4개 함수)+테스트, `useMembers` 훅, `pages/members/MembersPage`(+css.ts): 멤버 표 + 초대 대기 표(재발송/취소) + 초대 모달(이메일 textarea 다건 + 역할 Dropdown, react-hook-form)
- Sidebar "관리" 섹션에 "멤버 관리"(/members), routes.tsx 추가. 테스트+커밋 `feat: 멤버 관리 화면`

### Task 8: web — 초대 수락 페이지
- api/auth.ts 에 `getInviteInfo`/`acceptInvite`+테스트, `pages/login/InviteAcceptPage`(AuthLayout, 공개 라우트 `/invite`): 초대 카드 + 이름/비밀번호/확인(react-hook-form+zod) → 신규: setTokens+`/` / 기존: 안내+로그인 링크 / 무효: 에러 카드. 페이지 테스트+커밋 `feat: 초대 수락 가입 화면`

### Task 9: 전체 검증
- `pnpm turbo lint build test` 전체 PASS, web 훅 차단 규칙 준수 확인, PR 생성(베이스 feat/admin-tenant-management — 스택).

## Self-Review 결과
- 스펙 §1(T2) §2.1(T4/T5/T6) §2.2(T3/T4/T5/T7) §2.3(T3/T4/T5/T8) §4(T3/T4/T7/T8/T9) 매핑 완료. 인터페이스 명칭은 T1 계약이 단일 출처 — 실행 중 diff 로 고정.
