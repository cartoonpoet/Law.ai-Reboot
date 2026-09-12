# 계약 체결(Signing) 설계

> 시안 정본: `contract-signing-mockup.html` (레포 루트). 3개 탭 = 이 스펙의 3개 표면.

## 1. 배경 · 문제

계약 라이프사이클에서 **체결 단계가 비어 있다.**

1. **검토를 거친 계약**: 결재선이 전원 승인돼도 `signing → signed` 로 넘길 **액션이 어디에도 없다.**
   `contracts.authz.ts` 는 `sealManager` 에게 이 전이 권한을 이미 주고 있고
   `ALLOWED_TRANSITIONS.signing` 에도 `"signed"` 가 있는데, 이를 호출하는 UI·RPC 가 없다.
   실제 화면 확인 결과 `signing` 상태의 계약 상세는 "체결 품의의 결재가 진행 중입니다" 안내만 띄운다.

2. **이미 체결된 계약**: 검토가 필요 없는 계약(이미 서명 완료)을 등록할 방법이 없다.
   사이드바의 `체결 계약 조회`(`/contract/signed`) · `체결계약 만료 현황`(`/contract/expire`) 는
   둘 다 `ContractPlaceholderPage` 인 **빈 껍데기**다.

3. **체결·종료 계약이 목록에서 안 걸러진다**: 행 자체는 이미 표시된다
   (`CONTRACT_STATUS_LABEL` 에 10종 전부 정의됨). 문제는 `CONTRACT_STATUS_FILTERS` 가
   검토 4단계(`unassigned/legalReview/requesterReview/reviewDone`)만 담고 있어 **필터로 좁힐 수 없다**는 것.

## 2. 방침 — 별도 기능을 만들지 않는다

"체결 계약"을 별도 도메인·화면·테이블로 만들지 않는다. **기존 3개 화면을 확장**한다.

| 표면 | 기존 | 변경 |
| --- | --- | --- |
| `/contract/request` | 계약서 검토 요청 폼 | **등록 유형** 분기 추가 (검토 요청 / 체결 완료 등록) |
| `/contract/list` | 계약서 검토 조회 | **계약 조회** 로 개명, 2단 상태 필터 + 체결일·만료 |
| `/contract/:id` | 계약 상세 | **체결 처리** 액션 패널 + 모달 |

사이드바의 `체결 계약 조회` · `체결계약 만료 현황` 두 메뉴와 두 라우트를 **제거**한다.

## 3. 데이터 모델

추가는 **두 개뿐**이다. 새 테이블 없음.

```prisma
model Contract {
  // ...기존 유지
  signedAt DateTime?   // 실제 서명 완료일. signed 상태 진입 시 확정.
}

enum FileRole {
  contract // 계약서(검토 대상)
  attach   // 첨부/별첨
  ref      // 참고서류
  signed   // 최종 서명본 ← 신규
  @@schema("shared")
}
```

**원 계약 연결은 새 필드를 만들지 않는다.** 기존 `details.relatedDocs`(관련문서)를 재사용한다.

## 4. 등록 유형 × 계약 단계

네 조합 모두 유효하므로 **계약 단계를 잠그지 않는다.** 이미 체결된 변경계약을 등록하는 것은 실제 업무다.
잠그면 사용자가 어쩔 수 없이 `신규계약` 으로 등록해 데이터가 오염된다.

달라지는 것은 **원 계약 연결의 강제 여부 하나**뿐이다.

| 계약 단계 | 등록 유형 | 원 계약(relatedDocs) | 비고 |
| --- | --- | --- | --- |
| 신규계약 | 법무 검토 요청 | 불필요 | 기존 흐름 그대로 |
| 신규계약 | 체결 완료 등록 | 불필요 | |
| 변경·해지 | 법무 검토 요청 | **권장**(선택) | 검토 과정에서 확인 가능 |
| 변경·해지 | 체결 완료 등록 | **필수** | 검토 단계가 없어 여기서 못 잡으면 영영 못 잡음 |

## 5. 백엔드

### 5.1 체결 완료 등록 (create 확장)

`CreateContractRequest` 에 두 필드를 추가한다.

```ts
registerAs?: "review" | "signed";  // 기본 "review" — 미지정 시 기존 동작과 완전히 동일
signedAt?: string | null;          // registerAs="signed" 일 때 필수(ISO 8601)
```

`registerAs === "signed"` 일 때 `create()` 의 동작 차이:

1. **검증**(모두 `RpcException status 400`)
   - `signedAt` 누락 → `"체결일을 입력하세요"`
   - `files` 에 `role === "signed"` 항목 없음 → `"최종 서명본을 첨부하세요"`
   - `details.stage === "change"` 인데 `details.relatedDocs` 가 비어 있음 → `"변경·해지 계약은 원 계약을 연결해야 합니다"`
2. **상태**: `status: "signed"` 로 생성 (기본값 `unassigned` 대신). `signedAt` 저장.
3. **결재선**: 생성하지 않는다. `details.approvers` 는 그대로 보관하되 라인은 만들지 않는다
   (기존 create 도 라인을 만들지 않으므로 **코드 변경 없음** — 상신 시에만 생성).
4. **AI 트리거**: `precheck` 대신 `risk` 를 트리거한다. 트리거 조건의 파일 역할도
   `role === "contract"` → `role === "signed"` 로 바뀐다.

`registerAs` 가 `"review"` 이거나 없으면 **기존 경로를 한 줄도 바꾸지 않는다.**

### 5.2 체결 처리 (신규 RPC `contract.completeSigning`)

```ts
export interface CompleteSigningRequest {
  contractId: string;
  viewerId: string;          // gateway 가 JWT sub 주입
  signedAt: string;          // ISO 8601
  fileId?: string | null;    // 사전 업로드된 서명본 File.id (있으면 role 을 signed 로 승격)
  note?: string | null;      // 비고 — 감사 로그에만 기록
  tenantContext?: TenantContext;
}
export interface CompleteSigningResult {
  contract: ContractResponse;
}
```

패턴: `CONTRACT_PATTERNS.completeSigning = "contract.completeSigning"`

처리 순서(**이 순서를 지켜야 한다** — 권한·게이트를 통과하기 전에 어떤 쓰기도 하지 않는다):

1. 테넌트 스코프로 계약 조회. 없으면 `404 "계약을 찾을 수 없습니다"`.
2. `loadViewer` → `evaluate(viewer, contract)`.
   `canTransition` 이 false 면 `403 "체결 처리 권한이 없습니다"`.
   (`sealManager` 는 `status === "signing"` 일 때만 true 이므로 상태 가드가 겸해진다.)
3. `status !== "signing"` 이면 `400 "체결 진행 상태가 아닙니다"`.
4. **결재 완료 게이트**: `approvals.getActive("contract", contractId)` 의
   `line.status !== "approved"` 면 `400 "결재가 완료되지 않았습니다"`.
   라인 자체가 없으면(`line === null`) 같은 400. — 결재 없이 체결되는 경로를 막는다.
5. 한 트랜잭션에서:
   - `fileId` 가 있으면 그 File 이 **이 계약 소유**인지 확인 후 `role: "signed"` 로 갱신.
     남의 계약 파일이면 `400 "잘못된 파일입니다"`.
   - `contract.update({ status: "signed", signedAt })`
6. 감사 로그. 기존 상태 전이와 **같은 형태**를 쓴다(`submitApproval` 선례 참조):
   ```ts
   await this.audit.record({
     action: "transition",
     targetType: "Contract", targetId: row.id,
     actorId: req.viewerId, tenantId: row.tenantId,
     detail: { kind: "completeSigning", from: "signing", to: "signed", note: req.note ?? null },
   });
   ```
7. `toResponse(row)` 반환.

참고 — 기존 헬퍼를 그대로 쓴다: 조회자 로딩은 `this.loadViewer(req.viewerId, ctx)`,
권한 평가는 `evaluate(viewer, this.toAuthzContract(row))`. 파일 소유 검증은 `File.contractId === contractId`.

`ALLOWED_TRANSITIONS` 는 이미 `signing: ["signed", "reviewDone"]` 이므로 **수정 불필요**.

### 5.3 게이트웨이

```
POST /contracts/:id/complete-signing
```
바디 `{ signedAt, fileId?, note? }`. `viewerId` 는 JWT `sub`, `tenantContext` 는 기존 방식대로 주입.
`firstValueFrom(...).pipe(rpcToHttp())` 패턴 준수.

`ContractResponse` 에 `signedAt: string | null` 를 추가한다.

## 6. 프론트엔드

### 6.1 요청 폼 (`/contract/request`)

`contractRequestSchema` 추가 필드:
```ts
registerAs: z.enum(["review", "signed"]),   // 기본 "review"
signedAt: z.string(),                        // 기본 ""
```
`signedFiles: z.array(uploadedFileSchema)` 를 추가한다(`contractFiles` 와 분리).

zod `superRefine` 로 교차 검증:
- `registerAs === "signed"` → `signedAt` 비어 있으면 오류, `signedFiles` 비어 있으면 오류
- `registerAs === "signed" && stage === "change"` → `relatedDocs` 비어 있으면 오류
- `registerAs === "signed"` 일 때 `contractFiles` 는 **필수 아님** (기존 `.min(1)` 을 조건부로)
- `registerAs === "review"` 일 때는 기존 규칙 그대로

UI(`OverviewSection`):
- 섹션 ① 맨 위에 **등록 유형** `ButtonGroup` (법무 검토 요청 / 체결 완료 등록) — 시안의 강조 박스
- `registerAs === "signed"` → 안내 Callout, `체결일` 필드 노출, `검토 요청자`·`계약서 유형` 숨김
- `stage === "change"` → `원 계약` 필드 노출(`relatedDocs` 재사용, `RelatedDocsModal` 연결).
  `registerAs === "signed"` 면 필수 표시 + 경고 배경

`DocsSection`: `registerAs === "signed"` → `계약서` 대신 `최종 서명본`(role `signed`) 업로드

`toCreateRequest.ts`: `registerAs`, `signedAt` 전달, `signedFiles` 를 `role: "signed"` 로 매핑

페이지 헤더·제출 버튼 문구도 모드에 따라 바뀐다
(`계약서 검토 요청`/`검토요청 등록` ↔ `체결 계약 등록`, 변경·해지+체결이면 `체결 변경계약 등록`).

### 6.2 계약 조회 (`/contract/list`)

**상태 필터를 2단으로.** 칩 한 줄에 상태를 전부 나열하면 상태가 늘 때마다 줄이 터진다(현재 10종).

1단 **단계 그룹** — 라이프사이클이라 개수가 고정이다.
```ts
const STATUS_GROUPS = {
  all:    [],
  review: ["draft","unassigned","assigning","legalReview","requesterReview","reviewDone"],
  sign:   ["signing","signed"],
  fulfil: ["fulfilling"],
  closed: ["closed"],
} as const;
```
2단 **세부 상태** — 선택한 그룹의 상태만 칩으로 노출한다. `all` 이면 2단 줄을 숨긴다.
상태를 추가해도 해당 그룹 안에만 들어가므로 한 줄을 넘지 않는다(검토 그룹 6개가 최대).

**만료는 상태가 아니라 날짜 축**이므로 칩에서 분리해 필터 행 드롭다운으로 둔다:
`만료 전체 / 90일 이내 / 180일 이내 / 만료됨`. 상태와 **조합**이 가능해진다(예: 체결 완료 + 90일 이내).
이 드롭다운이 `체결계약 만료 현황` 메뉴를 대체한다.

컬럼: 기존 10종 + **체결일**(`signedAt`, 없으면 `—`). `검토기한` 컬럼은 체결 후에는 만료일 기준 D-day를 보여준다.

페이지 제목 `계약서 검토 조회` → **`계약 조회`**.

### 6.3 계약 상세 (`/contract/:id`)

`getActionView.ts` 의 `signing` 분기를 확장한다. 현재는 읽기 전용 안내 + `buttons: []`.

- `can.transition && approvalLine?.status === "approved"` → **체결 처리** 버튼 노출
- 그 외 `signing` → 기존 안내 유지

우측 레일에 액션 패널(시안의 `.actpanel` — 성공색 테두리 + `prefers-reduced-motion` 존중 글로우).
버튼 → `CompleteSigningModal`: 최종 서명본 업로드(기존 `useFileUpload` 재사용) + 체결일 + 비고.

`진행 정보`에 `체결일` 행을 추가한다(미등록이면 흐리게).

### 6.4 셸

- `Sidebar`: `c-signed`, `c-expire` 항목 제거. `c-list` 라벨 `계약서 검토 조회` → `계약 조회`
- `routes.tsx`: `/contract/signed`, `/contract/expire` 라우트 제거

## 7. 테스트

- **user-service**: `completeSigning` — 권한 없음(403), 상태 불일치(400), 결재 미완료(400),
  라인 없음(400), 남의 계약 파일(400), 정상(상태·signedAt·파일 role 갱신) / `create` 의
  `registerAs="signed"` 검증 3종 + 정상 경로(상태 signed, risk 트리거)
- **web**: `getActionView` 의 signing 분기(결재 완료 여부에 따른 버튼 유무),
  `request-schema` superRefine 4케이스, 목록 2단 필터의 그룹→세부 매핑
- **회귀**: `registerAs` 미지정 시 기존 create 동작이 그대로인지

## 8. 범위 밖

- 전자서명 연동(ESign) — 사용자 방침상 항상 마지막 순서
- `fulfilling`/`closed` 로의 전이 UI — 이번 범위는 `signed` 진입까지
- 체결 후 계약 변경 이력 추적 — 원 계약 연결은 참조만, 버전 트리는 만들지 않는다
