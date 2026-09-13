# 범용 결재(Approval) 모듈 + 계약 체결 품의 — 설계 문서

날짜: 2026-09-12
상태: 승인됨 (시안: `approval-process-mockup.html`)

## 1. 목표

계약 프로세스의 `reviewDone → signing` 구간을 실동작 결재로 채운다. 결재는 계약 전용이 아니라 **범용 모듈(B안)** 로 만들어, 추후 체결계약·자문·송무 등 다른 도메인도 같은 결재선/대기함/알림을 재사용한다.

## 2. 확정 요구사항

| 항목 | 결정 |
|---|---|
| 아키텍처 | B안 — user-service 내 `approvals` 모듈 신설, 폴리모픽 `(targetType, targetId)` 참조. 지금은 `"contract"`만 |
| 범위 | 계약 상세 내 상신/승인/반려 + 결재 대기함 화면 + 인앱 알림 (전부) |
| 진행 규칙 | 순차 단일 흐름 — `stepOrder` 순서대로 한 명씩. 결재(approve)·합의(agree)는 승인 필요, 참조(refer)는 상신 시 알림만 |
| 반려 시 | 계약 `signing → reviewDone` 복귀 (전이맵에 추가). 결재선은 반려 이력으로 보존 |
| 상신 주체 | 계약 요청자 본인(`createdById`) — 상태 `reviewDone` + 결재선 비어있지 않을 때만. 별도 RPC로 처리(일반 updateStatus 권한 경로와 분리) |
| 승인 완료 후 | 계약은 `signing` 유지 — 날인(`signing→signed`)은 다음 조각(sealManager 체결 처리) |
| 라인 생성 시점 | **상신 시점에만** 라인 생성. 상신 전 결재선은 계약 데이터(details JSONB `approvers`)로만 존재. 반려 후 재상신하면 새 라인 생성(이전 라인 = 이력) |
| AI | 1차: **규칙 기반 상신 사전점검**(결재선 유무·필수 첨부·금액별 결재선 규정)만 실구현. AI 품의 요약·결재 브리핑·의견 초안은 시안만(LLM 연동 후속) |

## 3. 도메인 경계

- **approvals 모듈은 대상 도메인을 모른다.** 전이맵·계약 권한·화면 경로를 전혀 참조하지 않는다.
- **상신은 대상 도메인이 주도**: `contracts.service.submitApproval()`이 요청자·상태·결재선 검증 후 `approvals.service.submit()` 호출 + 상태 전이(`reviewDone→signing`) + 참조자 알림.
- **결과는 핸들러 등록으로 역전파**: approvals 모듈이 정의하는 인터페이스를 대상 도메인이 DI 로 등록.

```ts
// approvals/approval-outcome.ts
export interface ApprovalOutcomeHandler {
  targetType: string; // "contract"
  onApproved(line: ApprovalLineSnapshot): Promise<void>;
  onRejected(line: ApprovalLineSnapshot, rejectedStep: ApprovalStepSnapshot): Promise<void>;
}
export const APPROVAL_OUTCOME_HANDLERS = Symbol("APPROVAL_OUTCOME_HANDLERS");
```

- contracts 모듈이 `ContractApprovalOutcomeHandler`를 등록: `onRejected` → 계약 `signing→reviewDone` + 상신자 알림, `onApproved` → 상신자 알림(계약 상태 유지).
- 새 도메인(자문·송무 등)은 ① 자기 상세 화면에서 submit 호출 ② 핸들러 등록, 두 가지만 하면 결재가 붙는다. 상신(결재 생성)은 항상 대상 도메인 화면에서만 — 대기함은 처리 전용.

## 4. 데이터 모델 (Prisma, `shared` 스키마)

기존 `ApprovalLine`/`ApprovalStep`을 폴리모픽으로 개조한다. dev 데이터 폐기 허용(마이그레이션 reset 가능).

```prisma
model ApprovalLine {
  id            String         @id @default(uuid())
  targetType    String         // "contract"
  targetId      String
  title         String         // 대기함 표시용 스냅샷
  status        ApprovalStatus @default(pending)
  tenantId      String         // 상신 시점 스냅샷 — 대기함 테넌트 격리 + 알림 생성용
  submittedById String         // FK → users.User
  submittedAt   DateTime       @default(now())
  decidedAt     DateTime?      // 최종 승인/반려 확정 시각
  createdAt     DateTime       @default(now())

  submittedBy User           @relation("submittedApprovalLines", fields: [submittedById], references: [id])
  steps       ApprovalStep[]

  @@index([targetType, targetId])
  @@index([status])
  @@schema("shared")
}

model ApprovalStep {
  id        String       @id @default(uuid())
  lineId    String
  stepOrder Int
  userId    String?      // FK → users.User. 기안/참조 포함. null = 사용자 미연결 스냅샷(과거 데이터 호환)
  name      String       // 표시 스냅샷 유지
  dept      String
  type      ApproverType // draft | approve | agree | refer
  status    StepStatus   @default(pending)
  comment   String?      // 승인/반려 의견
  decidedAt DateTime?

  line ApprovalLine @relation(fields: [lineId], references: [id], onDelete: Cascade)
  user User?        @relation("approvalSteps", fields: [userId], references: [id])

  @@index([lineId])
  @@index([userId, status])
  @@schema("shared")
}
```

- `Contract.approvalLines` relation 제거. 계약의 라인은 approvals 서비스가 `(targetType:"contract", targetId)` 로 조회.
- 상신 전 결재선(예정): `Contract.details`(JSONB) 안에 `approvers: PlannedApprover[]` (`{ userId, name, dept, type }`) 로 저장. `ApproverSnapshot` DTO 에 `userId?: string` 추가.
- 활성 라인 = 해당 target 의 `submittedAt` 최신 라인. `pending` 라인은 target 당 최대 1개(상신 시 pending 라인 존재하면 409).
- 파생 규칙: **현재 차례** = `stepOrder` 순으로 정렬한 approve/agree 스텝 중 첫 `pending`. draft 스텝은 상신 시 `approved` 로 생성. refer 스텝은 승인 대상 아님(항상 `pending` 유지, 표시용).
- 라인 확정: 어느 approve/agree 스텝이 `rejected` → 라인 `rejected`. 전부 `approved` → 라인 `approved`. 확정 시 `decidedAt` 기록 후 outcome 핸들러 호출.

## 5. API

### packages/contracts

```ts
export const APPROVAL_PATTERNS = {
  DECIDE: "approval.decide",        // 승인/반려 (내 차례 검증)
  INBOX: "approval.inbox",          // 내 차례 목록 + 처리한 결재
  GET_ACTIVE: "approval.getActive", // target 의 활성 라인 + 이력 개수
} as const;
// 상신은 계약 도메인 소유:
CONTRACT_PATTERNS.SUBMIT_APPROVAL = "contract.submitApproval";
```

`approval.dto.ts`: `ApprovalLineDto`(steps 포함, 현재 차례 stepId·내 차례 여부 파생 필드), `DecideApprovalRequest { lineId, decision: "approve"|"reject", comment?, viewerId, tenantContext }` — 처리 대상 스텝은 서버가 현재 차례로 파생(stepId 를 받지 않아 경합·위조 여지 제거), `ApprovalInboxRequest/Response { pending: InboxItem[], processed: InboxItem[] }`, `InboxItem { lineId, targetType, targetId, title, submittedBy{ id,name,dept }, myStepOrder, totalSteps, myType, submittedAt, status, myDecision? }`.

### user-service (approvals 모듈)

- `decide`: viewer 가 현재 차례 스텝의 `userId` 인지 검증(아니면 403/400) → 스텝 상태·comment·decidedAt 기록 → 다음 차례 알림(`approval_turn`) 또는 라인 확정 + outcome 핸들러 + 알림(`approval_completed`/`approval_rejected`). 테넌트 격리: 라인의 `tenantId` 스냅샷으로 inbox 를 현재 테넌트로 한정하고 알림 생성에 사용한다(`userId = viewer` 조건과 이중).
- `inbox`: `pending` = 내 userId 스텝이 현재 차례인 pending 라인들, `processed` = 내가 승인/반려한 스텝의 라인들(최근 30일).
- `getActive`: target 의 최신 라인 + `history: number`(이전 라인 수).
- `submit(input)`: (서비스 내부 API — RPC 아님) target/title/steps(PlannedApprover[])/submittedBy 받아 라인 생성, draft 스텝 approved 처리, 첫 차례 `approval_turn` + refer `approval_referred` 알림 생성.

### user-service (contracts 모듈)

- `contract.submitApproval { id, viewerId, tenantContext }`: 검증(요청자 본인 + `reviewDone` + `details.approvers` 비어있지 않음 + pending 라인 없음) → `approvals.submit()` → 상태 `signing` 전이(감사로그 기존 경로) → 응답으로 갱신된 계약.
- `ALLOWED_TRANSITIONS` 에 `signing → reviewDone` 추가(반려 복귀용 — outcome 핸들러 내부 전이만 사용, 사용자 updateStatus 로는 기존 authz 대로).
- `contract.get` 응답: `approvalLine` 필드를 approvals 조회로 대체(활성 라인), `plannedApprovers`(details.approvers) 추가. 기존 프론트 `approvalLine` shape 호환 유지.
- create/update 에서 `approvalLines` 생성/재생성 로직 제거 → `details.approvers` 저장으로 대체.

### api-gateway

- `POST /contracts/:id/approval/submit` → `contract.submitApproval`
- `POST /approvals/:lineId/decide` (body: `{ decision, comment? }`) → `approval.decide`
- `GET /approvals/inbox` → `approval.inbox`

## 6. 알림

`NotificationService.createMany` 재사용. type 4종 — `approval_turn`(내 차례 도래), `approval_rejected`(상신자에게), `approval_completed`(상신자에게), `approval_referred`(참조자에게, 상신 시). `targetType: "ApprovalLine"`, `targetId: lineId`, `detail: { targetType, targetId, title }` 로 딥링크(계약이면 `/contract/:targetId`).

## 7. 프론트엔드 (apps/web)

- `api/approvals.ts`: `decideApproval`, `getApprovalInbox`. `api/contracts.ts`(기존 모듈)에 `submitContractApproval`.
- **결재 대기함** `pages/approval/ApprovalInboxPage.tsx` + `approvalInbox.css.ts`, 라우트 `/approvals/inbox`, 사이드바에 "결재 대기함" 메뉴(결재 그룹 없이 단일 항목, 기존 메뉴 패턴). 탭: 내 차례 / 처리한 결재 (예정·참조 탭은 후속). 행: 문서 제목(딥링크)·유형 배지("체결 품의")·상신자·내 단계 n/m·상신일·경과. 내 차례 행 라이브 펄스 점.
- **계약 상세** 변경:
  - 요청자 + `reviewDone`: 우측 검토 액션 카드가 상신 패널로 — 규칙 기반 사전점검 체크리스트(결재선 있음·계약서 파일 있음·연간 금액 1억 초과 시 재무(agree) 단계 포함 권고) + [체결 품의 상신] 버튼(사전점검 통과 시만 활성). 파생은 렌더 중 순수 계산(`getSubmitPrecheck.ts`).
  - `signing` + 내 차례: 결재 현황 카드에 내 차례 행 하이라이트 + 의견 입력 + [승인]/[반려] — 반려는 사유 모달(필수 아님) 후 확정. 승인/반려 후 계약 재조회.
  - 결재선 카드: 상신 전 = `plannedApprovers` (예정 라벨), 상신 후 = 활성 라인 스텝 + 진행 상태(`apvstat`) + 의견 표시.
  - 모션: 내 차례 스텝 번호·라이프사이클 현재 단계 펄스 링, 액션 박스 브리딩 글로우, `prefers-reduced-motion` 존중. vanilla-extract keyframes.
- **결재선 설정 모달**: `Approver` 타입에 `userId` 추가 — `ApprovalLineModal.apply` 가 `PersonRef.id` 를 보존(현재 버려짐). request-schema·toCreateRequest·toEditDefaults 반영.
- 스타일 전부 vanilla-extract + `themeVars`(신규 AI 토큰 불필요 — AI 요소는 이번 범위 제외).

## 8. 테스트

- **approvals.service.spec**: 순차 진행(앞 스텝 pending 이면 뒤 스텝 decide 403) / 내 차례 아님 403 / 승인 시 다음 차례 알림 / 마지막 승인 시 라인 approved + onApproved 호출 / 반려 시 라인 rejected + onRejected 호출 / refer 스텝 건너뜀 / inbox 내 차례·처리 목록.
- **contracts.service.spec 추가**: submitApproval — 요청자 아님 403 / reviewDone 아님 400 / 결재선 비어있음 400 / pending 라인 존재 409 / 성공 시 signing 전이 + 라인 생성 / outcome 반려 시 reviewDone 복귀.
- **프론트 vitest**: `getSubmitPrecheck` 규칙 / inbox 행 매퍼 / 상신 패널·결재 액션 렌더 분기(요청자/결재자/무관자) / 결재선 카드 예정·진행 표시.

## 9. 구현 순서 (플랜 문서에서 태스크화)

A. Prisma 스키마 + 마이그레이션 → B. contracts 패키지(DTO/패턴) → C. approvals 모듈(서비스+RPC+outcome 인터페이스) → D. contracts 통합(submitApproval·get 응답·생성경로 정리·핸들러) → E. gateway 엔드포인트 → F. 프론트 API/대기함 → G. 계약 상세 통합(상신/결재/결재선/모션) → H. 결재선 모달 userId 보존 → 테스트는 각 단계에 포함(TDD).

> DB 스키마 변경 시 CLAUDE.md 규칙에 따라 erdify MCP 로 "Law.ai Reboot" ERD 동기화 필요.
