# 계약서 검토 요청 화면 고도화 (B안: AI 우선 스마트 레일)

- 날짜: 2026-06-11
- 대상: `apps/web` — 계약서 검토 요청 화면 (`ContractRequestPage`)
- 방향: **B안 (AI 우선 · 스마트 사이드 레일)**
- 시안: `.superpowers/brainstorm/.../mockups-v2.html` (브라우저 시안, B 탭)

## 1. 배경 · 목표

현재 repo의 `ContractRequestPage.tsx`는 라이브(law365ai) 폼의 **축약판**이다. 실제 라이브 폼은 30여 개 필드(3단 계약분류, 협상력 슬라이더, 리치텍스트 에디터 4개, 다중 파일 업로드, 다수 검색형 셀렉트 등)를 평평하게 나열해 작성 부담과 진행 파악이 어렵다.

목표:
1. 라이브 폼 **전체 필드**를 반영하되, 흩어진 필드를 **5개 논리 그룹(섹션)**으로 묶어 위계를 세운다.
2. 우측에 **고정 스마트 레일**(작성 현황 / AI 사전점검 / 요청 요약 / 결재선)을 두어, 긴 폼에서 "어디까지 썼는지"와 제품의 AI 가치를 한눈에 보이게 한다.
3. 페이지 구성 컴포넌트는 **무조건 `@lawkit/ui`**를 사용한다. lawkit에 없는 것(리치텍스트 에디터)만 예외적으로 외부 도입한다.

## 2. 레이아웃 구조

2단 그리드: **좌측 폼 컬럼(1fr)** + **우측 스마트 레일(고정 폭, sticky)**.

```
[헤더: 계약 / 계약서 검토 요청            목록 · 임시저장 · 검토요청 등록]
┌───────────────────────────────┐  ┌──────────────────────┐
│ ① 계약 개요 (Card)             │  │ 작성 현황 (dark)      │ ← sticky
│ ② 계약서 · 첨부 (Card)         │  │ AI 사전 점검 (dark)   │
│ ③ 관계자 · 참조 (Card)         │  │ 요청 요약 (dark)      │
│ ④ 상세 조건 (Card)             │  │ 결재선 (dark)         │
│ ⑤ 상세 내용 (Card, 에디터 4개) │  └──────────────────────┘
└───────────────────────────────┘
```

- 모바일/좁은 폭에서는 레일이 폼 하단으로 흐르도록 1컬럼 폴백.
- 우측 레일은 **lawkit Card + 다크 커스텀 스타일**(navy 계열 토큰). lawkit Card는 다크 variant가 없으므로, vanilla-extract로 `className`을 입혀 처리한다. **새 색상값은 만들지 않고** `design/tokens.ts`의 기존 `navy / navyLine / navyText / navyMuted / navyFaint`만 사용한다.

## 3. 필드 인벤토리 · lawkit 컴포넌트 매핑

라이브 폼 전체 필드를 5개 그룹으로 재배치한다. 모든 입력은 `react-hook-form`의 `Controller`로 제어한다(lawkit Input은 ref 미전달 — `[[lawkit-ui-gotchas]]`).

### ① 계약 개요 (OverviewSection)
| 필드 | 필수 | lawkit 컴포넌트 |
|---|---|---|
| 계약 단계 (신규계약/변경·해지) | ● | `RadioGroup` |
| 보안여부 (극비/보안/일반) | | `ButtonGroup` (아이콘 포함 세그먼트, 단일 선택) |
| 계약명 | ● | `Input` |
| 검토 요청자 | ● | `AutoComplete` (사용자 검색, 기본=현재 사용자) |
| 계약서 유형 (일반 검토요청/표준계약서 계약체결) | ● | `RadioGroup` |
| 계약 분류 (당사자 / 대분류 / 중분류) | ● | `Dropdown` × 3 (단계적 cascade) |
| 계약 기간 | | `DateRangePicker` + `Checkbox`(직접 입력 / 계약 종료일 없음) |
| 상대 계약자 정보 | ● | `AutoComplete`(회사명) + `Button`(신규 추가 → `Modal`) |

### ② 계약서 · 첨부 (DocsSection)
| 필드 | 필수 | lawkit 컴포넌트 |
|---|---|---|
| 안내 문구 | | `Alert type="info"` (lawkit Alert에 success 없음 — info 사용) |
| 계약서 (워드 권장) | ● | `FileUploadArea` + `FileItem`/`FileAttachBadge` |
| 첨부 / 별첨 | | `FileUploadArea` |
| 참고서류 | | `FileUploadArea` |
| 표준계약서 양식 보기 | | `Button` → `Modal` |
| 관련문서 찾아보기 | | `Button` → `Modal` |

> 카드 내 인라인 "AI 사전 점검 결과" 블록은 B안에서는 **노출하지 않는다**(우측 레일이 담당). 추후 토글로 재노출 가능하도록 구조만 분리.

### ③ 관계자 · 참조 (PeopleSection)
| 필드 | lawkit 컴포넌트 |
|---|---|
| 참조수신자 (다중) | `MultiSelect` |
| 참조수신자(부서) (다중) | `MultiSelect` + `ChipsNavigation`(개발팀/운영팀/인프라팀 빠른선택) |
| 참조수신자(비밀) (다중) | `MultiSelect` |
| 업무담당자 (단일) | `AutoComplete` |
| 관련 프로젝트 (단일) | `Dropdown` |
| 관련문서 | `Button`(찾아보기) → `Modal` |

### ④ 상세 조건 (TermsSection)
| 필드 | 필수 | lawkit 컴포넌트 |
|---|---|---|
| 계약 언어 (국문/영문/국영/기타) | | `RadioGroup` |
| 법무 분류 (국내/해외) | | `RadioGroup` |
| 계약예정일 | | `DatePicker` |
| 계약상대방 협상력 (0~100%) | | `Slider` |
| 계약 규모(대가) | ● | `Dropdown`(부가세) + `NumberInput`(금액) + `Dropdown`(통화) + `Button`(추가하기, 반복행) + `Alert`(안내) + `Input`(보조 메모) |

### ⑤ 상세 내용 (ContentSection)
| 필드 | 필수 | 컴포넌트 |
|---|---|---|
| 계약 지급 조건 | | **TipTap** RichTextEditor |
| 계약의 배경 및 목적 | ● | **TipTap** RichTextEditor |
| 주요 협의사항 | | **TipTap** RichTextEditor |
| 요청부서의 우려사항 및 기타 고려사항 | | **TipTap** RichTextEditor |
| 기타 URL | | `Input` 반복행 + `Button`(추가) |

> **TipTap**은 lawkit에 에디터가 없어 도입하는 유일한 외부 의존성이다. 4곳에서 재사용하도록 `RichTextEditor` 래퍼 컴포넌트 1개로 캡슐화하고, 툴바/스타일은 lawkit 토큰에 맞춘다.

## 4. 우측 스마트 레일 (4개 패널, 모두 다크)

1. **작성 현황 (ProgressPanel)** — `ProgressBar`(전체 %) + 섹션별 상태 리스트(완료/진행중/미작성, 남은 필수 개수). 클릭 시 해당 섹션으로 스크롤 점프. 상태는 폼 값에서 파생(`deriveSectionStatus`).
2. **AI 사전 점검 (AiPrecheckPanel)** — **mock 데이터**. 첨부 여부에 따라 빈 상태 ↔ 리스크 카드(고위험/주의) 표시. 실제 분석 API는 범위 밖.
3. **요청 요약 (RequestSummaryPanel)** — 핵심 값(단계/유형/요청자/계약서/AI) 실시간 KV 표시.
4. **결재선 (ApprovalLinePanel)** — 기안자(현재 사용자) 1명 기본 + "+ 결재자 추가"(`Modal`로 결재자 선택). `Avatar` 사용.

## 5. 폼 상태 · 검증

- 복잡/대형 폼이므로 **react-hook-form + zod** 사용(`[[form-handling-convention]]`). 현행 구조 유지·확장.
- `request-schema.ts`를 전체 필드 기준으로 대폭 확장(zod 스키마 + 기본값). 파일 첨부/반복행(계약규모, 기타 URL)은 배열 필드로 모델링.
- 필수 표시는 라이브와 동일하게 **파란 점(•)** 규칙.
- 검증 실패 시 필드 하단 에러 + 작성 현황 패널에 "남은 필수" 반영.

## 6. 파일 구조 (apps/web 컨벤션)

폴더 camelCase, 컴포넌트 PascalCase, 일반 ts camelCase. 신규 스타일은 **vanilla-extract**(`.css.ts`) + 디자인 토큰(인라인 스타일 금지 — 신규 코드 기준).

```
apps/web/src/pages/contract/
  ContractRequestPage.tsx        # 오케스트레이션 + 2단 레이아웃
  request-schema.ts              # (확장) zod 스키마 + 기본값
  contractRequest.css.ts         # (신규) 레이아웃 + 다크 레일 스타일(navy 토큰)
  sections/
    OverviewSection.tsx
    DocsSection.tsx
    PeopleSection.tsx
    TermsSection.tsx
    ContentSection.tsx
  rail/
    ProgressPanel.tsx
    AiPrecheckPanel.tsx
    RequestSummaryPanel.tsx
    ApprovalLinePanel.tsx
  sectionStatus.ts               # (신규) deriveSectionStatus(values)
  mock-data.ts                   # (확장) mock AI precheck 데이터
components/ui/
  RichTextEditor.tsx             # (신규) TipTap 래퍼, 4곳 재사용
```

각 Section/Panel은 RHF `control`(또는 `useFormContext`)만 받아 독립적으로 렌더·테스트 가능하도록 경계를 둔다.

## 7. 테스트

- Vitest + React Testing Library(기존 `test-setup.ts`/`*.test.tsx` 패턴).
- `ContractRequestPage.test.tsx` 확장: 필수 미입력 시 제출 차단·에러 노출, 제출 성공 시 라우팅, 섹션 상태 파생(`sectionStatus.ts` 단위 테스트), 파일 첨부 시 AI 패널 상태 전환(mock), 결재자 추가.

## 8. 범위 밖 (Out of Scope)

- 실제 AI 분석 API 연동(현재 mock).
- 실제 제출/저장 백엔드 API(현행처럼 상세 화면으로 라우팅하는 샘플 유지).
- **Prisma 스키마 변경 없음** → "Law.ai Reboot" ERD 동기화 불필요(`[[erdify-erd-sync]]`).
- 기존 인라인 스타일 코드의 일괄 vanilla-extract 마이그레이션(별도 작업).

## 9. lawkit 관련 메모

- 페이지 구성은 **무조건 lawkit**(`[[lawkit-mandatory]]`). 외부 도입은 TipTap(에디터) 단 하나.
- Alert에 `success` 없음 → `info` 사용. Input은 ref 미전달 → `Controller`로 제어(`[[lawkit-ui-gotchas]]`).
- Card 다크 variant 없음 → vanilla-extract className + navy 토큰으로 처리(새 색상값 도입 금지).
