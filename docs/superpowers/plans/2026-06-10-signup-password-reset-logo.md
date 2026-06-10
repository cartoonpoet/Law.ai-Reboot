# 회원가입 · 비밀번호 찾기 + Prism 로고/파비콘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/web`에 회원가입(`/signup`)·비밀번호 찾기(`/forgot-password`) 화면을 추가하고, 시안 4번 Prism 마크를 인앱 로고 3곳과 파비콘에 적용한다.

**Architecture:** 기존 로그인의 2단 레이아웃(좌측 `BrandPanel` + 우측 카드)을 공통 `AuthLayout`으로 추출해 login/signup/reset이 공유한다. 회원가입은 react-hook-form + zod, 비밀번호 찾기는 React 19 `useActionState`로 구현한다. Prism 마크는 `useId`로 그라디언트 ID를 인스턴스별 유니크하게 만드는 공유 `Logo` 컴포넌트로 만든다.

**Tech Stack:** React 19, react-router-dom 7, react-hook-form 7 + @hookform/resolvers + zod 4, @lawkit/ui, vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-10-signup-password-reset-logo-design.md`

---

## File Structure

- Create: `apps/web/src/components/ui/Logo.tsx` — Prism 마크 SVG 컴포넌트
- Create: `apps/web/src/components/ui/Logo.test.tsx`
- Create: `apps/web/src/pages/login/AuthLayout.tsx` — 인증 화면 공통 셸
- Create: `apps/web/public/favicon.svg` — Prism 파비콘
- Create: `apps/web/src/pages/login/ForgotPasswordPage.tsx`
- Create: `apps/web/src/pages/login/ForgotPasswordForm.tsx`
- Create: `apps/web/src/pages/login/ForgotPasswordForm.test.tsx`
- Create: `apps/web/src/pages/login/signup-schema.ts`
- Create: `apps/web/src/pages/login/SignupPage.tsx`
- Create: `apps/web/src/pages/login/SignupForm.tsx`
- Create: `apps/web/src/pages/login/SignupForm.test.tsx`
- Modify: `apps/web/src/pages/login/LoginPage.tsx` — `AuthLayout` 사용으로 리팩터링
- Modify: `apps/web/src/pages/login/BrandPanel.tsx:207-222` — "L" 타일 → `<Logo>`
- Modify: `apps/web/src/components/layout/Sidebar.tsx:54-69` — "L" 타일 → `<Logo>`
- Modify: `apps/web/src/pages/login/EmailLoginForm.tsx:100-114` — "비밀번호 찾기" 버튼에 네비게이션 연결
- Modify: `apps/web/src/index.html` 경로의 `apps/web/index.html` — 파비콘 `<link>` 추가
- Modify: `apps/web/src/routes.tsx` — `/signup`, `/forgot-password` 라우트 추가

**Test 실행 규칙:** 단일 파일은 `pnpm --filter web test <상대경로>`, 전체는 `pnpm --filter web test`.

---

### Task 1: Prism `Logo` 컴포넌트

**Files:**
- Create: `apps/web/src/components/ui/Logo.tsx`
- Test: `apps/web/src/components/ui/Logo.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/components/ui/Logo.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("Prism 마크를 두 개의 path로 렌더한다", () => {
    const { container } = render(<Logo />);
    expect(container.querySelectorAll("path").length).toBe(2);
  });

  it("같은 페이지에 여러 개 떠도 그라디언트 ID가 인스턴스마다 유니크하다", () => {
    const { container } = render(
      <>
        <Logo />
        <Logo />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("linearGradient")).map(
      (g) => g.id,
    );
    expect(ids.length).toBe(4);
    expect(new Set(ids).size).toBe(4);
  });

  it("size prop을 svg width/height에 반영한다", () => {
    const { container } = render(<Logo size={40} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("40");
    expect(svg.getAttribute("height")).toBe("40");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter web test src/components/ui/Logo.test.tsx`
Expected: FAIL — `Cannot find module './Logo'`

- [ ] **Step 3: 컴포넌트 구현**

`apps/web/src/components/ui/Logo.tsx`:

```tsx
import { useId } from "react";

/**
 * Law.ai Prism 마크 (시안 logo-fit.html 4번).
 * 한 페이지에 여러 번 렌더될 수 있어 useId로 그라디언트 ID를 유니크하게 만든다.
 */
export function Logo({ size = 28 }: { size?: number }) {
  const uid = useId();
  const a = `${uid}-a`;
  const b = `${uid}-b`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={a} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6f9bff" />
          <stop offset="1" stopColor="#2151ec" />
        </linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c46c9" />
          <stop offset="1" stopColor="#15349e" />
        </linearGradient>
      </defs>
      <path d="M16 10 L24 10 L24 32 L16 28 Z" fill={`url(#${a})`} />
      <path d="M16 28 L24 32 L36 32 L36 38 L16 38 Z" fill={`url(#${b})`} />
    </svg>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter web test src/components/ui/Logo.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/components/ui/Logo.tsx apps/web/src/components/ui/Logo.test.tsx
git commit -m "feat(web): Prism 로고 컴포넌트 추가 (시안 4번)"
```

---

### Task 2: 인앱 로고 3곳 교체 (BrandPanel · Sidebar)

LoginPage의 로고는 Task 3에서 `AuthLayout`로 옮기며 교체하므로 여기서는 BrandPanel·Sidebar만 처리한다.

**Files:**
- Modify: `apps/web/src/pages/login/BrandPanel.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: BrandPanel "L" 타일 교체**

`BrandPanel.tsx` 상단 `import` 에 추가:

```tsx
import { Logo } from "../../components/ui/Logo";
```

`BrandPanel.tsx`의 다음 블록(현재 207-222 부근):

```tsx
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            background: T.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 17,
          }}
        >
          L
        </div>
```

를 다음으로 교체:

```tsx
        <Logo size={30} />
```

- [ ] **Step 2: Sidebar "L" 타일 교체**

`Sidebar.tsx` 상단 `import` 에 추가:

```tsx
import { Logo } from "../ui/Logo";
```

`Sidebar.tsx`의 다음 블록(현재 54-69 부근, 상단 브랜드 로고):

```tsx
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: T.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          L
        </div>
```

를 다음으로 교체:

```tsx
        <Logo size={26} />
```

> 주의: Sidebar 하단의 30×30 "손" 타일은 사용자 아바타이므로 건드리지 않는다.

- [ ] **Step 3: 타입체크 / 기존 테스트 통과 확인**

Run: `pnpm --filter web test`
Expected: PASS (기존 테스트 그대로 통과, BrandPanel·Sidebar는 DashboardPage 등에서 렌더됨)

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/pages/login/BrandPanel.tsx apps/web/src/components/layout/Sidebar.tsx
git commit -m "feat(web): BrandPanel·Sidebar 로고를 Prism 마크로 교체"
```

---

### Task 3: `AuthLayout` 추출 + LoginPage 리팩터링

기존 `LoginPage`의 2단 셸/카드/로고/푸터를 `AuthLayout`으로 추출하고, LoginPage가 이를 사용하도록 바꾼다. 외형·동작은 동일하게 유지한다.

**Files:**
- Create: `apps/web/src/pages/login/AuthLayout.tsx`
- Modify: `apps/web/src/pages/login/LoginPage.tsx`

- [ ] **Step 1: `AuthLayout` 작성**

`apps/web/src/pages/login/AuthLayout.tsx`:

```tsx
import type { ReactNode } from "react";
import { T } from "../../design/tokens";
import { Logo } from "../../components/ui/Logo";
import { BrandPanel } from "./BrandPanel";

interface AuthLayoutProps {
  /** 카드 내부 콘텐츠 (제목·부제·폼) */
  children: ReactNode;
  /** 카드 아래, 내선 안내 위에 들어가는 페이지별 링크 영역 */
  belowCard?: ReactNode;
  /** 카드 최대 너비 (기본 396, 회원가입은 440) */
  cardMaxWidth?: number;
}

export function AuthLayout({
  children,
  belowCard,
  cardMaxWidth = 396,
}: AuthLayoutProps) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: T.surface }}>
      <div
        className="brand-col"
        style={{ display: "flex", flex: "0 0 44%", maxWidth: 540 }}
      >
        <BrandPanel />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          background: T.pageBg,
        }}
      >
        <div
          className="lp-rise"
          style={{ width: "100%", maxWidth: cardMaxWidth, animationDelay: ".1s" }}
        >
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(16,24,40,.1)",
              padding: "28px 28px 26px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 22,
              }}
            >
              <Logo size={24} />
              <span style={{ fontSize: 15, fontWeight: 700, color: T.heading }}>
                Law<span style={{ color: T.primary }}>.ai</span>
              </span>
            </div>

            {children}
          </div>

          {belowCard}

          <div
            style={{
              marginTop: 14,
              textAlign: "center",
              fontSize: 12,
              color: T.faint,
            }}
          >
            계정 문의 · 법무팀 시스템 관리자{" "}
            <b style={{ color: T.muted }}>내선 8230</b>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: LoginPage가 `AuthLayout`을 쓰도록 리팩터링**

`apps/web/src/pages/login/LoginPage.tsx` 전체를 다음으로 교체:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { AuthLayout } from "./AuthLayout";
import { EmailLoginForm } from "./EmailLoginForm";
import { SsoLoginForm } from "./SsoLoginForm";
import { OtpLoginForm } from "./OtpLoginForm";

type LoginMethod = "email" | "sso" | "otp";

export function LoginPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<LoginMethod>("email");

  return (
    <AuthLayout
      belowCard={
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12.5,
            color: T.muted,
          }}
        >
          계정이 없으신가요?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
              color: T.primary,
              fontFamily: "Pretendard",
              padding: 0,
            }}
          >
            회원가입
          </button>
        </div>
      }
    >
      <h1
        style={{
          margin: "0 0 6px",
          fontSize: 21,
          fontWeight: 800,
          color: T.heading,
          letterSpacing: "-0.025em",
          lineHeight: 1.3,
        }}
      >
        법무 워크스페이스에
        <br />
        로그인하세요.
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: T.muted }}>
        휴맥스아이티 · 법무팀
      </p>

      <div style={{ marginBottom: 18 }}>
        <Tabs
          value={method}
          onChange={(v) => setMethod(v as LoginMethod)}
          items={[
            { value: "email", label: "이메일" },
            { value: "sso", label: "SSO" },
            { value: "otp", label: "OTP" },
          ]}
        />
      </div>

      <div key={method} className="lp-rise">
        {method === "email" ? (
          <EmailLoginForm />
        ) : method === "sso" ? (
          <SsoLoginForm />
        ) : (
          <OtpLoginForm />
        )}
      </div>
    </AuthLayout>
  );
}
```

- [ ] **Step 3: 기존 LoginPage 테스트 통과 확인**

Run: `pnpm --filter web test src/pages/login/LoginPage.test.tsx`
Expected: PASS (기존 2 tests — 외형/동작 동일)

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/pages/login/AuthLayout.tsx apps/web/src/pages/login/LoginPage.tsx
git commit -m "refactor(web): 인증 화면 공통 AuthLayout 추출 + 로그인에 회원가입 링크 추가"
```

---

### Task 4: 파비콘 (Prism SVG)

**Files:**
- Create: `apps/web/public/favicon.svg`
- Modify: `apps/web/index.html`

- [ ] **Step 1: favicon.svg 생성**

`apps/web/public/favicon.svg` (독립 파일이라 고정 그라디언트 ID 사용해도 충돌 없음):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6f9bff"/>
      <stop offset="1" stop-color="#2151ec"/>
    </linearGradient>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c46c9"/>
      <stop offset="1" stop-color="#15349e"/>
    </linearGradient>
  </defs>
  <path d="M16 10 L24 10 L24 32 L16 28 Z" fill="url(#a)"/>
  <path d="M16 28 L24 32 L36 32 L36 38 L16 38 Z" fill="url(#b)"/>
</svg>
```

- [ ] **Step 2: index.html에 favicon link 추가**

`apps/web/index.html`의 `<head>` 안, `<title>` 다음 줄에 추가:

```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 3: 빌드로 검증**

Run: `pnpm --filter web build`
Expected: 성공(에러 없음). `apps/web/dist/favicon.svg` 존재 확인: `ls apps/web/dist/favicon.svg`

- [ ] **Step 4: 커밋**

```bash
git add apps/web/public/favicon.svg apps/web/index.html
git commit -m "feat(web): Prism 파비콘 추가"
```

---

### Task 5: 비밀번호 찾기 화면 (stub)

단순 폼이므로 React 19 `useActionState` 사용. 백엔드 호출 없이 성공 화면으로 전환한다.

**Files:**
- Create: `apps/web/src/pages/login/ForgotPasswordForm.tsx`
- Create: `apps/web/src/pages/login/ForgotPasswordPage.tsx`
- Test: `apps/web/src/pages/login/ForgotPasswordForm.test.tsx`
- Modify: `apps/web/src/pages/login/EmailLoginForm.tsx` (링크 연결)
- Modify: `apps/web/src/routes.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/pages/login/ForgotPasswordForm.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

function renderForm() {
  return render(
    <MemoryRouter>
      <ForgotPasswordForm />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordForm", () => {
  it("이메일 입력과 전송 버튼을 렌더한다", () => {
    renderForm();
    expect(screen.getByPlaceholderText("email@humaxit.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    ).toBeInTheDocument();
  });

  it("전송하면 성공 안내가 노출된다 (stub, 네트워크 호출 없음)", async () => {
    renderForm();
    await userEvent.type(
      screen.getByPlaceholderText("email@humaxit.com"),
      "a@humaxit.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    );
    expect(await screen.findByText("메일을 전송했습니다")).toBeInTheDocument();
    expect(screen.getByText(/a@humaxit\.com/)).toBeInTheDocument();
  });

  it("다시 전송을 누르면 입력 화면으로 돌아간다", async () => {
    renderForm();
    await userEvent.type(
      screen.getByPlaceholderText("email@humaxit.com"),
      "a@humaxit.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    );
    await screen.findByText("메일을 전송했습니다");
    await userEvent.click(screen.getByRole("button", { name: "다시 전송" }));
    expect(
      screen.getByRole("button", { name: "재설정 링크 전송" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter web test src/pages/login/ForgotPasswordForm.test.tsx`
Expected: FAIL — `Cannot find module './ForgotPasswordForm'`

- [ ] **Step 3: `ForgotPasswordForm` 구현**

> 본 폼은 백엔드 엔드포인트가 없는 stub이고 "다시 전송"으로 입력 화면을 복원해야 한다. `useActionState`는 상태 리셋 표준 API가 없어 stub·리셋 요건에 맞지 않으므로 `useState`로 구현한다(실제 API 연동 시 `useActionState`로 승격 — 코드 주석에 명시).

`apps/web/src/pages/login/ForgotPasswordForm.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, Input, InputGroup, Alert } from "@lawkit/ui";
import { T } from "../../design/tokens";

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Alert type="success" title="메일을 전송했습니다">
          {email || "입력하신 이메일"} 주소로 비밀번호 재설정 링크를 보냈습니다.
          메일함을 확인해 주세요.
        </Alert>
        <div style={{ display: "grid" }}>
          <Button
            size="large"
            variant="outline"
            color="secondary"
            onClick={() => navigate("/login")}
          >
            로그인으로 돌아가기
          </Button>
        </div>
        <div style={{ textAlign: "center", fontSize: 12.5, color: T.muted }}>
          메일이 오지 않았나요?{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
              color: T.primary,
              fontFamily: "Pretendard",
              padding: 0,
            }}
          >
            다시 전송
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // 백엔드 재설정 엔드포인트 부재 → 프런트 stub. 성공 화면으로 전환만.
        setSent(true);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <InputGroup label="이메일" helperText="회사 이메일(@humaxit.com)을 입력하세요">
        <Input
          inputSize="large"
          type="email"
          placeholder="email@humaxit.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={
            <Icon
              name="mail"
              size="sm"
              style={{ width: 16, height: 16, color: T.faint }}
            />
          }
        />
      </InputGroup>
      <div style={{ display: "grid" }}>
        <Button
          size="large"
          type="submit"
          iconLeft={
            <Icon name="sendSolid" size="sm" style={{ width: 15, height: 15 }} />
          }
        >
          재설정 링크 전송
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: `ForgotPasswordPage` 구현**

`apps/web/src/pages/login/ForgotPasswordPage.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { AuthLayout } from "./AuthLayout";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <button
        type="button"
        onClick={() => navigate("/login")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: 700,
          color: T.muted,
          fontFamily: "Pretendard",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Icon name="chevronLeft" size="sm" style={{ width: 13, height: 13 }} />
        로그인으로
      </button>
      <h1
        style={{
          margin: "12px 0 0",
          fontSize: 21,
          fontWeight: 800,
          color: T.heading,
          letterSpacing: "-0.025em",
        }}
      >
        비밀번호 찾기
      </h1>
      <p style={{ margin: "7px 0 20px", fontSize: 13, color: T.muted }}>
        가입한 이메일로 재설정 링크를 보내드립니다.
      </p>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
```

- [ ] **Step 5: 라우트 추가 + 로그인 "비밀번호 찾기" 링크 연결**

`apps/web/src/routes.tsx`에 import 추가:

```tsx
import { ForgotPasswordPage } from "./pages/login/ForgotPasswordPage";
```

`<Route path="/login" element={<LoginPage />} />` 바로 다음 줄에 추가:

```tsx
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
```

`apps/web/src/pages/login/EmailLoginForm.tsx` 상단 import에 `useNavigate` 추가(이미 react-router-dom에서 import 중):

```tsx
import { useNavigate } from "react-router-dom";
```

(이미 존재함 — 11번 줄 부근 `const navigate = useNavigate();`도 이미 있음.)

"비밀번호 찾기" 버튼(현재 100-114 부근의 `<button type="button" ...>비밀번호 찾기</button>`)에 `onClick` 추가:

```tsx
        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 700,
            color: T.primary,
            fontFamily: "Pretendard",
            padding: 0,
          }}
        >
          비밀번호 찾기
        </button>
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `pnpm --filter web test src/pages/login/ForgotPasswordForm.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/pages/login/ForgotPasswordForm.tsx apps/web/src/pages/login/ForgotPasswordForm.test.tsx apps/web/src/pages/login/ForgotPasswordPage.tsx apps/web/src/routes.tsx apps/web/src/pages/login/EmailLoginForm.tsx
git commit -m "feat(web): 비밀번호 찾기 화면 추가 (프런트 stub) + 로그인 링크 연결"
```

---

### Task 6: 회원가입 zod 스키마

**Files:**
- Create: `apps/web/src/pages/login/signup-schema.ts`

- [ ] **Step 1: 스키마 작성**

`apps/web/src/pages/login/signup-schema.ts`:

```ts
import { z } from "zod";

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const signupSchema = z
  .object({
    name: z.string().min(1, "이름을 입력하세요"),
    employeeNo: z.string().min(1, "사번을 입력하세요"),
    email: z.string().email("올바른 이메일을 입력하세요"),
    department: z.string().min(1, "소속 부서를 선택하세요"),
    password: z
      .string()
      .regex(PASSWORD_RULE, "영문·숫자·특수문자 포함 8자 이상이어야 합니다"),
    passwordConfirm: z.string().min(1, "비밀번호를 다시 입력하세요"),
    agree: z.literal(true, {
      errorMap: () => ({ message: "약관에 동의해야 합니다" }),
    }),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다",
  });

export type SignupForm = z.infer<typeof signupSchema>;

export const signupDefaults: SignupForm = {
  name: "",
  employeeNo: "",
  email: "",
  department: "",
  password: "",
  passwordConfirm: "",
  // @ts-expect-error 초기값은 false지만 제출 검증에서 true를 강제한다
  agree: false,
};

export const DEPARTMENT_OPTIONS = [
  { value: "legal", label: "법무팀" },
  { value: "sales", label: "영업본부" },
  { value: "dev", label: "개발본부" },
  { value: "infra", label: "인프라팀" },
  { value: "etc", label: "기타" },
];
```

- [ ] **Step 2: 타입체크 확인**

Run: `pnpm --filter web build`
Expected: 성공 (타입 에러 없음)

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/pages/login/signup-schema.ts
git commit -m "feat(web): 회원가입 zod 스키마 추가"
```

---

### Task 7: 회원가입 폼 + 페이지

**Files:**
- Create: `apps/web/src/pages/login/SignupForm.tsx`
- Create: `apps/web/src/pages/login/SignupPage.tsx`
- Test: `apps/web/src/pages/login/SignupForm.test.tsx`
- Modify: `apps/web/src/routes.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/pages/login/SignupForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SignupForm } from "./SignupForm";
import * as authApi from "../../api/auth";

function renderForm() {
  return render(
    <MemoryRouter>
      <SignupForm />
    </MemoryRouter>,
  );
}

async function fillValid() {
  await userEvent.type(screen.getByPlaceholderText("홍길동"), "홍길동");
  await userEvent.type(screen.getByPlaceholderText("HX-00000"), "HX-12345");
  await userEvent.type(
    screen.getByPlaceholderText("email@humaxit.com"),
    "hong@humaxit.com",
  );
  await userEvent.type(screen.getByPlaceholderText("비밀번호"), "abcd1234!");
  await userEvent.type(screen.getByPlaceholderText("비밀번호 재입력"), "abcd1234!");
}

describe("SignupForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("필수 필드를 비우고 제출하면 검증 에러를 보여준다", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "가입 신청" }));
    expect(await screen.findByText("이름을 입력하세요")).toBeInTheDocument();
  });

  it("비밀번호가 일치하지 않으면 에러를 보여준다", async () => {
    renderForm();
    await userEvent.type(screen.getByPlaceholderText("비밀번호"), "abcd1234!");
    await userEvent.type(
      screen.getByPlaceholderText("비밀번호 재입력"),
      "different9!",
    );
    await userEvent.click(screen.getByRole("button", { name: "가입 신청" }));
    expect(
      await screen.findByText("비밀번호가 일치하지 않습니다"),
    ).toBeInTheDocument();
  });

  it("유효 입력 시 signup을 email/name/password로 호출한다", async () => {
    const signupSpy = vi.spyOn(authApi, "signup").mockResolvedValue({
      user: { id: "u1", email: "hong@humaxit.com", name: "홍길동", createdAt: "x" },
      tokens: { accessToken: "at", refreshToken: "rt" },
    });
    renderForm();
    await fillValid();
    // 부서 선택
    await userEvent.click(screen.getByText("부서 선택"));
    await userEvent.click(screen.getByText("법무팀"));
    // 약관 동의
    await userEvent.click(
      screen.getByLabelText("이용약관 및 개인정보 처리방침에 동의합니다"),
    );
    await userEvent.click(screen.getByRole("button", { name: "가입 신청" }));

    await waitFor(() => {
      expect(signupSpy).toHaveBeenCalledWith({
        email: "hong@humaxit.com",
        name: "홍길동",
        password: "abcd1234!",
      });
      expect(localStorage.getItem("accessToken")).toBe("at");
    });
  });
});
```

> **참고(부서 Dropdown 상호작용):** `@lawkit/ui` `Dropdown`이 트리거 텍스트 "부서 선택" 클릭 → 옵션 "법무팀" 클릭 패턴으로 동작하지 않으면, Step 3 구현 후 실제 렌더 DOM에 맞춰 위 두 줄(`getByText("부서 선택")` / `getByText("법무팀")`)을 조정한다. 핵심 단언(signup 호출 인자)은 유지한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter web test src/pages/login/SignupForm.test.tsx`
Expected: FAIL — `Cannot find module './SignupForm'`

- [ ] **Step 3: `SignupForm` 구현**

`apps/web/src/pages/login/SignupForm.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Icon,
  Button,
  Input,
  InputGroup,
  Dropdown,
  Checkbox,
} from "@lawkit/ui";
import { signup } from "../../api/auth";
import { T } from "../../design/tokens";
import {
  signupSchema,
  signupDefaults,
  DEPARTMENT_OPTIONS,
} from "./signup-schema";
import type { SignupForm as SignupFormValues } from "./signup-schema";

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div role="alert" style={{ marginTop: 5, fontSize: 12, color: T.danger }}>
      {msg}
    </div>
  );
}

const lockIcon = (
  <Icon name="lock" size="sm" style={{ width: 16, height: 16, color: T.faint }} />
);

export function SignupForm() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: signupDefaults,
  });

  const onValid = async (values: SignupFormValues) => {
    setServerError(null);
    try {
      // 사번(employeeNo)·부서(department)는 현재 백엔드 DTO에 없어 전송하지 않는다.
      // 백엔드 SignupRequest 확장 시 함께 전송하도록 한다.
      const data = await signup({
        email: values.email,
        name: values.name,
        password: values.password,
      });
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      navigate("/");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "회원가입에 실패했습니다");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onValid)}
      style={{ display: "flex", flexDirection: "column", gap: 15 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <InputGroup label="이름">
          <Input inputSize="large" placeholder="홍길동" {...register("name")} />
          <ErrText msg={errors.name?.message} />
        </InputGroup>
        <InputGroup label="사번">
          <Input
            inputSize="large"
            placeholder="HX-00000"
            {...register("employeeNo")}
          />
          <ErrText msg={errors.employeeNo?.message} />
        </InputGroup>
      </div>

      <InputGroup label="회사 이메일">
        <Input
          inputSize="large"
          type="email"
          placeholder="email@humaxit.com"
          leftIcon={
            <Icon
              name="mail"
              size="sm"
              style={{ width: 16, height: 16, color: T.faint }}
            />
          }
          {...register("email")}
        />
        <ErrText msg={errors.email?.message} />
      </InputGroup>

      <InputGroup label="소속 부서">
        <Controller
          name="department"
          control={control}
          render={({ field }) => (
            <Dropdown
              options={DEPARTMENT_OPTIONS}
              placeholder="부서 선택"
              value={field.value}
              onChange={(v) =>
                field.onChange(Array.isArray(v) ? (v[0] ?? "") : v)
              }
            />
          )}
        />
        <ErrText msg={errors.department?.message} />
      </InputGroup>

      <InputGroup label="비밀번호">
        <Input
          inputSize="large"
          type={showPw ? "text" : "password"}
          placeholder="비밀번호"
          leftIcon={lockIcon}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "inline-flex",
              }}
            >
              <Icon
                name={showPw ? "eyeOff" : "eye"}
                size="sm"
                style={{ width: 16, height: 16, color: T.faint }}
              />
            </button>
          }
          {...register("password")}
        />
        <div style={{ marginTop: 5, fontSize: 12, color: T.faint }}>
          영문·숫자·특수문자 포함 8자 이상
        </div>
        <ErrText msg={errors.password?.message} />
      </InputGroup>

      <InputGroup label="비밀번호 확인">
        <Input
          inputSize="large"
          type="password"
          placeholder="비밀번호 재입력"
          leftIcon={lockIcon}
          {...register("passwordConfirm")}
        />
        <ErrText msg={errors.passwordConfirm?.message} />
      </InputGroup>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            background: T.surfaceAlt,
          }}
        >
          <Controller
            name="agree"
            control={control}
            render={({ field }) => (
              <Checkbox
                size="small"
                label="이용약관 및 개인정보 처리방침에 동의합니다"
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
              color: T.muted,
              fontFamily: "Pretendard",
              padding: 0,
            }}
          >
            보기
          </button>
        </div>
        <ErrText msg={errors.agree?.message} />
      </div>

      <div style={{ display: "grid", marginTop: 2 }}>
        <Button
          size="large"
          type="submit"
          disabled={isSubmitting}
          iconRight={
            <Icon name="arrowRight" size="sm" style={{ width: 15, height: 15 }} />
          }
        >
          가입 신청
        </Button>
      </div>

      {serverError && (
        <p
          role="alert"
          style={{ margin: 0, fontSize: 13, color: T.danger, textAlign: "center" }}
        >
          {serverError}
        </p>
      )}
    </form>
  );
}
```

> 사용 토큰(`T.surfaceAlt`, `T.border`, `T.danger`, `T.faint`, `T.muted`, `T.primary`, `T.heading`)은 모두 `apps/web/src/design/tokens.ts`에 정의되어 있음(확인 완료).

- [ ] **Step 4: `SignupPage` 구현**

`apps/web/src/pages/login/SignupPage.tsx`:

```tsx
import { T } from "../../design/tokens";
import { AuthLayout } from "./AuthLayout";
import { SignupForm } from "./SignupForm";
import { useNavigate } from "react-router-dom";

export function SignupPage() {
  const navigate = useNavigate();
  return (
    <AuthLayout
      cardMaxWidth={440}
      belowCard={
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 12.5,
            color: T.muted,
          }}
        >
          이미 계정이 있으신가요?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
              color: T.primary,
              fontFamily: "Pretendard",
              padding: 0,
            }}
          >
            로그인
          </button>
        </div>
      }
    >
      <h1
        style={{
          margin: 0,
          fontSize: 21,
          fontWeight: 800,
          color: T.heading,
          letterSpacing: "-0.025em",
        }}
      >
        회원가입
      </h1>
      <p style={{ margin: "7px 0 20px", fontSize: 13, color: T.muted }}>
        휴맥스 법무시스템 계정을 신청합니다. 관리자 승인 후 이용할 수 있습니다.
      </p>
      <SignupForm />
    </AuthLayout>
  );
}
```

- [ ] **Step 5: 라우트 추가**

`apps/web/src/routes.tsx`에 import 추가:

```tsx
import { SignupPage } from "./pages/login/SignupPage";
```

`/forgot-password` 라우트 다음 줄에 추가:

```tsx
      <Route path="/signup" element={<SignupPage />} />
```

- [ ] **Step 6: 테스트 통과 확인 (필요 시 Dropdown 상호작용 조정)**

Run: `pnpm --filter web test src/pages/login/SignupForm.test.tsx`
Expected: PASS (3 tests). 부서 Dropdown 클릭 패턴이 실제 DOM과 다르면 테스트의 해당 두 줄을 조정해 통과시킨다.

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/pages/login/SignupForm.tsx apps/web/src/pages/login/SignupForm.test.tsx apps/web/src/pages/login/SignupPage.tsx apps/web/src/routes.tsx
git commit -m "feat(web): 회원가입 화면 추가 (react-hook-form + zod)"
```

---

### Task 8: 전체 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트**

Run: `pnpm --filter web test`
Expected: 전부 PASS (기존 + 신규)

- [ ] **Step 2: 타입체크 + 빌드**

Run: `pnpm --filter web build`
Expected: 성공

- [ ] **Step 3: 린트**

Run: `pnpm --filter web lint`
Expected: 에러 없음 (경고 허용)

- [ ] **Step 4: 수동 확인 (선택)**

Run: `pnpm --filter web dev` 후 브라우저에서 `/login` → "회원가입"/"비밀번호 찾기" 링크 이동, 파비콘(Prism) 표시, 사이드바·브랜드 패널 로고 확인.

---

## Self-Review 결과

- **Spec 커버리지:** §3 공통셸/라우팅/링크(Task 3·5·7) ✓, §4 회원가입(Task 6·7) ✓, §5 비밀번호 찾기(Task 5) ✓, §6 로고/파비콘(Task 1·2·3·4) ✓, §7 테스트(Task 1·5·7) ✓, §8 범위 밖 준수(백엔드/프리뷰/타 앱 미변경) ✓.
- **Placeholder:** 없음. 모든 코드 스텝에 실제 코드 포함.
- **타입 일관성:** `signupSchema`/`SignupForm`/`signupDefaults`/`DEPARTMENT_OPTIONS`(Task 6) ↔ `SignupForm.tsx`(Task 7) 일치. `AuthLayout` props(`children`/`belowCard`/`cardMaxWidth`) ↔ LoginPage/SignupPage/ForgotPasswordPage 사용 일치. `signup({email,name,password})`는 기존 `api/auth.ts` 시그니처와 일치.
- **알려진 구현 시 확인 포인트:** `Dropdown`·`Checkbox` 상호작용 셀렉터(부서 선택 클릭 흐름)는 실제 렌더 DOM에 맞춰 테스트 미세조정할 수 있음(핵심 단언인 `signup` 호출 인자는 고정). 사용 디자인 토큰은 모두 존재 확인 완료.
