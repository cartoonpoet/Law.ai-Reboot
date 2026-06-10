# 회원가입 · 비밀번호 찾기 화면 + Prism 로고/파비콘

- 작성일: 2026-06-10
- 대상 앱: `apps/web`
- 시안: `Law.ai Reboot/app/login.jsx` (회원가입 / 비밀번호 찾기), `logo-fit.html` (로고 4번 Prism)

## 1. 목표

휴맥스 법무 워크스페이스(`apps/web`)에 다음을 추가한다.

1. **회원가입** 화면 (`/signup`)
2. **비밀번호 찾기** 화면 (`/forgot-password`)
3. **Prism(시안 4번) 로고**를 인앱 3곳에 적용하고, 웹 앱 파비콘을 Prism 마크로 설정

기존 로그인 화면(`apps/web/src/pages/login/`)과 톤·구조·코드 패턴을 그대로 따른다.

## 2. 확정된 결정 사항

| 항목 | 결정 |
| --- | --- |
| 레이아웃 | 기존 `LoginPage`와 동일한 2단 레이아웃(좌측 `BrandPanel` + 우측 폼 카드). 시안의 중앙 `AuthShell` 카드 레이아웃은 쓰지 않음 |
| 회원가입 사번·부서 필드 | UI는 시안 그대로 노출하되, 백엔드 전송은 `signup({ email, name, password })` 3개만. 사번·부서는 현재 클라이언트 전용(미전송) |
| 비밀번호 찾기 | 백엔드 엔드포인트 없음 → 프런트 stub. 전송 시 성공 화면(Alert)만 표시, 실제 메일 발송 없음 |
| 로고 적용 범위 | `apps/web`만. `apps/shell`·`apps/admin`은 범위 밖 |

## 3. 아키텍처 / 공통 셸

현재 `LoginPage.tsx`는 2단 레이아웃 + 우측 카드 마크업을 인라인으로 보유한다. signup/reset이 같은 셸을 복제하면 중복이 생기므로, 공통 셸을 추출한다.

- **`apps/web/src/pages/login/AuthLayout.tsx`** 신설
  - 좌측 `BrandPanel`, 우측 카드(흰 배경, border, radius 16, shadow), 카드 상단 로고, 하단 "계정 문의 · 내선 8230" 푸터를 담는다.
  - props: `children`(폼 영역). 제목/부제는 각 페이지가 `children` 상단에서 직접 렌더하거나, `title`/`subtitle` prop으로 전달(구현 시 단순한 쪽 선택 — 기본은 `children`에 포함).
- `LoginPage`, `SignupPage`, `ForgotPasswordPage` 모두 `AuthLayout`을 사용한다. `LoginPage`는 기존 인라인 셸을 `AuthLayout` 사용으로 리팩터링한다(동작·외형 변화 없음).

### 라우팅 (`apps/web/src/routes.tsx`)

`RequireAuth` 밖(public)에 추가:

```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/signup" element={<SignupPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
```

### 링크 배선

- `EmailLoginForm.tsx`의 "비밀번호 찾기" 버튼 → `useNavigate()`로 `/forgot-password` 이동(현재 inert).
- 로그인 카드 하단(또는 `AuthLayout` 푸터 위)에 "계정이 없으신가요? **회원가입**" 추가 → `/signup`. 시안 문구를 따른다.
- 회원가입/비밀번호 찾기 화면에는 각각 "이미 계정이 있으신가요? **로그인**", "← 로그인으로" 링크를 둔다.

## 4. 회원가입 (`SignupPage` + `SignupForm`)

- 파일: `apps/web/src/pages/login/SignupPage.tsx`, `apps/web/src/pages/login/SignupForm.tsx`
- 폼 라이브러리: **react-hook-form + zod** (메모리 규칙: 복잡한 폼. 계약 검토 요청 폼과 동일 스택)
- 필드(시안 `login.jsx` SignUp 그대로):
  - 이름(`name`, required) / 사번(`employeeNo`, required) — 2열 그리드
  - 회사 이메일(`email`, required, mail 아이콘)
  - 소속 부서(`department`, required) — `@lawkit/ui` `Dropdown`. 옵션: 법무팀/영업본부/개발본부/인프라팀/기타
  - 비밀번호(`password`, required, lock 아이콘, show/hide 토글, helper "영문·숫자·특수문자 포함 8자 이상")
  - 비밀번호 확인(`passwordConfirm`, required)
  - 약관 동의 체크박스(`agree`, required) + "보기" 링크(현재 동작 없음)
- zod 스키마 검증:
  - `name`, `employeeNo` 비어있지 않음
  - `email` 이메일 형식
  - `department` 선택됨
  - `password` 8자 이상 + 영문·숫자·특수문자 포함(정규식)
  - `passwordConfirm === password` (`refine`)
  - `agree === true`
- 제출(`onSubmit`): `signup({ email, name, password })` 호출 → 성공 시 `localStorage`에 `accessToken`/`refreshToken` 저장 후 `navigate("/")` (로그인과 동일 패턴). 실패 시 `role="alert"` 텍스트로 에러 표시.
- 사번·부서는 폼 상태로만 수집하고 현재 전송하지 않는다. 코드에 향후 확장 의도를 짧은 주석으로 남긴다.

## 5. 비밀번호 찾기 (`ForgotPasswordPage` + `ForgotPasswordForm`)

- 파일: `apps/web/src/pages/login/ForgotPasswordPage.tsx`, `apps/web/src/pages/login/ForgotPasswordForm.tsx`
- 폼 라이브러리: **React 19 `useActionState`** (메모리 규칙: 단순 폼. `EmailLoginForm`과 동일 패턴)
- 흐름(시안 `ResetPassword` 그대로):
  - 초기: 이메일 입력(mail 아이콘, helper "회사 이메일(@humaxit.com)을 입력하세요") + "재설정 링크 전송" 버튼
  - 전송(stub): 실제 API 호출 없이 `sent` 상태로 전환. `@lawkit/ui` `Alert type="success" title="메일을 전송했습니다"`로 입력 이메일 안내 표시 + "로그인으로 돌아가기" 버튼 + "메일이 오지 않았나요? 다시 전송"(상태 초기화)
  - 상단 "← 로그인으로" 링크
- 백엔드 호출·API 함수 추가 없음. stub임을 코드 주석으로 명시한다.

## 6. Prism 로고 + 파비콘

### 6.1 마크 정의 (시안 4번 Prism)

viewBox `0 0 48 48`, 두 개의 facet path + 두 개의 선형 그라디언트:

- `gFacetA`: `x1=0 y1=0 x2=1 y2=1`, `#6f9bff` → `#2151ec`
- `gFacetB`: `x1=0 y1=0 x2=0 y2=1`, `#1c46c9` → `#15349e`
- path A(밝은 면): `M16 10 L24 10 L24 32 L16 28 Z` → `fill=url(#gFacetA)`
- path B(어두운 면): `M16 28 L24 32 L36 32 L36 38 L16 38 Z` → `fill=url(#gFacetB)`

타일 배경 없는 단독 마크(시안 4번이 모든 맥락에서 단독 마크 사용).

### 6.2 공유 `Logo` 컴포넌트

- 파일: `apps/web/src/components/ui/Logo.tsx`
- props: `size?: number`(기본값 적절히, 예: 28). 내부에서 정사각 SVG 렌더.
- **그라디언트 ID 충돌 방지**: 로그인 화면은 한 페이지에 마크가 2개 이상 뜬다(BrandPanel + 카드). `useId()`로 인스턴스별 유니크 ID를 생성해 `<defs>`와 `fill=url(#...)`에 사용한다. 고정 ID 사용 금지.

### 6.3 적용 위치 (placeholder "L" → `<Logo>`)

| 파일 | 현재 | 변경 |
| --- | --- | --- |
| `BrandPanel.tsx` | 30×30 "L" 사각 타일 | `<Logo size={30} />` |
| `LoginPage.tsx`(→ `AuthLayout`) | 24×24 "L" 사각 타일 | `<Logo size={24} />` |
| `Sidebar.tsx` | 26×26 "L" 사각 타일 | `<Logo size={26} />` |

"Law.ai" 워드마크 텍스트, BETA 뱃지 등은 그대로 유지하고 마크 타일만 교체한다.

### 6.4 파비콘

- `apps/web/public/favicon.svg` 생성: 6.1의 Prism 마크(정적 SVG, 고정 그라디언트 ID 사용 — 독립 파일이라 충돌 없음).
- `apps/web/index.html` `<head>`에 `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` 추가.

## 7. 테스트

기존 vitest + React Testing Library 패턴(`*.test.tsx`)을 따른다.

- `SignupForm.test.tsx`
  - 필수 필드 미입력 시 검증 에러 노출
  - 비밀번호 불일치 시 에러
  - 약관 미동의 시 제출 차단
  - 유효 입력 → `signup` 호출이 `{ email, name, password }`로 일어나고 성공 시 `/`로 이동(`signup` mock)
- `ForgotPasswordForm.test.tsx`
  - 이메일 입력 후 전송 → 성공 Alert 노출(stub, 네트워크 호출 없음)
  - "다시 전송" → 입력 화면으로 복귀
- 라우트 스모크: `/signup`, `/forgot-password` 렌더 확인(필요 시).

## 8. 범위 밖

- 백엔드 변경 없음(SignupRequest DTO·auth-service 그대로, 비밀번호 재설정 엔드포인트 미구현).
- `design-preview.html` 정적 프리뷰 갱신 없음.
- `apps/shell`·`apps/admin` 로고/파비콘 변경 없음.
