# 회사 전환 UI (Spec 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이드바 하단에 현재 활성 테넌트(회사)를 표시하고, 다중 소속 사용자가 드롭다운으로 회사를 전환(토큰 재발급 + 전체 새로고침)할 수 있게 한다. 부수로 foot 의 하드코딩 사용자 정보를 실데이터로 교체한다.

**Architecture:** 웹(apps/web) 전용. 신규 `api/tenants.ts` 가 Spec 1 기완성 엔드포인트(`GET /auth/me/tenants`, `POST /auth/switch-tenant`)를 감싸고, `useTenantSwitcher` 훅(react-query)이 상태·전환 로직을 집약, `TenantSwitcher` 컴포넌트는 뷰만 담당(NotificationBell 의 선언적 open + backdrop 패턴). 전환 성공 시 `setTokens` → `window.location.assign("/")` 전체 새로고침.

**Tech Stack:** React 19, @tanstack/react-query, vanilla-extract(+`design/tokens` T), vitest + testing-library, @lawai/contracts 타입.

**Spec:** `docs/superpowers/specs/2026-09-09-tenant-switcher-design.md`

## Global Constraints

- 프론트 컨벤션(CLAUDE.md): 화살표 함수, `useEffect`/`useMemo`/`useCallback` 금지, 인라인 `style={{}}` 금지(훅이 차단), 스타일은 vanilla-extract + 토큰, 로직은 `use~` 훅 분리, 이벤트 핸들러 `handle~`.
- 커밋: `<type>: <내용>`, 이모지 금지.
- 백엔드·contracts 패키지·admin 앱 변경 없음. DB 스키마 변경 없음(ERD 동기화 불필요).
- 타입은 `@lawai/contracts` 기존 것 재사용: `TenantMembership { tenantId; name; role; isActive }`, `AuthTokens { accessToken; refreshToken }`, `PublicUser`, `TenantRole`.
- 테스트 실행: `pnpm --filter @lawai/web test` (vitest run). 특정 파일: `pnpm --filter @lawai/web test -- src/api/tenants.test.ts`.

---

### Task 1: `api/tenants.ts` — 테넌트 API 모듈

**Files:**
- Create: `apps/web/src/api/tenants.ts`
- Test: `apps/web/src/api/tenants.test.ts`

**Interfaces:**
- Consumes: `apiFetch`(`./client`), `@lawai/contracts` 의 `TenantMembership`/`AuthTokens`/`PublicUser`.
- Produces: `getMyTenants(): Promise<TenantMembership[]>`, `switchTenant(tenantId: string): Promise<SwitchTenantResponse>` (`SwitchTenantResponse = { user: PublicUser; tokens: AuthTokens }`). Task 3 이 사용.

> 서버 응답 주의: `/auth/me/tenants` 는 `{ tenants: TenantMembership[] }` 로 **래핑**되어 온다(MyTenantsResponse). api 함수에서 언래핑해 배열로 반환한다. `/auth/switch-tenant` 는 login 과 동일한 `{ user, tokens }` 형태(AuthResult).

- [ ] **Step 1: 실패 테스트 작성** — `apps/web/src/api/tenants.test.ts` (auth.test.ts 의 mockFetch 패턴 복제)

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMyTenants, switchTenant } from "./tenants";

const BASE = "http://localhost:3000";

function mockFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const membership = {
  tenantId: "t-1",
  name: "A상사",
  role: "inHouseCounsel",
  isActive: true,
};

describe("tenants api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("getMyTenants는 /auth/me/tenants로 GET하고 tenants 배열을 언래핑해 반환한다", async () => {
    localStorage.setItem("accessToken", "tok123");
    const fetchMock = mockFetch({ tenants: [membership] });
    const res = await getMyTenants();
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/auth/me/tenants`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok123" }),
      }),
    );
    expect(res).toEqual([membership]);
  });

  it("switchTenant는 /auth/switch-tenant로 tenantId를 POST하고 새 토큰을 반환한다", async () => {
    const fetchMock = mockFetch({
      user: { id: "u1", email: "a@b.com", name: "A", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "newAt", refreshToken: "newRt" },
    });
    const res = await switchTenant("t-2");
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/auth/switch-tenant`,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ tenantId: "t-2" }) }),
    );
    expect(res.tokens.accessToken).toBe("newAt");
  });

  it("switchTenant는 403 응답 시 서버 메시지로 throw한다", async () => {
    mockFetch({ message: "해당 테넌트의 멤버가 아닙니다" }, false, 403);
    await expect(switchTenant("t-x")).rejects.toThrow("해당 테넌트의 멤버가 아닙니다");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/web test -- src/api/tenants.test.ts`
Expected: FAIL — `./tenants` 모듈 없음.

- [ ] **Step 3: 구현** — `apps/web/src/api/tenants.ts`

```ts
import type { AuthTokens, PublicUser, TenantMembership } from "@lawai/contracts";
import { apiFetch } from "./client";

// GET /auth/me/tenants 는 { tenants: [...] } 로 래핑되어 온다(contracts MyTenantsResponse).
interface MyTenantsApiResponse {
  tenants: TenantMembership[];
}

// POST /auth/switch-tenant 는 login 과 동일한 형태(user + 새 토큰)를 반환한다.
export interface SwitchTenantResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

export const getMyTenants = (): Promise<TenantMembership[]> =>
  apiFetch<MyTenantsApiResponse>("/auth/me/tenants").then((res) => res.tenants);

export const switchTenant = (tenantId: string): Promise<SwitchTenantResponse> =>
  apiFetch<SwitchTenantResponse>("/auth/switch-tenant", {
    method: "POST",
    body: JSON.stringify({ tenantId }),
  });
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @lawai/web test -- src/api/tenants.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/tenants.ts apps/web/src/api/tenants.test.ts
git commit -m "feat: 테넌트 API 모듈 추가 (getMyTenants/switchTenant)"
```

---

### Task 2: `utils/tenantRoleLabel.ts` — 역할 한국어 라벨

**Files:**
- Create: `apps/web/src/utils/tenantRoleLabel.ts` (utils 디렉토리 신규 — 컨벤션의 공용 순수함수 위치)
- Test: `apps/web/src/utils/tenantRoleLabel.test.ts`

**Interfaces:**
- Consumes: `@lawai/contracts` 의 `TenantRole` (`"general" | "contractManager" | "inHouseCounsel" | "outsideCounsel" | "sealManager"`).
- Produces: `getTenantRoleLabel(role: TenantRole): string`. Task 4·5 가 사용.

- [ ] **Step 1: 실패 테스트 작성** — `apps/web/src/utils/tenantRoleLabel.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { getTenantRoleLabel } from "./tenantRoleLabel";

describe("getTenantRoleLabel", () => {
  it("모든 TenantRole 값을 한국어 라벨로 변환한다", () => {
    expect(getTenantRoleLabel("general")).toBe("일반");
    expect(getTenantRoleLabel("contractManager")).toBe("계약담당자");
    expect(getTenantRoleLabel("inHouseCounsel")).toBe("사내변호사");
    expect(getTenantRoleLabel("outsideCounsel")).toBe("사외변호사");
    expect(getTenantRoleLabel("sealManager")).toBe("날인담당자");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/web test -- src/utils/tenantRoleLabel.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `apps/web/src/utils/tenantRoleLabel.ts`

```ts
import type { TenantRole } from "@lawai/contracts";

// 테넌트 내 역할의 화면 표시용 한국어 라벨. Record 로 강제해 role 추가 시 컴파일 에러로 누락을 잡는다.
const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  general: "일반",
  contractManager: "계약담당자",
  inHouseCounsel: "사내변호사",
  outsideCounsel: "사외변호사",
  sealManager: "날인담당자",
};

export const getTenantRoleLabel = (role: TenantRole): string =>
  TENANT_ROLE_LABELS[role];
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @lawai/web test -- src/utils/tenantRoleLabel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/utils/tenantRoleLabel.ts apps/web/src/utils/tenantRoleLabel.test.ts
git commit -m "feat: 테넌트 역할 한국어 라벨 유틸 추가"
```

---

### Task 3: `useTenantSwitcher` + `useMe` 훅

**Files:**
- Create: `apps/web/src/components/layout/hooks/useTenantSwitcher.ts`
- Create: `apps/web/src/components/layout/hooks/useMe.ts`
- Test: `apps/web/src/components/layout/hooks/useTenantSwitcher.test.tsx`

**Interfaces:**
- Consumes: Task 1 의 `getMyTenants`/`switchTenant`, `setTokens`(`api/tokens`), `getMe`(`api/auth`).
- Produces:
  - `useTenantSwitcher(): { memberships: TenantMembership[]; activeMembership: TenantMembership | null; isLoading: boolean; switchTo: (tenantId: string) => void; switchingTenantId: string | null; isSwitchError: boolean }`
  - `useMe(): { me: PublicUser | null }`
  - `MY_TENANTS_QUERY_KEY = ["myTenants"]`, `ME_QUERY_KEY = ["me"]`
  - Task 4(컴포넌트)·Task 5(Sidebar foot)가 사용.

- [ ] **Step 1: 실패 테스트 작성** — `useTenantSwitcher.test.tsx` (api 모듈 mock + renderHook + QueryClientProvider, location mock 은 client.interceptor.test.ts 선례)

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { useTenantSwitcher } from "./useTenantSwitcher";
import { getMyTenants, switchTenant } from "../../../api/tenants";
import { setTokens } from "../../../api/tokens";

vi.mock("../../../api/tenants");
vi.mock("../../../api/tokens", () => ({ setTokens: vi.fn() }));

const memberships = [
  { tenantId: "t-1", name: "A상사", role: "inHouseCounsel" as const, isActive: true },
  { tenantId: "t-2", name: "B테크", role: "outsideCounsel" as const, isActive: false },
];

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useTenantSwitcher", () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMyTenants).mockResolvedValue(memberships);
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: vi.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("멤버십 목록과 활성 멤버십을 반환한다", async () => {
    const { result } = renderHook(() => useTenantSwitcher(), { wrapper });
    await waitFor(() => expect(result.current.memberships).toHaveLength(2));
    expect(result.current.activeMembership?.tenantId).toBe("t-1");
  });

  it("switchTo 성공 시 새 토큰을 저장하고 루트로 전체 새로고침한다", async () => {
    vi.mocked(switchTenant).mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "A", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "newAt", refreshToken: "newRt" },
    });
    const { result } = renderHook(() => useTenantSwitcher(), { wrapper });
    await waitFor(() => expect(result.current.memberships).toHaveLength(2));

    result.current.switchTo("t-2");

    await waitFor(() => expect(setTokens).toHaveBeenCalledWith("newAt", "newRt"));
    expect(window.location.assign).toHaveBeenCalledWith("/");
  });

  it("switchTo 실패 시 isSwitchError가 true가 되고 새로고침하지 않는다", async () => {
    vi.mocked(switchTenant).mockRejectedValue(new Error("해당 테넌트의 멤버가 아닙니다"));
    const { result } = renderHook(() => useTenantSwitcher(), { wrapper });
    await waitFor(() => expect(result.current.memberships).toHaveLength(2));

    result.current.switchTo("t-2");

    await waitFor(() => expect(result.current.isSwitchError).toBe(true));
    expect(setTokens).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("전환 진행 중에는 switchingTenantId가 대상 id를 가리킨다", async () => {
    // resolve 를 지연시켜 pending 상태를 관찰한다.
    let resolveSwitch!: (v: Awaited<ReturnType<typeof switchTenant>>) => void;
    vi.mocked(switchTenant).mockReturnValue(new Promise((r) => { resolveSwitch = r; }));
    const { result } = renderHook(() => useTenantSwitcher(), { wrapper });
    await waitFor(() => expect(result.current.memberships).toHaveLength(2));

    result.current.switchTo("t-2");

    await waitFor(() => expect(result.current.switchingTenantId).toBe("t-2"));
    resolveSwitch({
      user: { id: "u1", email: "a@b.com", name: "A", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/web test -- src/components/layout/hooks/useTenantSwitcher.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현** — `useTenantSwitcher.ts`

```ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { getMyTenants, switchTenant } from "../../../api/tenants";
import { setTokens } from "../../../api/tokens";

export const MY_TENANTS_QUERY_KEY = ["myTenants"] as const;

/**
 * 사이드바 회사 스위처의 상태·전환 로직.
 * 전환 성공 시 새 토큰 저장 직후 동기적으로 전체 새로고침(location.assign) —
 * react-query 캐시·SSE 스트림·화면 상태가 통째로 리셋되어 이전 테넌트 데이터가 남지 않는다.
 */
export const useTenantSwitcher = () => {
  const query = useQuery({
    queryKey: MY_TENANTS_QUERY_KEY,
    queryFn: getMyTenants,
  });

  const switchMutation = useMutation({
    mutationFn: (tenantId: string) => switchTenant(tenantId),
    onSuccess: (res) => {
      setTokens(res.tokens.accessToken, res.tokens.refreshToken);
      window.location.assign("/");
    },
  });

  // 파생 값은 렌더 중 계산(useMemo 미사용 — 컨벤션).
  const memberships = query.data ?? [];
  const activeMembership = memberships.find((m) => m.isActive) ?? null;

  return {
    memberships,
    activeMembership,
    isLoading: query.isLoading,
    switchTo: (tenantId: string) => switchMutation.mutate(tenantId),
    // pending 인 동안 클릭된 행에 스피너를 그리기 위한 대상 id.
    switchingTenantId: switchMutation.isPending ? (switchMutation.variables ?? null) : null,
    isSwitchError: switchMutation.isError,
  };
};
```

- [ ] **Step 4: 구현** — `useMe.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../../api/auth";

export const ME_QUERY_KEY = ["me"] as const;

// 사이드바 foot 의 사용자 표시용. 실패해도 사이드바 나머지는 정상 렌더(호출부에서 null 처리).
export const useMe = () => {
  const query = useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe });
  return { me: query.data ?? null };
};
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm --filter @lawai/web test -- src/components/layout/hooks/useTenantSwitcher.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/layout/hooks/useTenantSwitcher.ts apps/web/src/components/layout/hooks/useTenantSwitcher.test.tsx apps/web/src/components/layout/hooks/useMe.ts
git commit -m "feat: useTenantSwitcher/useMe 훅 추가 (전환 성공 시 토큰 저장 + 전체 새로고침)"
```

---

### Task 4: `TenantSwitcher` 컴포넌트 + 스타일

**Files:**
- Create: `apps/web/src/components/layout/TenantSwitcher.tsx`
- Create: `apps/web/src/components/layout/tenantSwitcher.css.ts`
- Test: `apps/web/src/components/layout/TenantSwitcher.test.tsx`

**Interfaces:**
- Consumes: Task 3 `useTenantSwitcher`, Task 2 `getTenantRoleLabel`, lawkit `Icon`/`Spinner`, `design/tokens` T.
- Produces: `<TenantSwitcher />` (props 없음). Task 5 가 Sidebar 에 삽입.

동작 규칙(스펙 §2): 멤버십 0개 → null 렌더. 1개 → 캐럿 없는 표시 전용(비버튼). 2개+ → 버튼 + 위로 펼치는 드롭다운(backdrop 로 외부 클릭 닫기 — NotificationBell 패턴). 활성 행 ✓, 전환 중 행 Spinner + 전체 잠금, 실패 시 드롭다운 안 에러 문구.

- [ ] **Step 1: 실패 테스트 작성** — `TenantSwitcher.test.tsx` (훅 모듈 mock — NotificationBell.test 패턴)

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TenantSwitcher } from "./TenantSwitcher";
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";

vi.mock("./hooks/useTenantSwitcher");

const m1 = { tenantId: "t-1", name: "A상사", role: "inHouseCounsel" as const, isActive: true };
const m2 = { tenantId: "t-2", name: "B테크", role: "outsideCounsel" as const, isActive: false };

const mockHook = (over: Partial<ReturnType<typeof useTenantSwitcher>> = {}) => {
  const switchTo = vi.fn();
  vi.mocked(useTenantSwitcher).mockReturnValue({
    memberships: [m1, m2],
    activeMembership: m1,
    isLoading: false,
    switchTo,
    switchingTenantId: null,
    isSwitchError: false,
    ...over,
  });
  return { switchTo };
};

describe("TenantSwitcher", () => {
  beforeEach(() => vi.clearAllMocks());

  it("멤버십 0개면 아무것도 렌더하지 않는다", () => {
    mockHook({ memberships: [], activeMembership: null });
    const { container } = render(<TenantSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it("멤버십 1개면 회사명만 표시하고 여는 버튼이 없다", () => {
    mockHook({ memberships: [m1] });
    render(<TenantSwitcher />);
    expect(screen.getByText("A상사")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /회사 전환/ })).not.toBeInTheDocument();
  });

  it("멤버십 2개+면 클릭 시 목록이 열리고 활성 회사에 체크가 표시된다", async () => {
    const user = userEvent.setup();
    mockHook();
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    expect(screen.getByText("소속 회사 (2)")).toBeInTheDocument();
    expect(screen.getByText("B테크")).toBeInTheDocument();
    expect(screen.getByText("사외변호사")).toBeInTheDocument();
    // 활성 행(A상사)에 체크 마크
    expect(screen.getByRole("button", { name: /A상사/ })).toHaveTextContent("✓");
  });

  it("비활성 회사 클릭 시 switchTo를 해당 tenantId로 호출한다", async () => {
    const user = userEvent.setup();
    const { switchTo } = mockHook();
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    await user.click(screen.getByRole("button", { name: /B테크/ }));
    expect(switchTo).toHaveBeenCalledWith("t-2");
  });

  it("활성 회사 클릭 시 switchTo를 호출하지 않는다", async () => {
    const user = userEvent.setup();
    const { switchTo } = mockHook();
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    await user.click(screen.getByRole("button", { name: /A상사/ }));
    expect(switchTo).not.toHaveBeenCalled();
  });

  it("전환 중에는 행 버튼이 비활성화되고 대상 행에 로딩이 표시된다", async () => {
    const user = userEvent.setup();
    mockHook({ switchingTenantId: "t-2" });
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    expect(screen.getByRole("button", { name: /B테크/ })).toBeDisabled();
    expect(screen.getByLabelText("전환 중")).toBeInTheDocument();
  });

  it("전환 실패 시 에러 문구를 표시한다", async () => {
    const user = userEvent.setup();
    mockHook({ isSwitchError: true });
    render(<TenantSwitcher />);
    await user.click(screen.getByRole("button", { name: /회사 전환/ }));
    expect(screen.getByText("회사 전환에 실패했습니다. 다시 시도해주세요.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/web test -- src/components/layout/TenantSwitcher.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 스타일 구현** — `tenantSwitcher.css.ts` (사이드바 네이비 토큰, notificationBell.css 의 backdrop 방식)

```ts
import { style } from "@vanilla-extract/css";
import { T } from "../../design/tokens";

export const root = style({ position: "relative", padding: "10px 12px 0" });

/* 접힌 트리거(2개+ 소속) / 표시 전용(1개 소속) 공통 행 */
const triggerBase = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "7px 10px",
  borderRadius: 7,
  background: "rgba(255,255,255,.06)",
  border: `1px solid ${T.navyLine}`,
} as const;

export const trigger = style({
  ...triggerBase,
  cursor: "pointer",
  fontFamily: "Pretendard",
  textAlign: "left",
  selectors: { "&:hover": { background: "rgba(255,255,255,.1)" } },
});

export const triggerStatic = style(triggerBase);

export const badge = style({
  width: 20,
  height: 20,
  borderRadius: 5,
  background: T.primary,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10.5,
  fontWeight: 800,
  flexShrink: 0,
});

export const name = style({
  flex: 1,
  fontSize: 12.5,
  fontWeight: 700,
  color: T.navyText,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const caret = style({ fontSize: 9, color: T.navyMuted, flexShrink: 0 });

/* 외부 클릭 닫기용 투명 backdrop (NotificationBell 패턴) */
export const backdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: 40,
  background: "transparent",
  border: "none",
  cursor: "default",
});

/* 위로 펼치는 드롭다운 — 라이트 서피스 */
export const panel = style({
  position: "absolute",
  bottom: "calc(100% + 6px)",
  left: 12,
  right: 12,
  zIndex: 50,
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  boxShadow: "0 4px 15px rgba(44,63,88,.35)",
  overflow: "hidden",
});

export const panelHeader = style({
  padding: "9px 12px 7px",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.05em",
  color: T.faint,
  borderBottom: `1px solid ${T.border}`,
});

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "9px 12px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "Pretendard",
  textAlign: "left",
  selectors: {
    "&:hover": { background: T.surfaceAlt },
    "&:disabled": { cursor: "default", opacity: 0.6 },
  },
});

export const itemActive = style({ background: T.primarySoft });

export const itemBadge = style({
  width: 24,
  height: 24,
  borderRadius: 6,
  background: T.primary,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 800,
  flexShrink: 0,
});

export const itemMain = style({ flex: 1, minWidth: 0 });
export const itemName = style({ fontSize: 12.5, fontWeight: 700, color: T.heading });
export const itemRole = style({ fontSize: 11, color: T.muted, marginTop: 1 });
export const itemCheck = style({ color: T.primary, fontWeight: 800, fontSize: 12 });

export const errorText = style({
  padding: "8px 12px",
  fontSize: 11.5,
  color: T.danger,
  borderTop: `1px solid ${T.border}`,
});
```

- [ ] **Step 4: 컴포넌트 구현** — `TenantSwitcher.tsx`

```tsx
import { useState } from "react";
import { Spinner } from "@lawkit/ui";
import type { TenantMembership } from "@lawai/contracts";
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";
import { getTenantRoleLabel } from "../../utils/tenantRoleLabel";
import * as css from "./tenantSwitcher.css";

/**
 * 사이드바 하단 회사 스위처(시안 B).
 * 멤버십 0개 → 미렌더 / 1개 → 표시 전용 / 2개+ → 드롭다운으로 전환.
 * 외부 클릭 닫기는 투명 backdrop(NotificationBell 패턴 — useRef/useEffect 미사용).
 */
export function TenantSwitcher() {
  const {
    memberships,
    activeMembership,
    switchTo,
    switchingTenantId,
    isSwitchError,
  } = useTenantSwitcher();
  const [isOpen, setIsOpen] = useState(false);

  if (memberships.length === 0) return null;

  const current = activeMembership ?? memberships[0];
  const isSwitching = switchingTenantId !== null;

  const handleSelect = (membership: TenantMembership) => {
    if (membership.isActive) {
      setIsOpen(false);
      return;
    }
    switchTo(membership.tenantId);
  };

  // 1개 소속(대다수 사용자): 전환 UI 없이 현재 회사 표시만.
  if (memberships.length === 1) {
    return (
      <div className={css.root}>
        <div className={css.triggerStatic}>
          <span className={css.badge}>{current.name.charAt(0)}</span>
          <span className={css.name}>{current.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <button
        type="button"
        className={css.trigger}
        aria-label={`회사 전환 — 현재 ${current.name}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className={css.badge}>{current.name.charAt(0)}</span>
        <span className={css.name}>{current.name}</span>
        <span className={css.caret}>▲</span>
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className={css.backdrop}
            aria-label="회사 목록 닫기"
            onClick={() => setIsOpen(false)}
          />
          <div className={css.panel}>
            <div className={css.panelHeader}>소속 회사 ({memberships.length})</div>
            {memberships.map((membership) => (
              <button
                key={membership.tenantId}
                type="button"
                disabled={isSwitching}
                className={
                  membership.isActive ? `${css.item} ${css.itemActive}` : css.item
                }
                onClick={() => handleSelect(membership)}
              >
                <span className={css.itemBadge}>{membership.name.charAt(0)}</span>
                <span className={css.itemMain}>
                  <span className={css.itemName}>{membership.name}</span>
                  <span className={css.itemRole}>
                    {getTenantRoleLabel(membership.role)}
                  </span>
                </span>
                {membership.isActive ? <span className={css.itemCheck}>✓</span> : null}
                {switchingTenantId === membership.tenantId ? (
                  <span aria-label="전환 중">
                    <Spinner />
                  </span>
                ) : null}
              </button>
            ))}
            {isSwitchError ? (
              <p className={css.errorText}>회사 전환에 실패했습니다. 다시 시도해주세요.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
```

> 주의: `itemName`/`itemRole` 은 `span` 이지만 css 에서 block 처럼 보이게 하려면 `itemMain` 이 flex 컬럼이어야 한다 — 위 css 의 `itemMain` 에 `display: "flex", flexDirection: "column"` 을 추가한다(구현 시 css.ts 에 반영: `export const itemMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" });`).

- [ ] **Step 5: 통과 확인**

Run: `pnpm --filter @lawai/web test -- src/components/layout/TenantSwitcher.test.tsx`
Expected: PASS (7 tests). 실패 시 role/name 쿼리와 aria-label 이 구현과 일치하는지부터 확인.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/layout/TenantSwitcher.tsx apps/web/src/components/layout/tenantSwitcher.css.ts apps/web/src/components/layout/TenantSwitcher.test.tsx
git commit -m "feat: 사이드바 회사 스위처 컴포넌트 추가 (시안 B)"
```

---

### Task 5: Sidebar 통합 + foot 실데이터

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx` (nav 아래·foot 위에 `<TenantSwitcher />` 삽입, foot 하드코딩 제거)
- Modify: `apps/web/src/components/layout/Sidebar.test.tsx` (훅 mock 추가 + foot 실데이터 테스트)

**Interfaces:**
- Consumes: Task 4 `TenantSwitcher`, Task 3 `useTenantSwitcher`/`useMe`, Task 2 `getTenantRoleLabel`.
- Produces: 최종 사이드바. 이후 task 없음.

- [ ] **Step 1: 실패 테스트 — Sidebar.test.tsx 에 훅 mock 과 foot 검증 추가**

기존 `renderSidebar` 는 그대로 두고, 파일 상단에 mock 을 추가하고 테스트를 덧붙인다. (Sidebar 는 QueryClientProvider 없이 렌더되므로 react-query 훅은 모듈 단위로 mock — NotificationBell.test 와 동일 접근.)

```tsx
// ── 파일 상단 import 아래에 추가 ──
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";
import { useMe } from "./hooks/useMe";

vi.mock("./hooks/useTenantSwitcher");
vi.mock("./hooks/useMe");

const membership = { tenantId: "t-1", name: "A상사", role: "inHouseCounsel" as const, isActive: true };

// beforeEach 에서 기본 mock 설정 (기존 beforeEach 를 확장)
beforeEach(() => {
  localStorage.clear();
  vi.mocked(useTenantSwitcher).mockReturnValue({
    memberships: [membership],
    activeMembership: membership,
    isLoading: false,
    switchTo: vi.fn(),
    switchingTenantId: null,
    isSwitchError: false,
  });
  vi.mocked(useMe).mockReturnValue({
    me: { id: "u1", email: "a@b.com", name: "김지원", isSystemAdmin: false, departmentId: null, departmentName: null, createdAt: "x" },
  });
});

// ── describe 블록 안에 테스트 추가 ──
it("foot에 실사용자 이름과 활성 테넌트 역할 라벨을 표시한다", () => {
  renderSidebar();
  expect(screen.getByText("김지원")).toBeInTheDocument();
  expect(screen.getByText("사내변호사")).toBeInTheDocument();
});

it("사용자 정보 로딩 전에는 foot 텍스트 없이 렌더가 깨지지 않는다", () => {
  vi.mocked(useMe).mockReturnValue({ me: null });
  vi.mocked(useTenantSwitcher).mockReturnValue({
    memberships: [],
    activeMembership: null,
    isLoading: true,
    switchTo: vi.fn(),
    switchingTenantId: null,
    isSwitchError: false,
  });
  renderSidebar();
  expect(screen.getByText("홈")).toBeInTheDocument(); // 사이드바 자체는 정상
});

it("스위처(현재 회사명)를 foot 위에 렌더한다", () => {
  renderSidebar();
  expect(screen.getByText("A상사")).toBeInTheDocument();
});
```

`vi` import 가 기존 파일에 없으면 `import { describe, it, expect, beforeEach, vi } from "vitest";` 로 확장한다.

- [ ] **Step 2: 실패 확인**

Run: `pnpm --filter @lawai/web test -- src/components/layout/Sidebar.test.tsx`
Expected: 신규 3개 FAIL ("김지원" 없음 등), 기존 테스트는 PASS 유지.

- [ ] **Step 3: Sidebar.tsx 수정**

```tsx
// import 추가
import { TenantSwitcher } from "./TenantSwitcher";
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";
import { useMe } from "./hooks/useMe";
import { getTenantRoleLabel } from "../../utils/tenantRoleLabel";

// Sidebar 컴포넌트 본문 상단에서 훅 호출
export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeMembership } = useTenantSwitcher();
  const { me } = useMe();

  // ... 기존 렌더 ...

  // </nav> 와 foot 사이에 삽입:
  //   <TenantSwitcher />

  // foot 을 실데이터로 교체:
  //   <div className={css.foot}>
  //     <div className={css.footAvatar}>{me?.name.charAt(0) ?? ""}</div>
  //     <div className={css.footMain}>
  //       <div className={css.footName}>{me?.name ?? ""}</div>
  //       <div className={css.footRole}>
  //         {activeMembership ? getTenantRoleLabel(activeMembership.role) : ""}
  //       </div>
  //     </div>
  //     ...기존 로그아웃 버튼 그대로...
  //   </div>
}
```

전체 구조(변경 부분만 — 나머지 기존 코드 유지):

```tsx
  return (
    <aside className={css.aside}>
      <div className={css.brand}>…기존 그대로…</div>
      <nav className={css.nav}>…기존 그대로…</nav>

      <TenantSwitcher />

      <div className={css.foot}>
        <div className={css.footAvatar}>{me?.name.charAt(0) ?? ""}</div>
        <div className={css.footMain}>
          <div className={css.footName}>{me?.name ?? ""}</div>
          <div className={css.footRole}>
            {activeMembership ? getTenantRoleLabel(activeMembership.role) : ""}
          </div>
        </div>
        <button …기존 로그아웃 버튼 그대로… />
      </div>
    </aside>
  );
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --filter @lawai/web test -- src/components/layout/Sidebar.test.tsx`
Expected: 전체 PASS (기존 + 신규 3).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx apps/web/src/components/layout/Sidebar.test.tsx
git commit -m "feat: 사이드바에 회사 스위처 통합 + foot 사용자 정보 실데이터 교체"
```

---

### Task 6: 전체 검증

**Files:** 없음 (검증 전용 — 타입 깨짐 발견 시 해당 파일 수정)

- [ ] **Step 1: web 전체 테스트·린트·빌드**

Run: `pnpm turbo lint build test --filter=@lawai/web`
Expected: 전부 PASS. (Sidebar 를 렌더하는 다른 테스트 — AppShell 경유 페이지 테스트 등 — 이 QueryClientProvider 부재로 깨지면, 해당 테스트 파일에 위 Task 5 와 같은 훅 모듈 mock 을 추가한다.)

- [ ] **Step 2: 모노레포 전체 turbo**

Run: `pnpm turbo lint build test`
Expected: 전 패키지 PASS (백엔드 변경 없음 — 깨지면 이번 작업과 무관한지 확인 후 보고).

- [ ] **Step 3: 수동 확인 (dev 서버)**

Run: `pnpm --filter @lawai/web dev` 후 로그인 → 사이드바 하단 스위처 확인.
로컬 DB 에 테넌트가 1개뿐이면 표시 전용 상태만 보이는 게 정상 — 드롭다운 검증은 테스트가 담당.

- [ ] **Step 4: 최종 커밋 (잔여 수정분 있을 때만)**

```bash
git add -A
git commit -m "chore: 회사 전환 UI 전체 검증 통과"
```

---

## Self-Review 결과

- **Spec 커버리지**: §1 백엔드 계약(Task 1 언래핑 포함), §2.1 접힘/1개/0개 분기(Task 4), §2.2 드롭다운·역할 라벨(Task 2/4), §2.3 전환 중·에러(Task 3/4), §3.1 API(Task 1), §3.2 훅·전체 새로고침(Task 3), §3.3 foot 실데이터(Task 3 useMe + Task 5), §4 파일 구성(각 task 일치), §6 테스트 전략(각 task TDD + Sidebar 수정), §7 리스크(동기 assign·스위처 fallback·location mock 선례) — 전부 task 존재. ✅
- **Placeholder**: 없음. 모든 코드 블록 구체화. Task 5 의 "기존 그대로" 는 유지 지시(변경 아님)로 실코드 불요.
- **타입 일관성**: `SwitchTenantResponse`(T1) ↔ mutation 반환(T3), `switchingTenantId`/`isSwitchError`(T3) ↔ 컴포넌트·테스트(T4/T5), `getTenantRoleLabel`(T2) ↔ 사용처(T4/T5), `MY_TENANTS_QUERY_KEY`/`ME_QUERY_KEY` 명칭 일치 확인.
