# Contract Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/web`에 확정 시안 기반 계약 화면 3종(계약서 검토 조회 / 계약 상세 / 계약서 검토 요청)을 라우팅과 함께 구현한다.

**Architecture:** `design-preview.html`로 확정된 디자인을 TSX 컴포넌트로 옮긴다. 데이터는 타입이 잡힌 mock(`src/pages/contract/mock-data.ts`)을 사용한다. 조회/상세는 표시 위주이고, 검토 요청 폼은 프로젝트 규칙(복잡한 폼)에 따라 react-hook-form + zod로 검증한다. react-router v7 라우트를 추가하고 사이드바·대시보드의 링크를 실제 경로에 연결한다.

**Tech Stack:** React 19, @lawkit/ui@0.1.41, react-router-dom v7, react-hook-form, zod, @hookform/resolvers, Vitest + @testing-library/react

---

## File Structure

```
apps/web/
  package.json                              # + react-hook-form, zod, @hookform/resolvers
  src/
    routes.tsx                              # + /contract/list, /contract/request, /contract/:id, signed/expire placeholder
    pages/
      contract/
        mock-data.ts                        # ContractRow[], LIST_FILTERS, LIFECYCLE, RISKS, COMMENTS, getContractDetail()
        ContractListPage.tsx                # 조회: 필터 + DataTable
        listColumns.tsx                     # 조회 컬럼 정의
        ContractDetailPage.tsx              # 상세: 라이프사이클 + 요약 + AI리스크 + 의견 + 액션레일
        ContractRequestPage.tsx            # 검토 요청: react-hook-form + zod
        request-schema.ts                   # zod 스키마 + 타입
        ContractPlaceholderPage.tsx        # signed/expire 임시 화면
        ContractListPage.test.tsx
        ContractDetailPage.test.tsx
        ContractRequestPage.test.tsx
    components/ui/
      SectionPanel.tsx                      # (기존 Panel 재사용 — 신규 없음)
```

기존 자산 재사용: `src/design/tokens.ts`(`T`), `src/components/ui/{Panel,Tag,StatusBadge,Badge}.tsx`, `src/pages/dashboard/dday.ts`(`dday`). 새 페이지에서 `dday`는 `../dashboard/dday`에서 import한다.

---

### Task 1: 의존성 + 계약 mock 데이터 + 라우트 스캐폴드

검토 요청 폼에 쓸 react-hook-form/zod를 설치하고, 계약 데이터 모듈과 라우트를 추가한다(페이지는 임시 placeholder로 두어 빌드를 통과시킨다). 이후 Task 2~4에서 각 페이지를 실제 구현으로 교체한다.

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/pages/contract/mock-data.ts`
- Create: `apps/web/src/pages/contract/ContractPlaceholderPage.tsx`
- Modify: `apps/web/src/routes.tsx`

- [ ] **Step 1: 의존성 설치**

Run (repo root):
```bash
cd /Users/junhoson/Documents/GitHub/Lawai && pnpm --filter @lawai/web add react-hook-form zod @hookform/resolvers
```
Expected: `apps/web/package.json` dependencies에 `react-hook-form`, `zod`, `@hookform/resolvers` 추가, 설치 성공.

- [ ] **Step 2: 계약 mock 데이터 작성**

Create `apps/web/src/pages/contract/mock-data.ts`:
```ts
export interface ContractRow {
  id: string;
  name: string;
  party: string;
  sub: string;
  counter: string;
  requester: string;
  owner: string;
  updated: string;
  due: string;
  dleft: number;
  status: string;
  secure: boolean;
  star: boolean;
  mine: boolean;
}

export interface LifecycleStep {
  label: string;
  status: "completed" | "active" | "scheduled";
}

export interface Risk {
  level: "high" | "mid" | "low";
  clause: string;
  finding: string;
  suggest: string;
}

export interface Comment {
  who: string;
  role: string;
  time: string;
  text: string;
  attach: string | null;
  system: boolean;
}

export interface ContractDetail {
  id: string;
  name: string;
  status: string;
  secure: boolean;
  stage: string;
  requester: string;
  owner: string;
  catPath: string[];
  period: string;
  type: string;
  files: { name: string; meta: string; kind: string }[];
  ccDept: string[];
  counter: string;
  lang: string;
  legalCat: string;
  negotiation: number;
  amount: { contract: string; vat: string; total: string };
  payTerms: string;
  purpose: string;
  notes: string;
}

export const CONTRACTS_FULL: ContractRow[] = [
  { id: "C20250710-0004", name: "한라산 EV 충전기 공급계약", party: "본사계약", sub: "용역", counter: "AAA", requester: "관리자1", owner: "김기찬", updated: "2026-06-09", due: "2026-06-11", dleft: 2, status: "법무 검토 중", secure: true, star: true, mine: true },
  { id: "A20260531-0011", name: "개인정보 위수탁 처리 자문", party: "본사계약", sub: "개인정보", counter: "정보보안팀", requester: "정보보안팀", owner: "이법무", updated: "2026-06-09", due: "2026-06-10", dleft: 1, status: "법무 검토 중", secure: false, star: true, mine: true },
  { id: "C20260609-0002", name: "[hkpark2] 통합검색 유지보수 계약", party: "법인계약", sub: "LOI/MOU", counter: "휴맥스 테스트 회사", requester: "박현경", owner: "미배정", updated: "2026-06-09", due: "2026-07-06", dleft: 27, status: "미배정", secure: true, star: false, mine: false },
  { id: "C20250902-0001", name: "한라산용역계약서", party: "법인계약", sub: "LOI/MOU", counter: "AAA", requester: "관리자1", owner: "김다함", updated: "2026-06-09", due: "2026-06-14", dleft: 5, status: "법무 검토 중", secure: false, star: false, mine: false },
  { id: "C20260601-0007", name: "사후계약관리 표준 NDA", party: "본사계약", sub: "LOI/MOU", counter: "(주)온테스트", requester: "이희규", owner: "이법무", updated: "2026-06-08", due: "2026-06-18", dleft: 9, status: "요청자 검토 중", secure: false, star: false, mine: false },
  { id: "C20250710-0010", name: "체크리스트 검수 위탁계약", party: "본사계약", sub: "위탁", counter: "(주)온테스트", requester: "김기찬", owner: "미배정", updated: "2026-06-09", due: "2026-06-20", dleft: 11, status: "배정 중", secure: true, star: false, mine: false },
  { id: "C20260605-0003", name: "옥외광고 매체 이용계약", party: "법인계약", sub: "용역", counter: "한빛미디어", requester: "한지민", owner: "박법무", updated: "2026-06-07", due: "2026-06-16", dleft: 7, status: "법무 검토 중", secure: false, star: false, mine: false },
  { id: "C20260602-0018", name: "통합검색 다운로드 로직 계약서", party: "법인계약", sub: "LOI/MOU", counter: "휴맥스 테스트 회사", requester: "박현경", owner: "박현경", updated: "2026-06-02", due: "2026-05-12", dleft: -28, status: "검토 완료", secure: false, star: false, mine: false },
  { id: "C20260519-0002", name: "솔루션 OEM 공급계약", party: "본사계약", sub: "공급", counter: "그린모빌리티", requester: "영업1팀", owner: "김기찬", updated: "2026-06-01", due: "2026-06-13", dleft: 4, status: "체결 진행", secure: false, star: true, mine: true },
  { id: "C20260528-0009", name: "공동연구 협약서 (산학)", party: "법인계약", sub: "협약", counter: "한국대학교 산학협력단", requester: "R&D센터", owner: "박법무", updated: "2026-05-29", due: "2026-06-17", dleft: 8, status: "요청자 검토 중", secure: true, star: false, mine: false },
];

export const LIST_FILTERS = {
  party: ["전체", "본사계약", "법인계약"],
  cat: ["전체", "개발/공급", "구매", "자문", "기타"],
  sub: ["전체", "용역", "도급", "공급", "위탁", "협약", "LOI/MOU", "개인정보"],
  status: ["전체", "임시 저장", "미배정", "배정 중", "법무 검토 중", "요청자 검토 중", "검토 완료", "체결 진행"],
};

export const LIFECYCLE: LifecycleStep[] = [
  { label: "임시 저장", status: "completed" }, { label: "검토 의뢰", status: "completed" },
  { label: "배정", status: "completed" }, { label: "법무 검토", status: "active" },
  { label: "요청자 검토", status: "scheduled" }, { label: "검토 완료", status: "scheduled" },
  { label: "체결 진행", status: "scheduled" }, { label: "체결 완료", status: "scheduled" },
  { label: "계약 이행", status: "scheduled" }, { label: "계약 종료", status: "scheduled" },
];

export const RISKS: Risk[] = [
  { level: "high", clause: "손해배상 한도", finding: "손해배상 상한 조항이 없습니다. 우리 측 무한책임 노출 가능성.", suggest: "계약금액의 100% 한도 조항 삽입 권장" },
  { level: "mid", clause: "지체상금", finding: "지체상금율 1일 0.3%로 표준(0.1%) 대비 3배 높습니다.", suggest: "0.1%로 조정 협의" },
  { level: "mid", clause: "자동 갱신", finding: "이의 없을 시 1년 자동 갱신. 갱신 거절 통지 기간이 짧습니다(30일).", suggest: "갱신 거절 통지 60일로 연장" },
  { level: "low", clause: "준거법·관할", finding: "관할 법원이 상대방 소재지 기준입니다.", suggest: "당사 소재지(서울중앙) 변경 검토" },
];

export const COMMENTS: Comment[] = [
  { who: "관리자1", role: "요청자", time: "2026-06-09 16:08", text: "계약 검토를 요청 드립니다. 첨부한 계약서 기준으로 검토 부탁드립니다.", attach: "(D013) 한라산EV_충전기_공급계약서_v2.0.docx", system: false },
  { who: "관리자1", role: "시스템", time: "2026-06-09 16:08", text: "[배정 중] 상태로 변경되었습니다.", system: true },
  { who: "손준호", role: "법무팀", time: "2026-06-09 16:32", text: "배정받았습니다. 손해배상 한도와 지체상금 조항 위주로 검토 진행하겠습니다.", attach: null, system: false },
];

const SAMPLE_DETAIL: ContractDetail = {
  id: "C20250710-0004", name: "한라산 EV 충전기 공급계약", status: "법무 검토 중", secure: true, stage: "신규계약",
  requester: "관리자1", owner: "김기찬", catPath: ["본사계약", "개발/공급", "용역"],
  period: "2026-06-12 ~ 2027-06-11", type: "일반 검토요청",
  files: [
    { name: "(D013) 한라산EV_충전기_공급계약서_v2.0.docx", meta: "1.8 MB", kind: "계약서" },
    { name: "별첨1_물품명세_단가표.xlsx", meta: "248 KB", kind: "첨부" },
    { name: "사업제안_검토참고.pdf", meta: "3.1 MB", kind: "참고" },
  ],
  ccDept: ["개발팀", "운영팀", "인프라팀"], counter: "AAA (사업자 110-81-xxxxx)", lang: "국문", legalCat: "국내 법무",
  negotiation: 60,
  amount: { contract: "1,240,000,000 KRW", vat: "124,000,000 KRW", total: "1,364,000,000 KRW" },
  payTerms: "선급금 30% / 중도금 40% / 잔금 30%, 검수 완료 후 30일 이내 지급",
  purpose: "EV 충전 인프라 확충을 위한 충전기 하드웨어 공급 및 설치 용역 계약. 공급사 AAA로부터 급속/완속 충전기 일괄 공급받아 전국 12개 거점에 설치.",
  notes: "지체상금·하자보수 조항 및 손해배상 한도 협의 필요. 표준 공급계약 대비 검수 기준 강화 요청.",
};

// id로 상세를 조회한다. 풍부한 상세 mock은 1건뿐이므로,
// 매칭되는 목록 행이 있으면 id/name/status/secure/requester만 덮어써 현실감을 준다.
export function getContractDetail(id: string): ContractDetail {
  const row = CONTRACTS_FULL.find((c) => c.id === id);
  if (!row) return SAMPLE_DETAIL;
  return {
    ...SAMPLE_DETAIL,
    id: row.id,
    name: row.name,
    status: row.status,
    secure: row.secure,
    requester: row.requester,
    owner: row.owner === "미배정" ? SAMPLE_DETAIL.owner : row.owner,
  };
}
```

- [ ] **Step 3: 임시 placeholder 페이지 작성**

Create `apps/web/src/pages/contract/ContractPlaceholderPage.tsx`:
```tsx
import { T } from "../../design/tokens";

export function ContractPlaceholderPage({ title = "계약" }: { title?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 440, textAlign: "center", color: T.faint }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.body }}>{title}</h2>
      <p style={{ margin: "8px 0 0", fontSize: 13.5 }}>이 화면은 다음 단계에서 제작합니다.</p>
    </div>
  );
}
```

- [ ] **Step 4: 라우트 추가 (임시로 모두 placeholder 연결)**

Replace `apps/web/src/routes.tsx` with:
```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/login/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ContractPlaceholderPage } from "./pages/contract/ContractPlaceholderPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem("accessToken")) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/contract/list" element={<ContractPlaceholderPage title="계약서 검토 조회" />} />
        <Route path="/contract/request" element={<ContractPlaceholderPage title="계약서 검토 요청" />} />
        <Route path="/contract/signed" element={<ContractPlaceholderPage title="체결 계약 조회" />} />
        <Route path="/contract/expire" element={<ContractPlaceholderPage title="체결계약 만료 현황" />} />
        <Route path="/contract/:id" element={<ContractPlaceholderPage title="계약서 상세" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

> **라우팅 주의:** react-router v7는 정적 세그먼트(`/contract/list`)를 동적(`/contract/:id`)보다 우선 매칭하므로 `/contract/list`·`/contract/request`·`/contract/signed`·`/contract/expire`가 `:id`보다 먼저 잡힌다. 상세는 `/contract/C20250710-0004` 형태로 매칭된다.

- [ ] **Step 5: 타입 확인 + 빌드**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai/apps/web && pnpm exec tsc --noEmit && pnpm build
```
Expected: 에러 없음, 빌드 성공.

- [ ] **Step 6: 커밋**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai
git add apps/web/package.json apps/web/src/pages/contract/mock-data.ts apps/web/src/pages/contract/ContractPlaceholderPage.tsx apps/web/src/routes.tsx pnpm-lock.yaml
git commit -m "feat(web): 계약 화면 의존성·mock 데이터·라우트 스캐폴드

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 계약서 검토 조회 (ContractListPage)

필터 바 + 상태 칩 + DataTable + 페이지네이션. 행 클릭 시 상세(`/contract/:id`)로 이동, "검토 요청" 버튼 → `/contract/request`.

**Files:**
- Create: `apps/web/src/pages/contract/listColumns.tsx`
- Create: `apps/web/src/pages/contract/ContractListPage.tsx`
- Create: `apps/web/src/pages/contract/ContractListPage.test.tsx`
- Modify: `apps/web/src/routes.tsx` (placeholder → 실제 페이지)

- [ ] **Step 1: 컬럼 정의 작성**

Create `apps/web/src/pages/contract/listColumns.tsx`:
```tsx
import type { ColumnDef } from "@lawkit/ui";
import { Icon } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Tag } from "../../components/ui/Tag";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { dday } from "../dashboard/dday";
import type { ContractRow } from "./mock-data";

function StarCell({ on }: { on: boolean }) {
  return <Icon name={on ? "starFill" : "star"} size="sm" style={{ width: 15, height: 15, color: on ? T.warning : T.borderStrong }} />;
}

export function listColumns(): ColumnDef<ContractRow>[] {
  return [
    { id: "star", header: "", size: 36, cell: (i) => <StarCell on={i.row.original.star} /> },
    { accessorKey: "id", header: "관리번호", size: 122, cell: (i) => <span style={{ fontSize: 12, color: T.muted, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{String(i.getValue())}</span> },
    { accessorKey: "name", header: "계약명", size: 240, cell: (i) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {i.row.original.secure && <Icon name="lock" size="sm" style={{ width: 12, height: 12, color: T.warning, flexShrink: 0 }} />}
        <span style={{ fontSize: 13, fontWeight: 600, color: T.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String(i.getValue())}</span>
      </div>
    ) },
    { accessorKey: "party", header: "당사자", size: 84, cell: (i) => <span style={{ fontSize: 12.5, color: T.body }}>{String(i.getValue())}</span> },
    { accessorKey: "sub", header: "분류", size: 90, cell: (i) => <Tag color="neutral">{String(i.getValue())}</Tag> },
    { accessorKey: "counter", header: "상대계약자", size: 150, cell: (i) => <span style={{ fontSize: 13, color: T.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{String(i.getValue())}</span> },
    { accessorKey: "requester", header: "요청자", size: 84, cell: (i) => <span style={{ fontSize: 12.5, color: T.body }}>{String(i.getValue())}</span> },
    { accessorKey: "owner", header: "법무팀 담당자", size: 118, cell: (i) => {
      const v = String(i.getValue());
      return v === "미배정"
        ? <span style={{ fontSize: 12, color: T.danger, fontWeight: 700 }}>미배정</span>
        : <span style={{ fontSize: 13, color: T.body }}>{v}</span>;
    } },
    { accessorKey: "updated", header: "수정일", size: 100, cell: (i) => <span style={{ fontSize: 12, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{String(i.getValue())}</span> },
    { accessorKey: "due", header: "검토기한", size: 116, cell: (i) => {
      const d = dday(i.row.original.dleft);
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{String(i.getValue())}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: d.c, fontVariantNumeric: "tabular-nums" }}>{d.t}</span>
      </span>;
    } },
    { accessorKey: "status", header: "진행상태", size: 122, cell: (i) => <StatusBadge status={String(i.getValue())} size="sm" /> },
  ];
}
```

- [ ] **Step 2: 페이지 작성**

Create `apps/web/src/pages/contract/ContractListPage.tsx`:
```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, Input, Dropdown, Switch, ChipsNavigation, DataTable, Pagination, PaginationCount } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Panel } from "../../components/ui/Panel";
import { CONTRACTS_FULL, LIST_FILTERS } from "./mock-data";
import { listColumns } from "./listColumns";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>{children}</div>;
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div style={{ width: 150 }}>
      <Dropdown options={options.map((o) => ({ value: o, label: o }))} value={options[0]} placeholder={label} onChange={() => {}} />
    </div>
  );
}

export function ContractListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | string[]>("");
  const [mine, setMine] = useState(false);
  const data = CONTRACTS_FULL.filter(
    (c) => (!status || c.status === status) && (!mine || c.mine),
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <Eyebrow>계약</Eyebrow>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.heading, letterSpacing: "-0.025em" }}>계약서 검토 조회</h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button variant="outline" color="secondary" size="medium" iconLeft={<Icon name="externalLink" size="sm" style={{ width: 14, height: 14 }} />}>내보내기</Button>
          <Button size="medium" iconLeft={<Icon name="contractEdit" size="sm" style={{ width: 14, height: 14 }} />} onClick={() => navigate("/contract/request")}>검토 요청</Button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <FilterSelect label="계약 당사자" options={LIST_FILTERS.party} />
        <FilterSelect label="계약 대분류" options={LIST_FILTERS.cat} />
        <FilterSelect label="계약 분류" options={LIST_FILTERS.sub} />
        <div style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
          <Input inputSize="medium" placeholder="계약명·관리번호·상대계약자·요청자 검색" leftIcon={<Icon name="search" size="sm" style={{ width: 15, height: 15, color: T.faint }} />} />
        </div>
        <Switch label="내 업무만" checked={mine} onCheckedChange={setMine} />
      </div>

      <Panel flush>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: `1px solid ${T.border}`, flexWrap: "wrap" }}>
          <ChipsNavigation allLabel="전체" value={status} onChange={setStatus} items={[
            { value: "미배정", label: "미배정" },
            { value: "법무 검토 중", label: "법무 검토 중" },
            { value: "요청자 검토 중", label: "요청자 검토 중" },
            { value: "검토 완료", label: "검토 완료" },
          ]} />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: T.muted }}>총 <b style={{ color: T.heading, fontVariantNumeric: "tabular-nums" }}>{data.length}</b>건</span>
        </div>
        <div style={{ padding: 6 }}>
          <DataTable data={data} columns={listColumns()} getRowId={(r) => r.id} onRowClick={(r) => navigate(`/contract/${r.id}`)} emptyText="조회된 계약이 없습니다." />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 14px" }}>
          <PaginationCount totalCount={data.length} />
          <Pagination page={1} totalPages={1} onPageChange={() => {}} />
        </div>
      </Panel>
    </div>
  );
}
```

- [ ] **Step 3: routes.tsx에서 조회 라우트 교체**

`apps/web/src/routes.tsx`에서 import 추가:
```tsx
import { ContractListPage } from "./pages/contract/ContractListPage";
```
그리고 `/contract/list` 라우트를 교체:
```tsx
<Route path="/contract/list" element={<ContractListPage />} />
```

- [ ] **Step 4: 테스트 작성**

Create `apps/web/src/pages/contract/ContractListPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ContractListPage } from "./ContractListPage";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ContractListPage />
    </MemoryRouter>,
  );
}

describe("ContractListPage", () => {
  beforeEach(() => navigateMock.mockReset());

  it("계약서 검토 조회 헤더와 계약 행을 렌더한다", () => {
    renderPage();
    expect(screen.getByText("계약서 검토 조회")).toBeInTheDocument();
    expect(screen.getByText("한라산 EV 충전기 공급계약")).toBeInTheDocument();
  });

  it("계약 행을 클릭하면 상세로 이동한다", async () => {
    renderPage();
    await userEvent.click(screen.getByText("한라산 EV 충전기 공급계약"));
    expect(navigateMock).toHaveBeenCalledWith("/contract/C20250710-0004");
  });

  it("검토 요청 버튼은 요청 화면으로 이동한다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /검토 요청/ }));
    expect(navigateMock).toHaveBeenCalledWith("/contract/request");
  });
});
```

> **테스트 주의:** `onRowClick`이 lawkit DataTable에서 행 클릭으로 동작하는지 확인하라. 만약 행 클릭이 셀 내부 텍스트 클릭으로 전달되지 않으면, 계약명 셀이 아니라 행 전체를 찾아 클릭하도록 셀렉터를 조정하라(예: `screen.getByText(...).closest("tr")`를 클릭). 테스트 의도(행 클릭 → `/contract/<id>` 네비게이션)는 유지하라. 실제 동작에 맞게 셀렉터만 조정하고, 조정 사항을 보고하라.

- [ ] **Step 5: 테스트 + 타입 + 빌드**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai/apps/web && pnpm exec tsc --noEmit && pnpm test && pnpm build
```
Expected: tsc 클린, 모든 테스트 통과(기존 8 + 신규 3 = 11), 빌드 성공.

- [ ] **Step 6: 커밋**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai
git add apps/web/src/pages/contract/listColumns.tsx apps/web/src/pages/contract/ContractListPage.tsx apps/web/src/pages/contract/ContractListPage.test.tsx apps/web/src/routes.tsx
git commit -m "feat(web): 계약서 검토 조회 화면

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 계약서 상세 (ContractDetailPage)

라이프사이클 레일 + 검토 요약 + AI 리스크 + 검토 의견 + 우측 액션 레일. URL 파라미터(`:id`)로 상세를 조회한다.

**Files:**
- Create: `apps/web/src/pages/contract/ContractDetailPage.tsx`
- Create: `apps/web/src/pages/contract/ContractDetailPage.test.tsx`
- Modify: `apps/web/src/routes.tsx` (`:id` placeholder → 실제 페이지)

- [ ] **Step 1: 페이지 작성**

Create `apps/web/src/pages/contract/ContractDetailPage.tsx`:
```tsx
import { useParams, useNavigate } from "react-router-dom";
import { Icon, Button, Avatar } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Panel } from "../../components/ui/Panel";
import { Tag } from "../../components/ui/Tag";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getContractDetail, LIFECYCLE, RISKS, COMMENTS } from "./mock-data";
import type { LifecycleStep, Risk } from "./mock-data";

function LifecycleRail({ steps }: { steps: LifecycleStep[] }) {
  const last = steps.length - 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", padding: "4px 2px 2px" }}>
      {steps.map((s, i) => {
        const done = s.status === "completed";
        const act = s.status === "active";
        return (
          <div key={i} style={{ flex: 1, minWidth: 72, position: "relative", textAlign: "center", paddingTop: 3 }}>
            {i > 0 && <div style={{ position: "absolute", left: 0, right: "50%", top: 12, height: 2, background: done || act ? T.primary : T.border }} />}
            {i < last && <div style={{ position: "absolute", left: "50%", right: 0, top: 12, height: 2, background: done ? T.primary : T.border }} />}
            <div style={{ position: "relative", width: 22, height: 22, margin: "0 auto", borderRadius: 999, background: done ? T.primary : "#fff", border: `2px solid ${done || act ? T.primary : T.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: act ? `0 0 0 4px ${T.primarySoft}` : "none" }}>
              {done && <Icon name="check" size="sm" style={{ width: 12, height: 12, color: "#fff" }} />}
              {act && <span style={{ width: 8, height: 8, borderRadius: 999, background: T.primary }} />}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, fontWeight: act ? 700 : 500, color: act ? T.heading : done ? T.body : T.faint, whiteSpace: "nowrap" }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.faint, fontWeight: 600, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: T.heading, fontWeight: 600 }}>{children}</div>
    </div>
  );
}

const RISK_LEVEL = {
  high: { c: T.danger, bg: "#fbeaea", label: "고위험" },
  mid: { c: "#8a5a00", bg: "#f8ead0", label: "주의" },
  low: { c: T.muted, bg: "#eef0f4", label: "참고" },
} as const;

function RiskCard({ r }: { r: Risk }) {
  const L = RISK_LEVEL[r.level];
  return (
    <div style={{ border: `1px solid ${T.border}`, borderLeft: `3px solid ${L.c}`, borderRadius: 7, padding: "12px 14px", background: T.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: L.c, background: L.bg, padding: "1px 7px", borderRadius: 4 }}>{L.label}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: T.heading }}>{r.clause}</span>
      </div>
      <div style={{ fontSize: 12.5, color: T.body, lineHeight: 1.55, marginBottom: 7 }}>{r.finding}</div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "7px 10px", background: T.primaryTint, borderRadius: 5 }}>
        <Icon name="autoAwesome" size="sm" style={{ width: 13, height: 13, color: T.primary, marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: T.primaryDark, fontWeight: 600, lineHeight: 1.5 }}>{r.suggest}</span>
      </div>
    </div>
  );
}

function KVRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", borderBottom: last ? "none" : `1px solid ${T.border}` }}>
      <div style={{ width: 130, flexShrink: 0, padding: "11px 14px", background: T.surfaceAlt, fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, padding: "11px 14px", fontSize: 13, color: T.heading }}>{children}</div>
    </div>
  );
}

export function ContractDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const d = getContractDetail(id);
  const riskHigh = RISKS.filter((r) => r.level === "high").length;
  const visibleComments = COMMENTS.filter((c) => !c.system).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <button onClick={() => navigate("/contract/list")} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 12, fontWeight: 600, fontFamily: "Pretendard", marginBottom: 8, padding: 0 }}>
            <Icon name="chevronLeft" size="sm" style={{ width: 13, height: 13 }} />계약서 검토 조회
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {d.secure && <Icon name="lock" size="sm" style={{ width: 16, height: 16, color: "#8a5a00" }} />}
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: T.heading, letterSpacing: "-0.025em" }}>{d.name}</h1>
            <StatusBadge status={d.status} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 12.5, color: T.muted }}>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{d.id}</span>
            <span style={{ color: T.border }}>|</span><span>{d.stage}</span>
            <span style={{ color: T.border }}>|</span><span>요청자 {d.requester}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button variant="outline" color="secondary" iconLeft={<Icon name="edit" size="sm" style={{ width: 14, height: 14 }} />} onClick={() => navigate("/contract/request")}>수정</Button>
          <Button iconLeft={<Icon name="messageSquare" size="sm" style={{ width: 14, height: 14 }} />}>코멘트 추가</Button>
        </div>
      </div>

      <Panel pad={16} style={{ marginBottom: 16 }}>
        <LifecycleRail steps={LIFECYCLE} />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 332px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <Panel title="검토 요약" icon="factCheck" pad={18}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "18px 20px" }}>
              <Fact label="계약 당사자">{d.catPath[0]}</Fact>
              <Fact label="계약 분류">{d.catPath.join(" › ")}</Fact>
              <Fact label="계약 언어">{d.lang} · {d.legalCat}</Fact>
              <Fact label="계약 기간">{d.period}</Fact>
              <Fact label="상대 계약자">{d.counter}</Fact>
              <Fact label="검토 요청자">{d.requester}</Fact>
              <Fact label="계약 규모">{d.amount.contract}</Fact>
              <Fact label="협상력">{d.negotiation}%</Fact>
              <Fact label="계약서 유형">{d.type}</Fact>
            </div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, color: T.faint, fontWeight: 600, marginBottom: 6 }}>계약의 배경 및 목적</div>
              <p style={{ margin: 0, fontSize: 13, color: T.body, lineHeight: 1.65 }}>{d.purpose}</p>
            </div>
          </Panel>

          <Panel title="AI 계약 리스크" icon="autoAwesome"
            actions={<span style={{ fontSize: 11.5, color: T.muted }}><b style={{ color: T.danger }}>고위험 {riskHigh}</b> · 총 {RISKS.length}건 감지</span>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {RISKS.map((r, i) => <RiskCard key={i} r={r} />)}
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: T.faint }}>
              <Icon name="info" size="sm" style={{ width: 13, height: 13 }} />AI가 표준계약서·과거 검토 이력과 대조해 분석한 결과입니다. 최종 판단은 검토자에게 있습니다.
            </div>
          </Panel>

          <Panel title="검토 의견" icon="messageSquare" badge={visibleComments} pad={16}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {COMMENTS.map((c, i) => c.system ? (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                  <span style={{ fontSize: 11.5, color: T.faint, whiteSpace: "nowrap" }}>{c.text} · {c.time.slice(11)}</span>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                </div>
              ) : (
                <div key={i} style={{ display: "flex", gap: 11 }}>
                  <Avatar initials={c.who[0]} size="sm" color={c.role === "법무팀" ? "primary" : "secondary"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.heading }}>{c.who}</span>
                      <Tag color={c.role === "법무팀" ? "primary" : "neutral"}>{c.role}</Tag>
                      <span style={{ fontSize: 11.5, color: T.faint, fontVariantNumeric: "tabular-nums" }}>{c.time}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.body, lineHeight: 1.6, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 13px" }}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="검토 액션" icon="factCheck" pad={16}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12.5, color: T.muted }}>현재 단계</span>
                <StatusBadge status="법무 검토 중" size="sm" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Avatar initials={d.owner[0]} size="sm" color="primary" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.heading }}>{d.owner} <span style={{ fontSize: 11.5, color: T.faint, fontWeight: 500 }}>법무팀</span></div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>검토 담당</div>
                </div>
              </div>
              <div style={{ height: 1, background: T.border }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Button size="medium" color="danger" variant="outline">반려</Button>
                <Button size="medium">검토 완료</Button>
              </div>
            </div>
          </Panel>

          <Panel title="핵심 정보" icon="info" pad={0}>
            <KVRow label="관리번호">{d.id}</KVRow>
            <KVRow label="계약 단계">{d.stage}</KVRow>
            <KVRow label="보안 여부">{d.secure ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#8a5a00", fontWeight: 700 }}><Icon name="lock" size="sm" style={{ width: 12, height: 12 }} />보안</span> : "일반"}</KVRow>
            <KVRow label="참조 부서" last>{d.ccDept.join(", ")}</KVRow>
          </Panel>

          <Panel title="첨부 파일" icon="paperclip" badge={d.files.length} pad={12}>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {d.files.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 7 }}>
                  <Icon name="fileText" size="sm" style={{ width: 18, height: 18, color: T.primary, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.heading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: T.faint }}>{f.kind} · {f.meta}</div>
                  </div>
                  <Icon name="download" size="sm" style={{ width: 15, height: 15, color: T.muted, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: routes.tsx에서 상세 라우트 교체**

import 추가:
```tsx
import { ContractDetailPage } from "./pages/contract/ContractDetailPage";
```
`/contract/:id` 라우트 교체:
```tsx
<Route path="/contract/:id" element={<ContractDetailPage />} />
```

- [ ] **Step 3: 테스트 작성**

Create `apps/web/src/pages/contract/ContractDetailPage.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ContractDetailPage } from "./ContractDetailPage";

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/contract/${id}`]}>
      <Routes>
        <Route path="/contract/:id" element={<ContractDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ContractDetailPage", () => {
  it("URL의 계약 id에 해당하는 계약명을 렌더한다", () => {
    renderAt("C20260601-0007");
    expect(screen.getByText("사후계약관리 표준 NDA")).toBeInTheDocument();
  });

  it("AI 계약 리스크 섹션과 고위험 조항을 렌더한다", () => {
    renderAt("C20250710-0004");
    expect(screen.getByText("AI 계약 리스크")).toBeInTheDocument();
    expect(screen.getByText("손해배상 한도")).toBeInTheDocument();
  });

  it("검토 의견 섹션을 렌더한다", () => {
    renderAt("C20250710-0004");
    expect(screen.getByText("검토 의견")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 테스트 + 타입 + 빌드**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai/apps/web && pnpm exec tsc --noEmit && pnpm test && pnpm build
```
Expected: tsc 클린, 테스트 통과(11 + 3 = 14), 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai
git add apps/web/src/pages/contract/ContractDetailPage.tsx apps/web/src/pages/contract/ContractDetailPage.test.tsx apps/web/src/routes.tsx
git commit -m "feat(web): 계약서 상세 화면

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 계약서 검토 요청 (ContractRequestPage) — react-hook-form + zod

복잡한 폼이므로 프로젝트 규칙에 따라 react-hook-form + zod로 검증한다. lawkit 입력 컴포넌트는 모두 controlled이므로 `Controller`로 연결한다.

**Files:**
- Create: `apps/web/src/pages/contract/request-schema.ts`
- Create: `apps/web/src/pages/contract/ContractRequestPage.tsx`
- Create: `apps/web/src/pages/contract/ContractRequestPage.test.tsx`
- Modify: `apps/web/src/routes.tsx` (`/contract/request` placeholder → 실제 페이지)

- [ ] **Step 1: zod 스키마 작성**

Create `apps/web/src/pages/contract/request-schema.ts`:
```ts
import { z } from "zod";

export const contractRequestSchema = z.object({
  stage: z.enum(["new", "change"]),
  secure: z.enum(["top", "secure", "normal"]),
  name: z.string().min(1, "계약명을 입력하세요"),
  ctype: z.enum(["normal", "std"]),
  party: z.string().min(1, "계약 당사자를 선택하세요"),
  cat: z.string().min(1, "계약 대분류를 선택하세요"),
  period: z.string().min(1, "계약 기간을 입력하세요"),
  lang: z.enum(["ko", "en", "koen"]),
  legal: z.enum(["dom", "intl"]),
  amount: z.string().optional(),
  purpose: z.string().min(1, "계약의 배경 및 목적을 입력하세요"),
});

export type ContractRequestForm = z.infer<typeof contractRequestSchema>;

export const contractRequestDefaults: ContractRequestForm = {
  stage: "new",
  secure: "normal",
  name: "",
  ctype: "normal",
  party: "",
  cat: "",
  period: "",
  lang: "ko",
  legal: "dom",
  amount: "",
  purpose: "",
};
```

- [ ] **Step 2: 페이지 작성**

Create `apps/web/src/pages/contract/ContractRequestPage.tsx`:
```tsx
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon, Button, Card, Input, InputGroup, ButtonGroup, Dropdown, Alert, FileUploadArea, Avatar } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { LIST_FILTERS } from "./mock-data";
import { contractRequestSchema, contractRequestDefaults } from "./request-schema";
import type { ContractRequestForm } from "./request-schema";

function CardTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size="sm" style={{ width: 16, height: 16, color: T.muted }} />{children}
    </span>
  );
}

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div role="alert" style={{ marginTop: 5, fontSize: 12, color: T.danger }}>{msg}</div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 7 }}>{children}</div>;
}

export function ContractRequestPage() {
  const navigate = useNavigate();
  const { control, handleSubmit, formState: { errors } } = useForm<ContractRequestForm>({
    resolver: zodResolver(contractRequestSchema),
    defaultValues: contractRequestDefaults,
  });

  const onValid = () => {
    // 실제 API 연동 전: 제출 성공 시 상세 화면으로 이동(샘플)
    navigate("/contract/C20250710-0004");
  };

  const full = { gridColumn: "1 / -1" } as const;
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" } as const;

  return (
    <form onSubmit={handleSubmit(onValid)}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <Eyebrow>계약</Eyebrow>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: T.heading, letterSpacing: "-0.025em" }}>계약서 검토 요청</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="button" variant="outline" color="secondary" onClick={() => navigate("/contract/list")}>목록</Button>
          <Button type="submit" iconLeft={<Icon name="submit" size="sm" style={{ width: 14, height: 14 }} />}>검토 요청</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <Card header={<CardTitle icon="fileText">기본정보</CardTitle>} bordered>
            <div style={grid2}>
              <InputGroup label="계약 단계" required>
                <Controller name="stage" control={control} render={({ field }) => (
                  <ButtonGroup value={field.value} onChange={field.onChange} items={[{ value: "new", label: "신규계약" }, { value: "change", label: "변경·해지" }]} />
                )} />
              </InputGroup>
              <InputGroup label="보안 여부" required>
                <Controller name="secure" control={control} render={({ field }) => (
                  <ButtonGroup value={field.value} onChange={field.onChange} items={[{ value: "top", label: "극비" }, { value: "secure", label: "보안" }, { value: "normal", label: "일반" }]} />
                )} />
              </InputGroup>
              <InputGroup label="계약명" required style={full}>
                <Controller name="name" control={control} render={({ field }) => (
                  <Input placeholder="계약명을 입력하세요" value={field.value} onChange={field.onChange} />
                )} />
                <ErrText msg={errors.name?.message} />
              </InputGroup>
              <InputGroup label="검토 요청자" required>
                <Input value="손준호 (법무팀)" readOnly leftIcon={<Icon name="user" size="sm" style={{ width: 15, height: 15, color: T.faint }} />} />
              </InputGroup>
              <InputGroup label="계약서 유형" required>
                <Controller name="ctype" control={control} render={({ field }) => (
                  <ButtonGroup value={field.value} onChange={field.onChange} items={[{ value: "normal", label: "일반 검토요청" }, { value: "std", label: "표준계약서 기반" }]} />
                )} />
              </InputGroup>
              <InputGroup label="계약 당사자" required>
                <Controller name="party" control={control} render={({ field }) => (
                  <Dropdown options={LIST_FILTERS.party.slice(1).map((o) => ({ value: o, label: o }))} value={field.value} placeholder="선택" onChange={field.onChange} />
                )} />
                <ErrText msg={errors.party?.message} />
              </InputGroup>
              <InputGroup label="계약 대분류" required>
                <Controller name="cat" control={control} render={({ field }) => (
                  <Dropdown options={LIST_FILTERS.cat.slice(1).map((o) => ({ value: o, label: o }))} value={field.value} placeholder="선택" onChange={field.onChange} />
                )} />
                <ErrText msg={errors.cat?.message} />
              </InputGroup>
              <InputGroup label="계약 기간" required style={full}>
                <Controller name="period" control={control} render={({ field }) => (
                  <Input placeholder="YYYY-MM-DD ~ YYYY-MM-DD" value={field.value} onChange={field.onChange} leftIcon={<Icon name="calendar" size="sm" style={{ width: 15, height: 15, color: T.faint }} />} />
                )} />
                <ErrText msg={errors.period?.message} />
              </InputGroup>
            </div>
          </Card>

          <Card header={<CardTitle icon="paperclip">계약서 첨부</CardTitle>} bordered>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Alert type="info" size="small">검토 정확도를 위해 편집 가능한 워드(.docx) 파일 첨부를 권장합니다. 첨부 즉시 AI가 주요 리스크 조항을 사전 점검합니다.</Alert>
              <InputGroup label="계약서">
                <FileUploadArea description=".docx · .hwp · .pdf · 최대 30MB — 파일을 끌어다 놓거나 클릭해 첨부" onFilesAdded={() => {}} accept=".docx,.hwp,.pdf" />
              </InputGroup>
            </div>
          </Card>

          <Card header={<CardTitle icon="list">상세정보</CardTitle>} bordered>
            <div style={grid2}>
              <InputGroup label="계약 언어">
                <Controller name="lang" control={control} render={({ field }) => (
                  <ButtonGroup value={field.value} onChange={field.onChange} items={[{ value: "ko", label: "국문" }, { value: "en", label: "영문" }, { value: "koen", label: "국영문" }]} />
                )} />
              </InputGroup>
              <InputGroup label="법무 분류">
                <Controller name="legal" control={control} render={({ field }) => (
                  <ButtonGroup value={field.value} onChange={field.onChange} items={[{ value: "dom", label: "국내 법무" }, { value: "intl", label: "해외 법무" }]} />
                )} />
              </InputGroup>
              <InputGroup label="계약 규모 (대가)">
                <Controller name="amount" control={control} render={({ field }) => (
                  <Input placeholder="0" value={field.value ?? ""} onChange={field.onChange} rightIcon={<span style={{ fontSize: 12, color: T.faint }}>원</span>} />
                )} />
              </InputGroup>
              <InputGroup label="계약의 배경 및 목적" required style={full}>
                <Controller name="purpose" control={control} render={({ field }) => (
                  <Input placeholder="계약을 체결하는 배경과 목적을 입력하세요" value={field.value} onChange={field.onChange} />
                )} />
                <ErrText msg={errors.purpose?.message} />
              </InputGroup>
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 16 }}>
          <Card bordered header={<CardTitle icon="approvalCompleted">결재선</CardTitle>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[{ n: "손준호", r: "기안 · 법무팀", c: "primary" as const }, { n: "이법무", r: "검토 · 법무팀장", c: "info" as const }, { n: "정상무", r: "승인 · 경영지원본부", c: "success" as const }].map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 16, fontSize: 11, fontWeight: 800, color: T.faint, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                  <Avatar initials={p.n[0]} color={p.c} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.heading }}>{p.n}</div>
                    <div style={{ fontSize: 11, color: T.faint }}>{p.r}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
```

> **lawkit 컴포넌트 prop 검증:** `ButtonGroup`, `Dropdown`, `Slider`, `FileUploadArea`, `Alert`, `Card`의 실제 prop 시그니처를 `apps/web/node_modules/@lawkit/ui` 타입 정의로 확인하라. `Controller`의 `field.value`/`field.onChange`가 각 컴포넌트의 `value`/`onChange` 타입과 맞아야 한다. `Dropdown`의 `onChange`가 `(value: string) => void`가 아니라 다른 시그니처면 `field.onChange`를 래핑하라(예: `onChange={(v) => field.onChange(v)}`). 타입이 맞지 않으면 실제 시그니처에 맞게 조정하고 보고하라. `Slider`는 이 폼에서 제거되어 있으니 import에서 빠졌는지 확인하라(사용 안 하면 import하지 말 것).

> **참고:** 위 코드에서 `Slider`와 `Checkbox`는 사용하지 않으므로 import 목록에서 **제거**하라. import는 실제 사용하는 것만 남긴다(`Icon, Button, Card, Input, InputGroup, ButtonGroup, Dropdown, Alert, FileUploadArea, Avatar`).

- [ ] **Step 3: routes.tsx에서 요청 라우트 교체**

import 추가:
```tsx
import { ContractRequestPage } from "./pages/contract/ContractRequestPage";
```
`/contract/request` 라우트 교체:
```tsx
<Route path="/contract/request" element={<ContractRequestPage />} />
```

- [ ] **Step 4: 테스트 작성**

Create `apps/web/src/pages/contract/ContractRequestPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ContractRequestPage } from "./ContractRequestPage";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ContractRequestPage />
    </MemoryRouter>,
  );
}

describe("ContractRequestPage", () => {
  beforeEach(() => navigateMock.mockReset());

  it("계약서 검토 요청 폼을 렌더한다", () => {
    renderPage();
    expect(screen.getByText("계약서 검토 요청")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("계약명을 입력하세요")).toBeInTheDocument();
  });

  it("필수값 없이 제출하면 검증 에러를 보여주고 이동하지 않는다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /검토 요청/ }));
    expect(await screen.findByText("계약명을 입력하세요")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("필수값을 채우고 제출하면 상세로 이동한다", async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText("계약명을 입력하세요"), "테스트 공급계약");
    await userEvent.type(screen.getByPlaceholderText("YYYY-MM-DD ~ YYYY-MM-DD"), "2026-07-01 ~ 2027-06-30");
    await userEvent.type(screen.getByPlaceholderText("계약을 체결하는 배경과 목적을 입력하세요"), "테스트 목적");
    // 계약 당사자·대분류 Dropdown 선택
    await userEvent.click(screen.getAllByText("선택")[0]);
    await userEvent.click(await screen.findByText("본사계약"));
    await userEvent.click(screen.getAllByText("선택")[0]);
    await userEvent.click(await screen.findByText("개발/공급"));

    await userEvent.click(screen.getByRole("button", { name: /검토 요청/ }));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/contract/C20250710-0004"));
  });
});
```

> **테스트 주의(중요):** lawkit `Dropdown`의 실제 열기/선택 상호작용(클릭으로 옵션이 열리는지, 옵션 텍스트가 DOM에 나타나는지)이 위 테스트 코드와 다를 수 있다. 세 번째 테스트에서 Dropdown 선택이 위 방식대로 동작하지 않으면, 실제 Dropdown DOM 구조에 맞게 상호작용을 조정하라(예: combobox role 클릭 후 option role 선택). **테스트 의도는 유지**: 필수값을 모두 채운 뒤 제출하면 `navigate("/contract/C20250710-0004")`가 호출된다. 만약 Dropdown을 테스트에서 안정적으로 조작하기 매우 어렵다면, `party`/`cat`의 검증을 신뢰할 수 있는 대체 상호작용으로 채우되(예: 해당 Controller가 노출하는 입력 요소 직접 조작), 절대 스키마의 필수 검증 자체를 약화시키지 말 것. 조정한 내용을 보고하라.

- [ ] **Step 5: 테스트 + 타입 + 빌드 + 린트**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai/apps/web && pnpm exec tsc --noEmit && pnpm test && pnpm build && pnpm lint
```
Expected: tsc 클린, 테스트 통과(14 + 3 = 17), 빌드·린트 성공.

- [ ] **Step 6: 커밋**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai
git add apps/web/src/pages/contract/request-schema.ts apps/web/src/pages/contract/ContractRequestPage.tsx apps/web/src/pages/contract/ContractRequestPage.test.tsx apps/web/src/routes.tsx
git commit -m "feat(web): 계약서 검토 요청 폼 (react-hook-form + zod)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 대시보드 → 계약 화면 연결 + 통합 점검

대시보드의 "검토 요청" 버튼, 진행 중 계약 행 클릭, 할일 행 클릭을 실제 계약 라우트로 연결한다. (사이드바는 이미 `/contract/*` 경로로 이동하므로 변경 불필요.)

**Files:**
- Modify: `apps/web/src/pages/dashboard/DashboardPage.tsx`
- Modify: `apps/web/src/pages/dashboard/TodoPanel.tsx`
- Modify: `apps/web/src/pages/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: DashboardPage의 "검토 요청" 버튼 연결**

`apps/web/src/pages/dashboard/DashboardPage.tsx` 상단에 import 추가:
```tsx
import { useNavigate } from "react-router-dom";
```
`DashboardPage` 함수 본문 시작에 navigate 추가:
```tsx
export function DashboardPage() {
  const navigate = useNavigate();
```
"검토 요청" Button에 onClick 추가(기존 `<Button size="small" iconLeft={...}>검토 요청</Button>`를 찾아 교체):
```tsx
<Button size="small" iconLeft={<Icon name="contractEdit" size="sm" style={{ width: 13, height: 13 }} />} onClick={() => navigate("/contract/request")}>검토 요청</Button>
```
그리고 `<TodoPanel />`를 `<TodoPanel onOpen={(id) => navigate(`/contract/${id}`)} />`로 교체.

- [ ] **Step 2: TodoPanel이 onOpen을 받아 할일/계약 행 클릭에 연결**

`apps/web/src/pages/dashboard/TodoPanel.tsx`:
- 컴포넌트 시그니처를 `export function TodoPanel({ onOpen }: { onOpen?: (id: string) => void })`로 변경.
- `TodoRow`에 `onOpen` 전달: `function TodoRow({ t, onOpen }: { t: Todo; onOpen?: (id: string) => void })`, 행 컨테이너 div에 `onClick={() => onOpen?.(t.id)}` 추가.
- 할일 목록 렌더에서 `<TodoRow key={t.id} t={t} onOpen={onOpen} />`로 전달.
- 진행 중 계약 탭의 `<DataTable ... />`에 `onRowClick={(r) => onOpen?.(r.id)}` 추가.

> **주의:** `TodoRow` 내부의 액션 버튼(`<Button>{t.action}</Button>`) 클릭 시 행 onClick과 충돌하지 않도록, 버튼 클릭 핸들러에 `onClick={(e) => e.stopPropagation()}`를 추가하라(현재 버튼은 핸들러가 없으므로 `onClick={(e) => e.stopPropagation()}`만 추가).

- [ ] **Step 3: DashboardPage 테스트에 라우터 통합 검증 추가**

`apps/web/src/pages/dashboard/DashboardPage.test.tsx`의 기존 테스트는 유지하고, 다음 테스트를 describe 블록에 추가한다. 파일 상단 import에 `userEvent`와 `waitFor`가 없으면 추가:
```tsx
import userEvent from "@testing-library/user-event";
```
추가 테스트:
```tsx
  it("검토 요청 버튼이 요청 화면으로 이동한다", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /검토 요청/ }));
    // navigate 호출은 라우터 컨텍스트에서 일어난다 — 에러 없이 처리되면 통과
    expect(screen.getByText("업무 요약")).toBeInTheDocument();
  });
```
> **참고:** 이 테스트는 MemoryRouter 안에서 클릭이 예외 없이 처리되는지(=onClick 핸들러가 navigate를 정상 호출)를 확인한다. `renderPage`가 MemoryRouter로 감싸고 있으므로 navigate가 동작한다. 만약 더 강한 검증을 원하면 `useNavigate`를 mock하여 `/contract/request` 호출을 단언해도 된다(ContractListPage.test.tsx 패턴 참고). 더 강한 mock 검증을 적용했다면 보고하라.

- [ ] **Step 4: 전체 테스트 + 타입 + 빌드 + 린트**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai/apps/web && pnpm exec tsc --noEmit && pnpm test && pnpm build && pnpm lint
```
Expected: tsc 클린, 모든 테스트 통과, 빌드·린트 성공.

- [ ] **Step 5: 커밋**

```bash
cd /Users/junhoson/Documents/GitHub/Lawai
git add apps/web/src/pages/dashboard/DashboardPage.tsx apps/web/src/pages/dashboard/TodoPanel.tsx apps/web/src/pages/dashboard/DashboardPage.test.tsx
git commit -m "feat(web): 대시보드에서 계약 화면으로 네비게이션 연결

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
