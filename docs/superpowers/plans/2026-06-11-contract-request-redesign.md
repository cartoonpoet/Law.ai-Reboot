# 계약서 검토 요청 화면 고도화 (B안) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 라이브 폼 전체 필드를 5개 그룹 카드로 재구성하고, 우측에 고정 다크 스마트 레일(작성현황·AI사전점검·요청요약·결재선)을 둔 "AI 우선" 계약서 검토 요청 화면을 `apps/web`에 구현한다.

**Architecture:** 단일 `ContractRequestPage`가 react-hook-form `FormProvider`로 폼 상태를 소유하고, 좌측 5개 Section / 우측 4개 Panel 컴포넌트가 `useFormContext`로 값을 읽는다. 페이지 구성 컴포넌트는 전부 `@lawkit/ui`, 리치텍스트만 TipTap. 스타일은 신규 도입한 vanilla-extract(`.css.ts`) + 기존 `design/tokens.ts`의 `T` 값.

**Tech Stack:** React 19, react-hook-form 7 + zod 4, @lawkit/ui 0.1.41, @tiptap/react, @vanilla-extract/css + vite-plugin, Vitest + Testing Library.

---

## 시작 전 참고 (executor)

- 테스트 실행: `cd apps/web && pnpm test` (vitest run). 단일 파일: `pnpm test -- src/pages/contract/<file>`.
- lawkit 컴포넌트 props는 `apps/web/node_modules/@lawkit/ui/dist/ui-v3/src/components/<Name>/index.d.ts`에서 확인. 본 계획의 코드는 검증된 시그니처 기준이며, 아래 3개는 정확한 shape를 해당 d.ts에서 한 번 더 확인할 것: `DateRangePicker`의 `onChange(range)` 필드명, `RadioGroup`/`Radio` children 형태, `ProgressBar`의 value prop.
- lawkit 주의: `Alert`에 `success` 없음(`info` 사용). `Input` 등은 ref 미전달 → 반드시 `Controller`로 제어.
- 옵션 목록(당사자/대분류 등)은 `apps/web/src/pages/contract/mock-data.ts`의 `LIST_FILTERS` 재사용.
- 커밋 컨벤션: `<type>: <내용>`, 이모지 금지.

## 디자인 토큰 (필수)

스타일은 **lawkit 디자인 토큰(`themeVars`)을 기본으로** 사용한다. 로컬 `design/tokens.ts`의 `T`(하드코딩 hex)나 임의 색상값을 신규 코드에 쓰지 않는다(`lightThemeClass`는 이미 `main.tsx` 루트에 적용됨).

- import: `import { themeVars } from "@lawkit/ui";` — `.css.ts`와 인라인 `style` 모두 var() 문자열이라 그대로 사용.
- **본 계획의 모든 코드 블록에서 `T.x`는 아래 매핑의 `themeVars` 값으로 치환**해 작성한다. `import { T } from ".../tokens"`는 쓰지 않는다.

| 기존 `T.*` | lawkit `themeVars.*` |
|---|---|
| primary | color.accentPrimary |
| primaryDark | color.accentPrimaryActive |
| primarySoft / primaryTint | color.accentPrimary (투명도 필요 시 sprinkles/rgba 대신 토큰 우선, 없으면 질문) |
| success | color.accentSuccess |
| danger | color.accentDanger |
| warning / warningDark | color.accentWarning |
| info | color.accentInfo |
| heading | color.textHeading |
| body | color.textPrimary |
| muted | color.textSecondary |
| faint | color.textMuted |
| surface | color.neutralSurface |
| surfaceAlt | color.neutralSurfaceAlt |
| border | color.neutralBorder |
| borderStrong | color.neutralBorderStrong |
| radius | radius.md |
| shadowCard | shadow.raised |

**다크 스마트 레일:** lawkit엔 다크 테마 클래스가 없으므로 `createLdsThemeVars`로 다크 변수 객체를 만들어 레일 래퍼 `style`에 적용한다. 그러면 레일 내부의 모든 lawkit 컴포넌트와 `themeVars.*`가 다크로 resolve된다. `contractTheme.ts`(Task 5)에 정의:

```ts
import { createLdsThemeVars } from "@lawkit/ui";

export const darkRailVars = createLdsThemeVars({
  color: {
    neutralBackground: "#0f1422",
    neutralSurface: "#141a2b",
    neutralSurfaceAlt: "#1c2438",
    neutralSurfaceRaised: "#1c2438",
    neutralBorder: "#252f4a",
    neutralBorderStrong: "#252f4a",
    textHeading: "#ffffff",
    textPrimary: "#c2cad8",
    textSecondary: "#c2cad8",
    textMuted: "#7a849a",
    textDisabled: "#4a5570",
  },
});
```

> 위 navy 오버라이드 값은 디자인 토큰 프리셋에 다크 surface가 없어 불가피하게 지정하는 값이며, lawkit 자체 테마 API(`createLdsThemeVars`)를 통해 주입한다. 레일 내부 컴포넌트는 `themeVars.color.textHeading`(→#fff), `themeVars.color.neutralSurface`(→navy) 등 **토큰만** 참조한다.

## 코드 구조 원칙 (필수)

프론트엔드는 **중앙집중식 관리 · 클린코드 · 단일책임원칙(SRP)** 을 기본으로 한다.

- **중앙집중:** 옵션/상수/타입은 흩어놓지 않고 한 곳에 모은다. 드롭다운·셀렉트 옵션 목록(사용자/부서/프로젝트/통화/VAT 등), enum 라벨 매핑, 섹션 메타는 모두 `pages/contract/contractOptions.ts`에 정의하고 각 섹션/패널이 import한다. **같은 배열을 두 파일에 복붙하지 않는다**(예: `USER_OPTIONS`는 Overview·People이 공유 import).
- **단일책임:** 한 파일/컴포넌트는 하나의 책임만. 섹션 컴포넌트는 "그 그룹의 필드 렌더"만, 레일 패널은 "그 패널 표시"만, `sectionStatus.ts`는 "상태 파생"만, `aiPrecheck.ts`는 "mock 데이터"만 담당. 페이지(`ContractRequestPage`)는 폼 소유 + 레이아웃 조립만(필드 JSX를 직접 들고 있지 않음).
- **클린코드:** 의미 있는 이름(`handle~`/`get~`/`create~`/`check~`, boolean은 `is/has`), 매직값 금지(상수화), 화살표 함수, `const`→`let` 순.
- 폼 값 접근은 `useFormContext`/`useWatch`로 통일(props drilling 금지). 폼 상태가 단일 소스(react-hook-form)로 중앙 관리됨.

> 본 계획 코드 블록에 인라인으로 정의된 `USER_OPTIONS`/`DEPT_CHIPS`/`PROJECTS` 등은 **`contractOptions.ts`로 옮겨 import**하는 형태로 구현한다(코드 블록은 가독성을 위해 인라인 표기).

## File Structure

```
apps/web/
  vite.config.ts                         # 수정: vanillaExtractPlugin 추가
  package.json                           # 수정: tiptap + vanilla-extract 의존성
  src/
    components/ui/RichTextEditor.tsx      # 신규: TipTap 래퍼(4곳 재사용)
    components/ui/RichTextEditor.css.ts   # 신규: 에디터 스타일
    pages/contract/
      request-schema.ts                   # 확장: 전체 필드 zod 스키마 + 기본값
      contractOptions.ts                  # 신규: 옵션/상수/라벨 중앙집중(USER/DEPT/PROJECT/VAT/통화 등)
      contractTheme.ts                    # 신규: darkRailVars(createLdsThemeVars 다크 오버라이드)
      sectionStatus.ts                    # 신규: deriveSectionStatus(values)
      sectionStatus.test.ts               # 신규: 단위 테스트
      contractRequest.css.ts              # 신규: 레이아웃 + 다크 레일 스타일
      aiPrecheck.ts                       # 신규: mock AI precheck 데이터/함수
      ContractRequestPage.tsx             # 재작성: FormProvider + 2단 레이아웃
      ContractRequestPage.test.tsx        # 확장: 검증/제출/상태
      sections/
        OverviewSection.tsx               # ① 계약 개요
        DocsSection.tsx                   # ② 계약서·첨부
        PeopleSection.tsx                 # ③ 관계자·참조
        TermsSection.tsx                  # ④ 상세 조건
        ContentSection.tsx                # ⑤ 상세 내용(에디터 4개)
      rail/
        SmartRail.tsx                     # 레일 컨테이너(sticky)
        ProgressPanel.tsx
        AiPrecheckPanel.tsx
        RequestSummaryPanel.tsx
        ApprovalLinePanel.tsx
```

---

## Task 1: 의존성 + vanilla-extract 빌드 설정

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`

- [ ] **Step 1: 의존성 설치**

```bash
cd apps/web
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/pm
pnpm add -D @vanilla-extract/css @vanilla-extract/vite-plugin
```

- [ ] **Step 2: vite.config.ts에 vanilla-extract 플러그인 추가**

`apps/web/vite.config.ts` 전체를 아래로 교체:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

- [ ] **Step 3: 빌드 동작 확인**

Run: `cd apps/web && pnpm build`
Expected: 타입체크 + vite 빌드 성공(에러 없음).

- [ ] **Step 4: 커밋**

```bash
git add apps/web/package.json apps/web/vite.config.ts ../../pnpm-lock.yaml
git commit -m "chore(web): TipTap·vanilla-extract 의존성 및 vite 플러그인 추가"
```

---

## Task 2: request-schema.ts 전체 필드 스키마

**Files:**
- Modify: `apps/web/src/pages/contract/request-schema.ts`
- Test: `apps/web/src/pages/contract/request-schema.test.ts` (신규)

- [ ] **Step 1: 실패 테스트 작성**

`request-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { contractRequestSchema, contractRequestDefaults } from "./request-schema";

describe("contractRequestSchema", () => {
  it("기본값은 필수 미충족이라 실패한다", () => {
    expect(contractRequestSchema.safeParse(contractRequestDefaults).success).toBe(false);
  });

  it("필수 필드를 채우면 통과한다", () => {
    const ok = {
      ...contractRequestDefaults,
      name: "SW 공급계약",
      requester: "jhson1",
      party: "(주)테크파트너스",
      catMajor: "IT·라이선스",
      catMinor: "소프트웨어",
      counterparty: "(주)테크파트너스",
      contractFiles: ["계약서.docx"],
      money: [{ vat: "excluded", amount: 1000, currency: "KRW" }],
      purpose: "<p>배경</p>",
    };
    expect(contractRequestSchema.safeParse(ok).success).toBe(true);
  });

  it("계약서 미첨부 시 contractFiles 에러", () => {
    const r = contractRequestSchema.safeParse(contractRequestDefaults);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "contractFiles")).toBe(true);
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/web && pnpm test -- src/pages/contract/request-schema`
Expected: FAIL (새 필드/타입 미정의).

- [ ] **Step 3: 스키마 구현**

`request-schema.ts` 전체 교체:

```ts
import { z } from "zod";

export const VAT_OPTIONS = [
  { value: "excluded", label: "부가가치세(10%) 별도" },
  { value: "included", label: "부가가치세(10%) 포함" },
  { value: "none", label: "부가가치세 없음" },
] as const;

export const CURRENCY_OPTIONS = [
  { value: "KRW", label: "[KRW] 한국" },
  { value: "USD", label: "[USD] 미국" },
  { value: "JPY", label: "[JPY] 일본" },
  { value: "EUR", label: "[EUR] 유럽" },
] as const;

export const moneyRowSchema = z.object({
  vat: z.enum(["excluded", "included", "none"]),
  amount: z.number().nonnegative().nullable(),
  currency: z.string(),
});

export const contractRequestSchema = z.object({
  // ① 계약 개요
  stage: z.enum(["new", "change"]),
  secure: z.enum(["top", "secure", "normal"]),
  name: z.string().min(1, "계약명을 입력하세요"),
  requester: z.string().min(1, "검토 요청자를 선택하세요"),
  ctype: z.enum(["normal", "std"]),
  party: z.string().min(1, "계약 당사자를 선택하세요"),
  catMajor: z.string().min(1, "계약 대분류를 선택하세요"),
  catMinor: z.string().min(1, "계약 중분류를 선택하세요"),
  periodStart: z.string(),
  periodEnd: z.string(),
  periodManual: z.boolean(),
  noEndDate: z.boolean(),
  counterparty: z.string().min(1, "상대 계약자를 입력하세요"),
  // ② 계약서·첨부 (mock: 파일명 배열)
  contractFiles: z.array(z.string()).min(1, "계약서를 첨부하세요"),
  attachFiles: z.array(z.string()),
  refFiles: z.array(z.string()),
  // ③ 관계자·참조
  ccUsers: z.array(z.string()),
  ccDepts: z.array(z.string()),
  ccSecret: z.array(z.string()),
  owner: z.string(),
  project: z.string(),
  // ④ 상세 조건
  lang: z.enum(["ko", "en", "koen", "etc"]),
  legal: z.enum(["dom", "intl", ""]),
  expectedDate: z.string(),
  negotiation: z.number().min(0).max(100),
  money: z.array(moneyRowSchema).refine((rows) => rows.some((r) => r.amount != null), {
    message: "계약 규모를 입력하세요",
  }),
  moneyNote: z.string(),
  // ⑤ 상세 내용 (rich text HTML)
  payTerms: z.string(),
  purpose: z.string().min(1, "계약의 배경 및 목적을 입력하세요"),
  keyPoints: z.string(),
  concerns: z.string(),
  urls: z.array(z.string()),
  // 결재선
  approvers: z.array(z.object({ name: z.string(), role: z.string() })),
});

export type ContractRequestForm = z.infer<typeof contractRequestSchema>;

export const contractRequestDefaults: ContractRequestForm = {
  stage: "new",
  secure: "normal",
  name: "",
  requester: "",
  ctype: "normal",
  party: "",
  catMajor: "",
  catMinor: "",
  periodStart: "",
  periodEnd: "",
  periodManual: false,
  noEndDate: false,
  counterparty: "",
  contractFiles: [],
  attachFiles: [],
  refFiles: [],
  ccUsers: [],
  ccDepts: [],
  ccSecret: [],
  owner: "",
  project: "",
  lang: "ko",
  legal: "",
  expectedDate: "",
  negotiation: 50,
  money: [{ vat: "excluded", amount: null, currency: "KRW" }],
  moneyNote: "",
  payTerms: "",
  purpose: "",
  keyPoints: "",
  concerns: "",
  urls: [],
  approvers: [{ name: "손준호", role: "기안 · 법무팀" }],
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/web && pnpm test -- src/pages/contract/request-schema`
Expected: PASS (3 tests).

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/pages/contract/request-schema.ts apps/web/src/pages/contract/request-schema.test.ts
git commit -m "feat(web): 계약서 검토 요청 전체 필드 zod 스키마 확장"
```

---

## Task 3: sectionStatus.ts (작성 현황 파생)

**Files:**
- Create: `apps/web/src/pages/contract/sectionStatus.ts`
- Test: `apps/web/src/pages/contract/sectionStatus.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`sectionStatus.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deriveSectionStatus, overallPercent } from "./sectionStatus";
import { contractRequestDefaults } from "./request-schema";

describe("deriveSectionStatus", () => {
  it("기본값은 개요 섹션이 미완(필수 남음)이다", () => {
    const s = deriveSectionStatus(contractRequestDefaults);
    const overview = s.find((x) => x.id === "overview")!;
    expect(overview.requiredDone).toBeLessThan(overview.requiredTotal);
    expect(overview.status).toBe("empty");
  });

  it("개요 필수를 채우면 done", () => {
    const s = deriveSectionStatus({
      ...contractRequestDefaults,
      name: "n", requester: "r", party: "p", catMajor: "a", catMinor: "b", counterparty: "c",
    });
    expect(s.find((x) => x.id === "overview")!.status).toBe("done");
  });

  it("overallPercent는 0~100", () => {
    const p = overallPercent(deriveSectionStatus(contractRequestDefaults));
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/web && pnpm test -- src/pages/contract/sectionStatus`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`sectionStatus.ts`:

```ts
import type { ContractRequestForm } from "./request-schema";

export type SectionId = "overview" | "docs" | "people" | "terms" | "content";
export type SectionState = "done" | "partial" | "empty";

export interface SectionStatus {
  id: SectionId;
  label: string;
  requiredTotal: number;
  requiredDone: number;
  optional: boolean;
  status: SectionState;
}

const has = (v: unknown) =>
  Array.isArray(v) ? v.length > 0 : v != null && v !== "";

function statusOf(done: number, total: number, touched: boolean): SectionState {
  if (total > 0 && done >= total) return "done";
  if (done > 0 || touched) return "partial";
  return "empty";
}

export function deriveSectionStatus(v: ContractRequestForm): SectionStatus[] {
  // ① 개요 필수: name, requester, party, catMajor, catMinor, counterparty
  const ov = [v.name, v.requester, v.party, v.catMajor, v.catMinor, v.counterparty];
  const ovDone = ov.filter(has).length;

  // ② 계약서: contractFiles 필수
  const docsDone = has(v.contractFiles) ? 1 : 0;

  // ③ 관계자: 전부 선택 → 입력 여부만 표시
  const peopleTouched = [v.ccUsers, v.ccDepts, v.ccSecret, v.owner, v.project].some(has);

  // ④ 상세 조건: money(금액) 필수
  const termsDone = v.money.some((m) => m.amount != null) ? 1 : 0;

  // ⑤ 상세 내용: purpose 필수
  const contentDone = has(v.purpose) ? 1 : 0;
  const contentTouched = [v.payTerms, v.keyPoints, v.concerns].some(has);

  return [
    { id: "overview", label: "계약 개요", requiredTotal: 6, requiredDone: ovDone, optional: false, status: statusOf(ovDone, 6, false) },
    { id: "docs", label: "계약서 · 첨부", requiredTotal: 1, requiredDone: docsDone, optional: false, status: statusOf(docsDone, 1, false) },
    { id: "people", label: "관계자 · 참조", requiredTotal: 0, requiredDone: 0, optional: true, status: peopleTouched ? "done" : "empty" },
    { id: "terms", label: "상세 조건", requiredTotal: 1, requiredDone: termsDone, optional: false, status: statusOf(termsDone, 1, false) },
    { id: "content", label: "상세 내용", requiredTotal: 1, requiredDone: contentDone, optional: false, status: statusOf(contentDone, 1, contentTouched) },
  ];
}

export function overallPercent(sections: SectionStatus[]): number {
  const total = sections.reduce((a, s) => a + s.requiredTotal, 0);
  const done = sections.reduce((a, s) => a + Math.min(s.requiredDone, s.requiredTotal), 0);
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function requiredTotals(sections: SectionStatus[]) {
  const total = sections.reduce((a, s) => a + s.requiredTotal, 0);
  const done = sections.reduce((a, s) => a + Math.min(s.requiredDone, s.requiredTotal), 0);
  return { total, done };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/web && pnpm test -- src/pages/contract/sectionStatus`
Expected: PASS (3 tests).

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/pages/contract/sectionStatus.ts apps/web/src/pages/contract/sectionStatus.test.ts
git commit -m "feat(web): 작성 현황 파생 로직(deriveSectionStatus) 추가"
```

---

## Task 4: aiPrecheck.ts (mock AI 사전점검)

**Files:**
- Create: `apps/web/src/pages/contract/aiPrecheck.ts`

- [ ] **Step 1: 구현 (순수 데이터 — 테스트 생략, 렌더에서 검증)**

`aiPrecheck.ts`:

```ts
export type RiskLevel = "high" | "mid";

export interface PrecheckRisk {
  level: RiskLevel;
  clause: string;
  finding: string;
}

export interface PrecheckResult {
  analyzed: boolean;
  highCount: number;
  risks: PrecheckRisk[];
}

const MOCK_RISKS: PrecheckRisk[] = [
  { level: "high", clause: "손해배상 한도 (제12조)", finding: "배상 한도 누락 — 무제한 해석 여지." },
  { level: "mid", clause: "계약 해지 (제15조)", finding: "해지 통보 7일 — 대응 시간 부족 가능." },
];

/** 계약서 첨부 여부에 따라 mock 결과 반환 */
export function getPrecheck(hasContractFile: boolean): PrecheckResult {
  if (!hasContractFile) return { analyzed: false, highCount: 0, risks: [] };
  return { analyzed: true, highCount: MOCK_RISKS.filter((r) => r.level === "high").length, risks: MOCK_RISKS };
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/src/pages/contract/aiPrecheck.ts
git commit -m "feat(web): AI 사전점검 mock 데이터 추가"
```

---

## Task 5: contractRequest.css.ts (레이아웃 + 다크 레일)

**Files:**
- Create: `apps/web/src/pages/contract/contractTheme.ts`
- Create: `apps/web/src/pages/contract/contractRequest.css.ts`

- [ ] **Step 1: `contractTheme.ts` 생성** — 위 "디자인 토큰" 섹션의 `darkRailVars` 코드 블록을 그대로 작성(`import { createLdsThemeVars } from "@lawkit/ui";` + `export const darkRailVars = createLdsThemeVars({...})`).

- [ ] **Step 2: `contractRequest.css.ts` 구현** — lawkit `themeVars` 사용:

```ts
import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

export const layout = style({
  display: "grid",
  gridTemplateColumns: "1fr 340px",
  gap: 18,
  alignItems: "start",
  "@media": { "screen and (max-width: 1024px)": { gridTemplateColumns: "1fr" } },
});

export const formCol = style({ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 });
export const rail = style({ position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 14 });

export const grid2 = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px 20px",
});
export const grid3 = style({ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 });
export const full = style({ gridColumn: "1 / -1" });

/* 레일 패널 내부는 darkRailVars 래퍼 안에서 themeVars가 다크로 resolve된다 */
export const darkBody = style({ padding: "14px 15px" });
export const dkv = style({
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: "6px 0",
  fontSize: 12,
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});
export const dkvKey = style({ color: themeVars.color.textMuted });
export const dkvVal = style({ color: themeVars.color.textHeading, fontWeight: 600, textAlign: "right" });

/* 작성 현황 행 */
export const prgRow = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 0",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  cursor: "pointer",
  selectors: { "&:last-child": { borderBottom: "none" } },
});
export const prgDot = style({ width: 20, height: 20, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" });
export const prgLabel = style({ flex: 1, fontSize: 12.5, fontWeight: 700, color: themeVars.color.textHeading });

/* 리스크(다크) */
export const drisk = style({ background: themeVars.color.neutralSurfaceAlt, border: `1px solid ${themeVars.color.neutralBorder}`, borderRadius: 8, padding: "10px 11px" });

/* 에러 텍스트 */
export const errText = style({ marginTop: 5, fontSize: 12, color: themeVars.color.accentDanger });
```

- [ ] **Step 3: 타입체크**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/pages/contract/contractTheme.ts apps/web/src/pages/contract/contractRequest.css.ts
git commit -m "feat(web): 계약요청 레이아웃·다크 레일 토큰(themeVars) 스타일"
```

---

## Task 6: RichTextEditor (TipTap 래퍼)

**Files:**
- Create: `apps/web/src/components/ui/RichTextEditor.tsx`
- Create: `apps/web/src/components/ui/RichTextEditor.css.ts`
- Test: `apps/web/src/components/ui/RichTextEditor.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`RichTextEditor.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RichTextEditor } from "./RichTextEditor";

describe("RichTextEditor", () => {
  it("초기 HTML을 렌더한다", () => {
    render(<RichTextEditor value="<p>안녕</p>" onChange={() => {}} ariaLabel="배경" />);
    expect(screen.getByLabelText("배경")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/web && pnpm test -- src/components/ui/RichTextEditor`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 스타일 작성**

`RichTextEditor.css.ts`:

```ts
import { style } from "@vanilla-extract/css";
import { T } from "../../design/tokens";

export const wrap = style({ border: `1px solid ${T.borderStrong}`, borderRadius: 8, overflow: "hidden" });
export const toolbar = style({ display: "flex", gap: 2, padding: "6px 8px", background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` });
export const tbBtn = style({
  minWidth: 28, height: 28, border: "none", background: "none", borderRadius: 4, cursor: "pointer",
  fontSize: 13, fontWeight: 700, color: T.muted,
  selectors: { "&[data-active='true']": { background: "#fff", color: T.primary } },
});
export const area = style({ minHeight: 96, padding: "10px 12px", fontSize: 13.5, color: T.heading, outline: "none" });
```

- [ ] **Step 4: 컴포넌트 작성**

`RichTextEditor.tsx`:

```tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import * as s from "./RichTextEditor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, ariaLabel }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { "aria-label": ariaLabel, class: s.area } },
  });

  // 외부 값(예: reset)과 동기화
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, false);
  }, [value, editor]);

  if (!editor) return null;
  const btn = (label: string, active: boolean, on: () => void) => (
    <button type="button" className={s.tbBtn} data-active={active} onClick={on} aria-label={label}>
      {label}
    </button>
  );

  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        {btn("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
        {btn("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
        {btn("S", editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run())}
        {btn("• 목록", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
        {btn("1. 목록", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
        {btn("❝", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/web && pnpm test -- src/components/ui/RichTextEditor`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/components/ui/RichTextEditor.tsx apps/web/src/components/ui/RichTextEditor.css.ts apps/web/src/components/ui/RichTextEditor.test.tsx
git commit -m "feat(web): TipTap 리치텍스트 에디터 래퍼 추가"
```

---

## Task 7: 공용 필드 헬퍼 + OverviewSection (①)

**Files:**
- Create: `apps/web/src/pages/contract/sections/OverviewSection.tsx`
- Test: `apps/web/src/pages/contract/sections/OverviewSection.test.tsx`

> 모든 Section은 `useFormContext<ContractRequestForm>()`로 `control`/`setValue`를 얻는다. `ErrText`/`CardTitle`은 기존 `ContractRequestPage.tsx`의 것을 `sections/_shared.tsx`로 추출해 재사용한다.

- [ ] **Step 1: 공용 헬퍼 추출 — `sections/_shared.tsx`**

```tsx
import type { ReactNode } from "react";
import { Icon } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import { T } from "../../../design/tokens";
import * as css from "../contractRequest.css";

export function CardTitle({ icon, num, children }: { icon: IconName; num: number; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: T.primarySoft, color: T.primary, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{num}</span>
      <Icon name={icon} size="sm" style={{ width: 16, height: 16, color: T.muted }} />
      {children}
    </span>
  );
}

export function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div role="alert" className={css.errText}>{msg}</div>;
}
```

- [ ] **Step 2: 실패 테스트 작성 — `OverviewSection.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { OverviewSection } from "./OverviewSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><OverviewSection /></FormProvider>;
}

describe("OverviewSection", () => {
  it("핵심 필드 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("계약명")).toBeInTheDocument();
    expect(screen.getByText("계약 분류")).toBeInTheDocument();
    expect(screen.getByText("상대 계약자 정보")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `cd apps/web && pnpm test -- src/pages/contract/sections/OverviewSection`
Expected: FAIL.

- [ ] **Step 4: 구현 — `OverviewSection.tsx`**

```tsx
import { Controller, useFormContext } from "react-hook-form";
import { Card, InputGroup, Input, ButtonGroup, RadioButtonGroup, Dropdown, AutoComplete, DateRangePicker, Checkbox, Button, Icon } from "@lawkit/ui";
import { T } from "../../../design/tokens";
import { LIST_FILTERS } from "../mock-data";
import type { ContractRequestForm } from "../request-schema";
import { CardTitle, ErrText } from "./_shared";
import * as css from "../contractRequest.css";

const USER_OPTIONS = [
  { value: "jhson1", label: "손준호 (팀(개발) | jhson1)" },
  { value: "lee", label: "이법무 (법무팀)" },
];
const opt = (arr: string[]) => arr.map((o) => ({ value: o, label: o }));

export function OverviewSection() {
  const { control, setValue, formState: { errors } } = useFormContext<ContractRequestForm>();
  return (
    <Card bordered header={<CardTitle icon="fileText" num={1}>계약 개요</CardTitle>}>
      <div className={css.grid2}>
        <InputGroup label="계약 단계" required>
          <Controller name="stage" control={control} render={({ field }) => (
            <RadioButtonGroup value={field.value} onChange={field.onChange}
              items={[{ value: "new", label: "신규계약" }, { value: "change", label: "변경·해지" }]} />
          )} />
        </InputGroup>

        <InputGroup label="보안여부">
          <Controller name="secure" control={control} render={({ field }) => (
            <ButtonGroup value={field.value} onChange={field.onChange}
              items={[{ value: "top", label: "극비" }, { value: "secure", label: "보안" }, { value: "normal", label: "일반" }]} />
          )} />
        </InputGroup>

        <InputGroup label="계약명" required className={css.full}>
          <Controller name="name" control={control} render={({ field }) => (
            <Input placeholder="계약명을 입력하세요" value={field.value} onChange={field.onChange} />
          )} />
          <ErrText msg={errors.name?.message} />
        </InputGroup>

        <InputGroup label="검토 요청자" required>
          <Controller name="requester" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} value={field.value} placeholder="검토 요청자 선택"
              onChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)} />
          )} />
          <ErrText msg={errors.requester?.message} />
        </InputGroup>

        <InputGroup label="계약서 유형" required>
          <Controller name="ctype" control={control} render={({ field }) => (
            <RadioButtonGroup value={field.value} onChange={field.onChange}
              items={[{ value: "normal", label: "일반 검토요청" }, { value: "std", label: "표준계약서 계약체결" }]} />
          )} />
        </InputGroup>

        <InputGroup label="계약 분류" required className={css.full}>
          <div className={css.grid3}>
            <Controller name="party" control={control} render={({ field }) => (
              <Dropdown options={opt(LIST_FILTERS.party.slice(1))} value={field.value} placeholder="계약 당사자"
                onChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)} />
            )} />
            <Controller name="catMajor" control={control} render={({ field }) => (
              <Dropdown options={opt(LIST_FILTERS.cat.slice(1))} value={field.value} placeholder="계약 대분류"
                onChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)} />
            )} />
            <Controller name="catMinor" control={control} render={({ field }) => (
              <Dropdown options={opt(["소프트웨어", "용역", "물품", "기타"])} value={field.value} placeholder="계약 중분류"
                onChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)} />
            )} />
          </div>
          <ErrText msg={errors.party?.message ?? errors.catMajor?.message ?? errors.catMinor?.message} />
        </InputGroup>

        <InputGroup label="계약 기간" className={css.full}>
          <DateRangePicker onChange={(range) => {
            // NOTE: range 필드명은 DateRangePicker/index.d.ts에서 확인 (start/end 가정)
            setValue("periodStart", (range as { start?: string }).start ?? "");
            setValue("periodEnd", (range as { end?: string }).end ?? "");
          }} />
          <div style={{ display: "flex", gap: 18, marginTop: 9 }}>
            <Controller name="periodManual" control={control} render={({ field }) => (
              <Checkbox label="직접 입력" checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <Controller name="noEndDate" control={control} render={({ field }) => (
              <Checkbox label="계약 종료일 없음" checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>
        </InputGroup>

        <InputGroup label="상대 계약자 정보" required className={css.full}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, maxWidth: 420 }}>
              <Controller name="counterparty" control={control} render={({ field }) => (
                <Input placeholder="회사명" value={field.value} onChange={field.onChange}
                  leftIcon={<Icon name="user" size="sm" style={{ width: 15, height: 15, color: T.faint }} />} />
              )} />
            </div>
            <Button type="button" variant="outline" color="secondary">신규 추가</Button>
          </div>
          <ErrText msg={errors.counterparty?.message} />
        </InputGroup>
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/web && pnpm test -- src/pages/contract/sections/OverviewSection`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/pages/contract/sections/_shared.tsx apps/web/src/pages/contract/sections/OverviewSection.tsx apps/web/src/pages/contract/sections/OverviewSection.test.tsx
git commit -m "feat(web): 계약 개요 섹션(OverviewSection) 구현"
```

---

## Task 8: DocsSection (②)

**Files:**
- Create: `apps/web/src/pages/contract/sections/DocsSection.tsx`
- Test: `apps/web/src/pages/contract/sections/DocsSection.test.tsx`

- [ ] **Step 1: 실패 테스트 (렌더 + 첨부 시 값 반영)**

```tsx
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { DocsSection } from "./DocsSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><DocsSection /></FormProvider>;
}

describe("DocsSection", () => {
  it("안내 Alert과 계약서 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText(/워드/)).toBeInTheDocument();
    expect(screen.getByText("계약서")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `cd apps/web && pnpm test -- sections/DocsSection` → FAIL

- [ ] **Step 3: 구현 — `DocsSection.tsx`**

```tsx
import { Controller, useFormContext } from "react-hook-form";
import { Card, InputGroup, Alert, FileUploadArea, Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { CardTitle, ErrText } from "./_shared";
import * as css from "../contractRequest.css";

export function DocsSection() {
  const { control, formState: { errors } } = useFormContext<ContractRequestForm>();
  return (
    <Card bordered header={<CardTitle icon="paperclip" num={2}>계약서 · 첨부</CardTitle>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Alert type="info" size="small">
          검토 정확도를 위해 편집 가능한 워드(.docx) 파일 첨부를 권장합니다. 첨부 즉시 우측에서 AI가 주요 리스크 조항을 사전 점검합니다.
        </Alert>

        <InputGroup label="계약서" required>
          <Controller name="contractFiles" control={control} render={({ field }) => (
            <FileUploadArea accept=".docx,.hwp,.pdf"
              description=".docx · .hwp · .pdf · 최대 30MB — 가능한 워드 권장"
              onFilesAdded={(files) => field.onChange([...field.value, ...files.map((f) => f.name)])} />
          )} />
          <ErrText msg={errors.contractFiles?.message} />
        </InputGroup>

        <div className={css.grid2}>
          <InputGroup label="첨부 / 별첨">
            <Controller name="attachFiles" control={control} render={({ field }) => (
              <FileUploadArea description="드래그 또는 클릭"
                onFilesAdded={(files) => field.onChange([...field.value, ...files.map((f) => f.name)])} />
            )} />
          </InputGroup>
          <InputGroup label="참고서류">
            <Controller name="refFiles" control={control} render={({ field }) => (
              <FileUploadArea description="드래그 또는 클릭"
                onFilesAdded={(files) => field.onChange([...field.value, ...files.map((f) => f.name)])} />
            )} />
          </InputGroup>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button type="button" variant="outline" color="secondary" size="small">표준계약서 양식 보기</Button>
          <Button type="button" variant="outline" color="secondary" size="small">관련문서 찾아보기</Button>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `cd apps/web && pnpm test -- sections/DocsSection` → PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/pages/contract/sections/DocsSection.tsx apps/web/src/pages/contract/sections/DocsSection.test.tsx
git commit -m "feat(web): 계약서·첨부 섹션(DocsSection) 구현"
```

---

## Task 9: PeopleSection (③)

**Files:**
- Create: `apps/web/src/pages/contract/sections/PeopleSection.tsx`
- Test: `apps/web/src/pages/contract/sections/PeopleSection.test.tsx`

- [ ] **Step 1: 실패 테스트 (렌더)**

```tsx
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { PeopleSection } from "./PeopleSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><PeopleSection /></FormProvider>;
}

describe("PeopleSection", () => {
  it("참조수신자/업무담당자 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("참조수신자")).toBeInTheDocument();
    expect(screen.getByText("업무담당자")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test -- sections/PeopleSection` → FAIL

- [ ] **Step 3: 구현 — `PeopleSection.tsx`**

```tsx
import { Controller, useFormContext } from "react-hook-form";
import { Card, InputGroup, AutoComplete, ChipsNavigation, Dropdown, Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { CardTitle } from "./_shared";
import * as css from "../contractRequest.css";

const USER_OPTIONS = [
  { value: "kim", label: "김검토 (법무팀)" },
  { value: "park", label: "박담당 (구매팀)" },
  { value: "lee", label: "이법무 (법무팀)" },
];
const DEPT_CHIPS = [
  { value: "dev", label: "개발팀" },
  { value: "ops", label: "운영팀" },
  { value: "infra", label: "인프라팀" },
];
const PROJECTS = [
  { value: "p1", label: "차세대 플랫폼 구축" },
  { value: "p2", label: "데이터센터 이전" },
];

export function PeopleSection() {
  const { control } = useFormContext<ContractRequestForm>();
  const toArr = (v: string | string[]) => (Array.isArray(v) ? v : [v]);
  return (
    <Card bordered header={<CardTitle icon="approvalCompleted" num={3}>관계자 · 참조</CardTitle>}>
      <div className={css.grid2}>
        <InputGroup label="참조수신자">
          <Controller name="ccUsers" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} multiple value={field.value}
              placeholder="참조수신자 선택" onChange={(v) => field.onChange(toArr(v))} />
          )} />
        </InputGroup>

        <InputGroup label="참조수신자(부서)">
          <Controller name="ccDepts" control={control} render={({ field }) => (
            <ChipsNavigation items={DEPT_CHIPS} multiple value={field.value} onChange={(v) => field.onChange(toArr(v))} />
          )} />
        </InputGroup>

        <InputGroup label="참조수신자(비밀)">
          <Controller name="ccSecret" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} multiple value={field.value}
              placeholder="참조수신자(비밀) 선택" onChange={(v) => field.onChange(toArr(v))} />
          )} />
        </InputGroup>

        <InputGroup label="업무담당자">
          <Controller name="owner" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} value={field.value}
              placeholder="업무담당자 선택" onChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)} />
          )} />
        </InputGroup>

        <InputGroup label="관련 프로젝트">
          <Controller name="project" control={control} render={({ field }) => (
            <Dropdown options={PROJECTS} value={field.value} placeholder="관련 프로젝트 선택"
              onChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)} />
          )} />
        </InputGroup>

        <InputGroup label="관련문서">
          <div style={{ height: 42, display: "flex", alignItems: "center" }}>
            <Button type="button" variant="outline" color="secondary" size="small">찾아보기</Button>
          </div>
        </InputGroup>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: 통과 확인** — `pnpm test -- sections/PeopleSection` → PASS
- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/pages/contract/sections/PeopleSection.tsx apps/web/src/pages/contract/sections/PeopleSection.test.tsx
git commit -m "feat(web): 관계자·참조 섹션(PeopleSection) 구현"
```

---

## Task 10: TermsSection (④)

**Files:**
- Create: `apps/web/src/pages/contract/sections/TermsSection.tsx`
- Test: `apps/web/src/pages/contract/sections/TermsSection.test.tsx`

- [ ] **Step 1: 실패 테스트 (렌더 + 협상력 라벨)**

```tsx
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { TermsSection } from "./TermsSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><TermsSection /></FormProvider>;
}

describe("TermsSection", () => {
  it("협상력/계약 규모 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("계약상대방 협상력")).toBeInTheDocument();
    expect(screen.getByText("계약 규모(대가)")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test -- sections/TermsSection` → FAIL

- [ ] **Step 3: 구현 — `TermsSection.tsx`**

```tsx
import { Controller, useFormContext, useFieldArray } from "react-hook-form";
import { Card, InputGroup, RadioButtonGroup, DatePicker, Slider, Dropdown, NumberInput, Button, Alert, Input } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { VAT_OPTIONS, CURRENCY_OPTIONS } from "../request-schema";
import { CardTitle, ErrText } from "./_shared";
import * as css from "../contractRequest.css";

export function TermsSection() {
  const { control, setValue, formState: { errors } } = useFormContext<ContractRequestForm>();
  const { fields, append } = useFieldArray({ control, name: "money" });
  return (
    <Card bordered header={<CardTitle icon="list" num={4}>상세 조건</CardTitle>}>
      <div className={css.grid2}>
        <InputGroup label="계약 언어">
          <Controller name="lang" control={control} render={({ field }) => (
            <RadioButtonGroup value={field.value} onChange={field.onChange}
              items={[{ value: "ko", label: "국문" }, { value: "en", label: "영문" }, { value: "koen", label: "국영" }, { value: "etc", label: "기타" }]} />
          )} />
        </InputGroup>

        <InputGroup label="법무 분류">
          <Controller name="legal" control={control} render={({ field }) => (
            <RadioButtonGroup value={field.value} onChange={field.onChange}
              items={[{ value: "dom", label: "국내 법무" }, { value: "intl", label: "해외 법무" }]} />
          )} />
        </InputGroup>

        <InputGroup label="계약예정일">
          <Controller name="expectedDate" control={control} render={({ field }) => (
            <DatePicker value={field.value} onChange={(v: string) => field.onChange(v)} />
          )} />
        </InputGroup>

        <InputGroup label="계약상대방 협상력">
          <Controller name="negotiation" control={control} render={({ field }) => (
            <Slider value={field.value} onChange={field.onChange} min={0} max={100} step={5} showValue />
          )} />
        </InputGroup>

        <InputGroup label="계약 규모(대가)" required className={css.full}>
          {fields.map((row, i) => (
            <div key={row.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
              <div style={{ maxWidth: 200, flex: "0 0 200px" }}>
                <Controller name={`money.${i}.vat`} control={control} render={({ field }) => (
                  <Dropdown options={[...VAT_OPTIONS]} value={field.value} onChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)} />
                )} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Controller name={`money.${i}.amount`} control={control} render={({ field }) => (
                  <NumberInput value={field.value ?? 0} onChange={field.onChange} min={0} />
                )} />
              </div>
              <div style={{ maxWidth: 160, flex: "0 0 160px" }}>
                <Controller name={`money.${i}.currency`} control={control} render={({ field }) => (
                  <Dropdown options={[...CURRENCY_OPTIONS]} value={field.value} onChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)} />
                )} />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" color="secondary" size="small"
            onClick={() => append({ vat: "excluded", amount: null, currency: "KRW" })}>추가하기</Button>
          <Alert type="info" size="small" style={{ marginTop: 10 }}>
            계약금액 총액이 정해진 게 아닌 품목단가 / Time Charge / Service 청구 등에 해당될 경우 본 항목을 사용하세요.
          </Alert>
          <div style={{ marginTop: 10 }}>
            <Controller name="moneyNote" control={control} render={({ field }) => (
              <Input placeholder="내용을 입력해 주세요" value={field.value} onChange={field.onChange} />
            )} />
          </div>
          <ErrText msg={errors.money?.message as string | undefined} />
        </InputGroup>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: 통과 확인** — `pnpm test -- sections/TermsSection` → PASS
- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/pages/contract/sections/TermsSection.tsx apps/web/src/pages/contract/sections/TermsSection.test.tsx
git commit -m "feat(web): 상세 조건 섹션(TermsSection) 구현"
```

---

## Task 11: ContentSection (⑤ · 에디터 4개 + URL)

**Files:**
- Create: `apps/web/src/pages/contract/sections/ContentSection.tsx`
- Test: `apps/web/src/pages/contract/sections/ContentSection.test.tsx`

- [ ] **Step 1: 실패 테스트 (4개 에디터 라벨)**

```tsx
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { ContentSection } from "./ContentSection";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><ContentSection /></FormProvider>;
}

describe("ContentSection", () => {
  it("4개 에디터 라벨을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByLabelText("계약 지급 조건")).toBeInTheDocument();
    expect(screen.getByLabelText("계약의 배경 및 목적")).toBeInTheDocument();
    expect(screen.getByLabelText("주요 협의사항")).toBeInTheDocument();
    expect(screen.getByLabelText("요청부서의 우려사항 및 기타 고려사항")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test -- sections/ContentSection` → FAIL

- [ ] **Step 3: 구현 — `ContentSection.tsx`**

```tsx
import { Controller, useFormContext } from "react-hook-form";
import { Card, InputGroup, Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { CardTitle, ErrText } from "./_shared";

const EDITORS: { name: "payTerms" | "purpose" | "keyPoints" | "concerns"; label: string; required?: boolean }[] = [
  { name: "payTerms", label: "계약 지급 조건" },
  { name: "purpose", label: "계약의 배경 및 목적", required: true },
  { name: "keyPoints", label: "주요 협의사항" },
  { name: "concerns", label: "요청부서의 우려사항 및 기타 고려사항" },
];

export function ContentSection() {
  const { control, formState: { errors } } = useFormContext<ContractRequestForm>();
  return (
    <Card bordered header={<CardTitle icon="edit" num={5}>상세 내용</CardTitle>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {EDITORS.map((e) => (
          <InputGroup key={e.name} label={e.label} required={e.required}>
            <Controller name={e.name} control={control} render={({ field }) => (
              <RichTextEditor ariaLabel={e.label} value={field.value} onChange={field.onChange} />
            )} />
            {e.name === "purpose" && <ErrText msg={errors.purpose?.message} />}
          </InputGroup>
        ))}
        <InputGroup label="기타 URL">
          <Button type="button" variant="outline" color="secondary" size="small">+ 추가</Button>
        </InputGroup>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: 통과 확인** — `pnpm test -- sections/ContentSection` → PASS
- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/pages/contract/sections/ContentSection.tsx apps/web/src/pages/contract/sections/ContentSection.test.tsx
git commit -m "feat(web): 상세 내용 섹션(ContentSection·에디터 4개) 구현"
```

---

## Task 12: 레일 패널 4종 + SmartRail

**Files:**
- Create: `apps/web/src/pages/contract/rail/ProgressPanel.tsx`
- Create: `apps/web/src/pages/contract/rail/AiPrecheckPanel.tsx`
- Create: `apps/web/src/pages/contract/rail/RequestSummaryPanel.tsx`
- Create: `apps/web/src/pages/contract/rail/ApprovalLinePanel.tsx`
- Create: `apps/web/src/pages/contract/rail/SmartRail.tsx`
- Test: `apps/web/src/pages/contract/rail/SmartRail.test.tsx`

- [ ] **Step 1: 실패 테스트 — `SmartRail.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { describe, it, expect } from "vitest";
import { SmartRail } from "./SmartRail";
import { contractRequestDefaults, type ContractRequestForm } from "../request-schema";

function Wrap() {
  const methods = useForm<ContractRequestForm>({ defaultValues: contractRequestDefaults });
  return <FormProvider {...methods}><SmartRail /></FormProvider>;
}

describe("SmartRail", () => {
  it("4개 패널 제목을 렌더한다", () => {
    render(<Wrap />);
    expect(screen.getByText("작성 현황")).toBeInTheDocument();
    expect(screen.getByText("AI 사전 점검")).toBeInTheDocument();
    expect(screen.getByText("요청 요약")).toBeInTheDocument();
    expect(screen.getByText("결재선")).toBeInTheDocument();
  });

  it("계약서 미첨부 시 AI는 분석 전 안내를 보인다", () => {
    render(<Wrap />);
    expect(screen.getByText(/계약서를 첨부/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test -- rail/SmartRail` → FAIL

- [ ] **Step 3: 구현 — `ProgressPanel.tsx`**

```tsx
import { useFormContext, useWatch } from "react-hook-form";
import { Card, Icon } from "@lawkit/ui";
import { T } from "../../../design/tokens";
import type { ContractRequestForm } from "../request-schema";
import { deriveSectionStatus, requiredTotals } from "../sectionStatus";
import * as css from "../contractRequest.css";

export function ProgressPanel() {
  const { control } = useFormContext<ContractRequestForm>();
  const values = useWatch({ control }) as ContractRequestForm;
  const sections = deriveSectionStatus(values);
  const { total, done } = requiredTotals(sections);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const dot = (status: string) =>
    status === "done"
      ? <span className={css.prgDot} style={{ background: T.success }}><Icon name="check" size="sm" style={{ width: 12, height: 12, color: "#fff" }} /></span>
      : status === "partial"
      ? <span className={css.prgDot} style={{ border: `2px solid ${T.warning}` }}><span style={{ width: 7, height: 7, borderRadius: 999, background: T.warning }} /></span>
      : <span className={css.prgDot} style={{ border: `2px solid ${T.navyFaint}` }} />;

  return (
    <Card bordered className={css.darkCard} header={<span style={{ color: "#fff" }}>작성 현황</span>}>
      <div className={css.darkBody}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: "#7e9bff" }}>{pct}<small style={{ fontSize: 13, color: T.navyMuted }}>%</small></span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: T.navyText }}>필수 {done} / {total}</span>
        </div>
        <div style={{ height: 7, borderRadius: 99, background: "#1c2438", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: T.primary }} />
        </div>
        <div style={{ marginTop: 8 }}>
          {sections.map((s) => (
            <div key={s.id} className={css.prgRow}>
              {dot(s.status)}
              <span className={css.prgLabel} style={s.status === "empty" ? { color: T.navyMuted, fontWeight: 600 } : undefined}>{s.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.status === "done" ? T.success : s.optional ? T.navyMuted : T.warning }}>
                {s.optional ? "선택" : s.status === "done" ? `${s.requiredDone}/${s.requiredTotal}` : `${s.requiredTotal - s.requiredDone} 남음`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: 구현 — `AiPrecheckPanel.tsx`**

```tsx
import { useFormContext, useWatch } from "react-hook-form";
import { Card, Icon } from "@lawkit/ui";
import { T } from "../../../design/tokens";
import type { ContractRequestForm } from "../request-schema";
import { getPrecheck } from "../aiPrecheck";
import * as css from "../contractRequest.css";

export function AiPrecheckPanel() {
  const { control } = useFormContext<ContractRequestForm>();
  const files = useWatch({ control, name: "contractFiles" }) ?? [];
  const result = getPrecheck(files.length > 0);

  return (
    <Card bordered className={css.darkCard}
      header={<span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#fff" }}>
        <Icon name="autoAwesome" size="sm" style={{ width: 15, height: 15, color: "#7e9bff" }} />AI 사전 점검
        {result.analyzed && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: T.danger }}>고위험 {result.highCount}</span>}
      </span>}>
      <div className={css.darkBody}>
        {!result.analyzed ? (
          <div style={{ fontSize: 12, color: T.navyMuted, lineHeight: 1.6 }}>계약서를 첨부하면 AI가 주요 리스크 조항을 사전 점검합니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {result.risks.map((r, i) => (
              <div key={i} className={css.drisk}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 4, color: r.level === "high" ? T.danger : T.warningDark, background: r.level === "high" ? "#fbeaea" : "#f8ead0" }}>
                    {r.level === "high" ? "고위험" : "주의"}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#eef1f8" }}>{r.clause}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.navyText, marginTop: 5 }}>{r.finding}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: 구현 — `RequestSummaryPanel.tsx`**

```tsx
import { useFormContext, useWatch } from "react-hook-form";
import { Card } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import * as css from "../contractRequest.css";

export function RequestSummaryPanel() {
  const { control } = useFormContext<ContractRequestForm>();
  const v = useWatch({ control }) as ContractRequestForm;
  const rows: [string, string][] = [
    ["계약 단계", v.stage === "new" ? "신규계약" : "변경·해지"],
    ["유형", v.ctype === "normal" ? "일반 검토요청" : "표준계약서 계약체결"],
    ["요청자", v.requester || "—"],
    ["계약서", v.contractFiles?.length ? `첨부 ${v.contractFiles.length}건` : "미첨부"],
  ];
  return (
    <Card bordered className={css.darkCard} header={<span style={{ color: "#fff" }}>요청 요약</span>}>
      <div className={css.darkBody}>
        {rows.map(([k, val]) => (
          <div key={k} className={css.dkv}><span className={css.dkvKey}>{k}</span><span className={css.dkvVal}>{val}</span></div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 6: 구현 — `ApprovalLinePanel.tsx`**

```tsx
import { useFieldArray, useFormContext } from "react-hook-form";
import { Card, Avatar } from "@lawkit/ui";
import { T } from "../../../design/tokens";
import type { ContractRequestForm } from "../request-schema";
import * as css from "../contractRequest.css";

export function ApprovalLinePanel() {
  const { control } = useFormContext<ContractRequestForm>();
  const { fields, append } = useFieldArray({ control, name: "approvers" });
  return (
    <Card bordered className={css.darkCard} header={<span style={{ color: "#fff" }}>결재선</span>}>
      <div className={css.darkBody}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {fields.map((f, i) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 16, fontSize: 11, fontWeight: 800, color: T.navyFaint, textAlign: "center" }}>{i + 1}</span>
              <Avatar initials={f.name[0]} color="primary" size="sm" />
              <div><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{f.name}</div><div style={{ fontSize: 11, color: T.navyMuted }}>{f.role}</div></div>
            </div>
          ))}
          <button type="button" onClick={() => append({ name: "신규", role: "결재 · 미지정" })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: `1px dashed ${T.navyFaint}`, borderRadius: 8, padding: 9, fontSize: 12.5, fontWeight: 600, color: T.navyMuted, background: "none", cursor: "pointer", fontFamily: "inherit" }}>
            + 결재자 추가
          </button>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 7: 구현 — `SmartRail.tsx`**

```tsx
import { ProgressPanel } from "./ProgressPanel";
import { AiPrecheckPanel } from "./AiPrecheckPanel";
import { RequestSummaryPanel } from "./RequestSummaryPanel";
import { ApprovalLinePanel } from "./ApprovalLinePanel";
import { darkRailVars } from "../contractTheme";
import * as css from "../contractRequest.css";

export function SmartRail() {
  // darkRailVars가 themeVars를 다크로 재바인딩 → 내부 lawkit 컴포넌트/토큰이 모두 다크로 resolve
  return (
    <div className={css.rail} style={darkRailVars}>
      <ProgressPanel />
      <AiPrecheckPanel />
      <RequestSummaryPanel />
      <ApprovalLinePanel />
    </div>
  );
}

> **레일 패널 코드 주의:** Task 12 패널들의 색은 전부 `themeVars.color.*`로 작성한다(다크 래퍼 안에서 자동 다크). 본 계획 패널 코드의 `T.*`·리터럴 hex(`#fff`, `#7e9bff`, `#1c2438`, `#fbeaea`)는 디자인 토큰 매핑대로 치환: `#fff`→`textHeading`, `T.navyMuted`→`textMuted`, `T.navyFaint`→`textDisabled`, `T.success/danger/warning/primary`→`accent*`, `drisk` 배경→`neutralSurfaceAlt`. 위험 배지 틴트 배경처럼 토큰에 없는 값은 accent 색 텍스트만으로 표현하거나 질문.
```

- [ ] **Step 8: 통과 확인** — `pnpm test -- rail/SmartRail` → PASS (2 tests)
- [ ] **Step 9: 커밋**

```bash
git add apps/web/src/pages/contract/rail/
git commit -m "feat(web): 스마트 레일(작성현황·AI점검·요약·결재선) 구현"
```

---

## Task 13: ContractRequestPage 조립 + 검증/제출

**Files:**
- Modify: `apps/web/src/pages/contract/ContractRequestPage.tsx`
- Modify: `apps/web/src/pages/contract/ContractRequestPage.test.tsx`

- [ ] **Step 1: 기존 테스트를 새 동작으로 교체 — `ContractRequestPage.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { ContractRequestPage } from "./ContractRequestPage";

function setup() {
  return render(<MemoryRouter><ContractRequestPage /></MemoryRouter>);
}

describe("ContractRequestPage", () => {
  it("5개 섹션과 스마트 레일을 렌더한다", () => {
    setup();
    expect(screen.getByText("계약 개요")).toBeInTheDocument();
    expect(screen.getByText("상세 내용")).toBeInTheDocument();
    expect(screen.getByText("작성 현황")).toBeInTheDocument();
  });

  it("필수 미입력 상태로 제출하면 에러를 노출한다", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /검토요청 등록/ }));
    expect(await screen.findByText("계약명을 입력하세요")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm test -- src/pages/contract/ContractRequestPage` → FAIL

- [ ] **Step 3: 재작성 — `ContractRequestPage.tsx`**

```tsx
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon, Button } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { contractRequestSchema, contractRequestDefaults, type ContractRequestForm } from "./request-schema";
import { OverviewSection } from "./sections/OverviewSection";
import { DocsSection } from "./sections/DocsSection";
import { PeopleSection } from "./sections/PeopleSection";
import { TermsSection } from "./sections/TermsSection";
import { ContentSection } from "./sections/ContentSection";
import { SmartRail } from "./rail/SmartRail";
import * as css from "./contractRequest.css";

export function ContractRequestPage() {
  const navigate = useNavigate();
  const methods = useForm<ContractRequestForm>({
    resolver: zodResolver(contractRequestSchema),
    defaultValues: contractRequestDefaults,
    mode: "onSubmit",
  });

  const onValid = () => navigate("/contract/C20250710-0004");

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onValid)}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div>
            <Eyebrow style={{ marginBottom: 7 }}>계약</Eyebrow>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: T.heading, letterSpacing: "-0.025em" }}>계약서 검토 요청</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" variant="outline" color="secondary" onClick={() => navigate("/contract/list")}>목록</Button>
            <Button type="button" variant="outline" color="secondary">임시저장</Button>
            <Button type="submit" iconLeft={<Icon name="submit" size="sm" style={{ width: 14, height: 14 }} />}>검토요청 등록</Button>
          </div>
        </div>

        <div className={css.layout}>
          <div className={css.formCol}>
            <OverviewSection />
            <DocsSection />
            <PeopleSection />
            <TermsSection />
            <ContentSection />
          </div>
          <SmartRail />
        </div>
      </form>
    </FormProvider>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd apps/web && pnpm test -- src/pages/contract/ContractRequestPage`
Expected: PASS (2 tests). 필요 시 `findByText` 타임아웃은 기본값 사용.

- [ ] **Step 5: 전체 테스트 + 타입체크 + 빌드**

Run:
```bash
cd apps/web && pnpm test && pnpm exec tsc --noEmit && pnpm build
```
Expected: 전부 통과.

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/pages/contract/ContractRequestPage.tsx apps/web/src/pages/contract/ContractRequestPage.test.tsx
git commit -m "feat(web): 계약서 검토 요청 화면 B안(섹션+스마트레일)으로 재구성"
```

---

## Task 14: 수동 확인 (dev 서버)

**Files:** 없음 (관찰만)

- [ ] **Step 1: dev 서버 실행 후 화면 확인**

Run: `cd apps/web && pnpm dev` → 브라우저에서 계약서 검토 요청 경로 접속.
확인 항목:
- 좌측 5개 섹션 카드 + 우측 다크 스마트 레일(sticky) 정상.
- 필드 입력 시 우측 "작성 현황" %·섹션 상태가 실시간 갱신.
- 계약서 첨부 시 "AI 사전 점검"이 분석 전 안내 → 리스크 카드로 전환.
- 리치텍스트 에디터 4곳 입력/서식 동작.
- 좁은 폭(<1024px)에서 레일이 하단으로 흐름.

- [ ] **Step 2: (선택) 스크린샷/이슈 기록 후 마무리**

---

## Self-Review 결과 (작성자 체크)

- **스펙 커버리지:** 5개 그룹(Task 7–11), 스마트 레일 4패널(Task 12), TipTap(Task 6), 다크 레일(Task 5/12), 작성현황 파생(Task 3), AI mock(Task 4), 결재선 기안+추가(Task 12), 전체 필드 스키마(Task 2) — 스펙 §2–§7 모두 태스크로 매핑됨.
- **범위 밖 준수:** Prisma/ERD 변경 없음, 실제 AI·제출 API 없음(샘플 navigate 유지) — 태스크에 백엔드 변경 없음.
- **타입 일관성:** `ContractRequestForm` 필드명(`catMajor/catMinor/contractFiles/money/purpose` 등)이 schema(Task 2) → sectionStatus(Task 3) → sections(Task 7–11) → rail(Task 12)에서 동일하게 사용됨. `deriveSectionStatus`/`requiredTotals`/`getPrecheck` 시그니처 일치.
- **확인 필요(executor):** `DateRangePicker` onChange range 필드명, `RadioGroup`/`Radio` 또는 `RadioButtonGroup` 시각(점 vs 세그먼트), `DatePicker` value/onChange 시그니처는 해당 d.ts에서 한 번 더 확인(본 계획은 RadioButtonGroup 세그먼트로 통일).
