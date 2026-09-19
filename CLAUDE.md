# Law.ai 프로젝트 규칙

## DB ↔ ERD 동기화 (필수)

DB 스키마를 변경할 때마다 **erdify MCP**를 사용해 **"Law.ai Reboot" ERD**를 최신 상태로 업데이트한다.

- **트리거**: Prisma 스키마(`services/*/prisma/schema.prisma`, 현재는 `services/user-service/prisma/schema.prisma`)의 모델/필드/관계/인덱스를 추가·수정·삭제했을 때.
- **동작**: 변경을 커밋하기 전(또는 직후)에 erdify MCP 도구로 "Law.ai Reboot" ERD에 동일한 테이블/컬럼/관계를 반영한다. 새 테이블·컬럼·FK·인덱스·삭제를 모두 반영한다.
- **대상 ERD 이름**: `Law.ai Reboot`
- 스키마 변경이 없는 작업에서는 ERD를 건드리지 않는다.

> erdify MCP 서버는 `.mcp.json`에 설정돼 있다(로컬 전용, 키 포함이라 git에서 제외됨). MCP가 로드돼 있지 않으면 Claude Code를 재시작해 연결한 뒤 동기화한다.

### 현재 스키마(동기화 기준)

`services/user-service/prisma/schema.prisma` (Postgres, `users` 스키마):

- **User**: id(uuid, PK), email(unique), name, passwordHash, createdAt — `passwordResetTokens` 관계
- **PasswordResetToken**: id(uuid, PK), userId(FK→User, onDelete Cascade, `@@index`), tokenHash(unique), expiresAt, usedAt(nullable), createdAt

---

## 커밋 컨벤션 (필수)

형식: `<type>: <커밋 내용>` (예: `feat: 로그인 OTP 추가`) — **이모지/아이콘은 사용하지 않는다.**

| type | 설명 |
| --- | --- |
| feat | 새로운 기능 추가 |
| fix | 버그 수정 |
| chore | 빌드 업무, 패키지 매니저, 라이브러리, dependencies 설정 |
| docs | 문서 수정 (ex. README.md) |
| design | 사용자 UI 디자인 변경 (ex. CSS) |
| style | 기능 수정 없는 코드 스타일 변경 |
| refactor | 코드 리팩토링 |
| test | 테스트 코드 추가/리팩토링 |
| perf | 성능 개선 |
| rename | 파일/폴더명 변경 |
| init | 초기 세팅 |

## 프론트엔드 컨벤션 (React · `apps/web` 전용)

> 아래 폴더/파일명·컴포넌트·타입·변수·함수·스타일 규칙은 **프론트엔드 React 코드(`apps/web`)에만** 적용한다. 백엔드(NestJS `services/*`)에는 적용하지 않는다.

### 선언식(Declarative) 개발 (필수)
- **명령식(imperative)이 아니라 선언식(declarative)으로 작성한다.** "어떻게(HOW) 단계별로 조작할지"가 아니라 "무엇(WHAT)을 보여줄지"를 상태로 선언하고, UI는 상태/props에서 **파생(derive)** 시킨다.
- **직접 DOM 조작 금지**: `document.querySelector`, `el.classList`/`style` 토글, `innerHTML`, 수동 show/hide 대신 **상태 기반 조건부 렌더링**과 **배열 `.map()`**을 쓴다. (예: `open &&` 렌더, `items.map(...)`)
- `useRef`는 포커스 이동·스크롤·외부 라이브러리 연동 등 **선언적으로 표현 불가한 경우에만** 사용한다.
- 외부 명령형 API(예: 카카오 우편번호 팝업, 서드파티 SDK)는 이벤트 핸들러(`handle~`) 안에 감싸고, **결과를 상태로 반영**해 화면은 선언적으로 유지한다.
- 파생 값은 **렌더 중 계산**하고, 불필요하게 `useEffect`+`setState`로 동기화하지 않는다.

### Hook 사용 제한 (필수)
- **`useEffect`는 기본 금지.** 파생 상태는 렌더 중 계산하고, 사용자 동작은 이벤트 핸들러에서 처리한다 — effect로 대체하지 않는다. 외부 시스템 동기화·구독·타이머 등 **정말 필요한 경우에만, 쓰기 전에 사용자에게 사유를 설명하고 승인**을 받는다. (승인 없이 `useEffect` 추가 금지)
- **`useMemo` / `useCallback` / `React.memo`는 기본 금지.** 의존성 배열 관리가 오히려 유지보수를 어렵게 하므로 지양한다. 기본적으로 그냥 매 렌더 계산/함수 생성을 허용한다. 성능상 정말 필요하면 **명확한 근거(실측·구체적 병목)와 함께 사용자에게 제시하고 승인**받은 뒤에만 사용한다.

### 구조 · 커스텀 훅 · 단일책임 (필수)
- **로직은 `use~` 커스텀 훅으로 분리한다.** 상태·데이터 패칭(API)·이벤트 처리·도메인 로직을 컴포넌트 본문에 몰아넣지 말고 커스텀 훅(`useXxx`)으로 추출해, 컴포넌트는 가능한 한 **뷰(렌더)에 집중**하게 한다. (예: `useCompanySearch`, `useContractRequestForm`)
- 커스텀 훅 네이밍: 반드시 **`use` 접두사** + 의미가 드러나는 이름. 파일명은 훅 이름과 동일(camelCase, 예: `useCompanySearch.ts`).
- **단일책임원칙(SRP)**: 컴포넌트·훅·유틸·타입은 각각 **한 가지 책임**만 갖는다. "한 파일에 다 때려박지" 말고 책임 단위로 파일을 분리한다.
- **파일이 커지면 분리한다.** 컴포넌트가 길어지면 하위 컴포넌트로 쪼개고, 로직 덩어리는 훅으로, 순수 함수는 `utils`로 빼낸다. 한 화면에 있어 한 파일에 적당히 크게 만들기보다, 읽고 테스트하기 쉬운 작은 단위를 선호한다.
- 같이 바뀌는 것은 같이 둔다(응집도). 기능 단위 폴더 구성을 우선한다.

### 폼(Form) 처리 (필수)
폼은 복잡도에 따라 **단계적으로** 선택한다. 필드마다 `useState` + `onChange`를 수동 배선하는 방식은 지양한다(선언적 폼 우선).
1. **간단한 폼 → React 19 폼 액션**: `<form action={...}>` + `useActionState`(필요 시 `useFormStatus`). 필드 1~2개, 검증이 거의 없는 제출 위주(예: 단순 로그인/검색).
2. **중간 복잡도 → react-hook-form 단독**: 필드가 여러 개거나 동적 추가·조건부 필드 등 상태 관리는 필요하지만 스키마 검증이 단순한 경우.
3. **그보다 높은 복잡도 → react-hook-form + zod**(`zodResolver`): 다수 필드 + 스키마 검증/타입 안전이 필요한 경우. 검증 규칙은 zod 스키마에 **선언**한다.

> lawkit `Input`은 ref를 전달하지 않으므로 react-hook-form 연결 시 `<Controller>`를 쓴다(자세한 건 메모리 참고).

### 폴더 · 파일명
- 폴더명: **camelCase**
- 파일명: 기본 **camelCase**, 단 컴포넌트 파일만 **PascalCase**

### Components
- 리액트 컴포넌트: **PascalCase**
- 컴포넌트 타입: `~Props` (예: `interface MainProps {}`)
- type / `.d.ts` / 일반 `.ts` 파일: camelCase
- props 명: camelCase
- 의미 없는 `div`나 최상단은 **Fragment** 사용
- children 불필요 시 **self-closing** (`<Component />`)

### Type
- interface든 type이든 **PascalCase**
- props 타입명은 `OOOProps`, 일반 type은 `OOOTypes`
- union/intersection은 `type` 사용 + PascalCase (예: `type SizeTypes = "s" | "m"`)

### Variable
- `var` 금지. 위에서부터 `const` → `let` 순으로 선언
- 상수는 영문 **대문자 SNAKE_CASE**: `API_KEY`
- 변수명은 의미가 드러나게. 배열은 `~Arr`보다 복수형(`fruits`, `userLists`)
- Boolean 값은 `is` / `has` 접두사
- `map` 사용 시 변동 리스트면 `key`를 고유하게(인덱스 금지)

### Function
- **화살표 함수** 사용
- 함수명은 동사+명사로 역할 명확히: `get~`(값 획득), `create~`(새 값 생성), `check~`(로직 확인)
- 이벤트 핸들러는 `handle~` 접두사
- 중복 함수는 `utils` 폴더에 모아 재사용

### LDS(@lawkit/ui) 사용 (하드 룰 · 훅 강제)
- **화면은 무조건 LDS 컴포넌트로 구성한다.** 표·버튼·입력·선택·탭·모달·진행바·타임라인 등은 손으로 만들지 말고 `@lawkit/ui` 의 것을 쓴다.
- 쓸 수 있는 컴포넌트와 정확한 props·템플릿 코드는 **`apps/web/node_modules/@lawkit/ui/CLAUDE.md`** 에 있다. 새 화면을 만들기 전에 거기서 먼저 찾는다.
- 자주 쓰는 대응: 표 `DataTable` · 버튼 `Button`/`IconButtonGroup` · 입력 `Input`/`NumberInput`/`Checkbox`/`Radio`/`DatePicker` · 선택 `Dropdown`/`TagSelect` · 여러 줄 입력 `Textarea` · 모달 `Modal`/`Drawer`/`FloatingModal` · 진행 `Progress` · 접기 `Collapse` · 탭 `Tabs`/`ButtonTab`/`ButtonGroup` · 빈 상태 `EmptyState` · 이력 `Timeline` · 남은 일수 `DdayBadge` · 일정 상세 `CalendarPopover` · 대시보드 카드 `Widget`/`StatGrid`.
- **자동 강제**: `apps/web`·`apps/admin` 의 `.tsx/.jsx` 편집/작성 시 `<table> <thead> <tbody> <button> <input> <select> <option> <textarea> <dialog> <progress> <details> <summary>` 를 새로 추가하면 PreToolUse 훅(`.claude/hooks/require-lds.sh`)이 **차단**한다.
- LDS 로 만들 수 없는 경우(LDS 에 없는 UI, 예: 월 달력 격자)에만 **사용자에게 사유를 먼저 설명하고 승인받은 뒤** 그 줄에 `lds-exempt: <사유>` 주석을 달아 통과시킨다. 승인 없이 우회 금지.
- LDS 에 없는 컴포넌트가 반복해서 필요하면 LDS 레포(`~/Documents/GitHub/LDS`)에 추가하는 것을 먼저 검토한다.

> ⚠️ 현행 상태: 기존 화면에는 날 태그로 만든 UI 가 남아 있다(사이드바·어시스턴트 채팅·에디터 등, 대부분 LDS 에 대응이 없는 것들). 훅은 **새로 추가되는 것만** 막으므로 기존 코드를 그대로 두는 편집은 통과한다. 다만 그 부분을 새로 고치게 되면 LDS 로 바꾸거나, 바꿀 수 없으면 사용자 승인을 받아 `lds-exempt: <사유>` 주석을 단다.

### Style (하드 룰 · 훅 강제)
- 시맨틱 태그 최대한 활용
- 스타일은 **무조건 vanilla-extract**(`*.css.ts`) 사용, **디자인 토큰(`themeVars`)** 사용
- **디자인 토큰을 개발해서 사용한다**: 필요한 값이 토큰에 없으면 임의 하드코딩(로컬 hex/px 등) 금지 → **토큰을 추가(개발)해서 쓰거나**, 추가 기준이 모호하면 **먼저 물어본다**.
- **인라인 스타일 절대 금지** (`style={{ ... }}`)
- **자동 강제**: `apps/web`의 `.tsx/.jsx` 편집/작성 시 새로 추가되는 `style={{`는 PreToolUse 훅(`.claude/hooks/no-inline-style.sh`)이 **차단**한다. 의도적으로 우회해야 하면 사용자에게 사유를 먼저 설명하고 승인받는다.

> ⚠️ 현행 상태: `apps/web`에는 레거시 인라인 `style={{}}`가 남아 있다. **신규 코드는 무조건 vanilla-extract + 토큰**으로 작성하고, 기존 인라인을 건드리게 되면 그 부분을 토큰 기반으로 마이그레이션한다(범위가 큰 일괄 변경은 별도 작업으로). 훅은 새로 추가되는 인라인만 막으므로, 기존 인라인을 그대로 두는 편집은 통과한다.

---

## 전용 서브에이전트 (`.claude/agents/`)

아래 성격의 일은 **직접 하지 말고 해당 에이전트에게 맡긴다**(Agent 툴의 `subagent_type`). 사람이 매번 "디자인 에이전트 시켜" 라고 말하지 않아도 되게 하려는 것이 목적이다.

| 에이전트 | 언제 쓰나 | 무엇을 강제하나 |
| --- | --- | --- |
| `lawai-designer` | 새 화면·UI 수정·시안 만들기 | 실행 화면 보고 그리기, LDS(`@lawkit/ui`) 사용, 인라인 스타일·하드코딩 금지, 계약/자문 화면과 같은 뼈대, AI(로아이) 카드 배치, 시안은 `/mockups` 라우트로 |
| `lawai-frontend-reviewer` | 커밋 전 필수 리뷰(프론트) | 훅 규칙, 선언식, 커스텀 훅 분리, SRP, LDS 미사용·중복 UI·접근성·테스트 누락 |
| `lawai-backend-reviewer` | 커밋 전 필수 리뷰(백엔드) | 테넌트 격리, 권한 서버 판정, 상태전이 CAS, 트랜잭션 범위, 게이트웨이 DTO 누락, Prisma 함정, ERD 동기화 필요 여부 |
| `lawai-deployer` | 수동 배포 | 바뀐 서비스만, 서버에서 빌드 금지(메모리 954MB), 스키마 변경 시 백업 먼저, 실제 화면 확인까지 |
| `lawai-qa` | 만든 기능 확인 | 개발서버에서 API 왕복 + 화면 + 콘솔 확인, 비밀번호 입력 금지, 확인 못 한 건 그대로 보고 |

> 커밋 전 코드리뷰는 `.claude/hooks/require-code-review.sh` 가 강제한다. 프론트·백엔드 리뷰어를 각각 돌린 뒤 발견한 문제를 고치고 `--mark` 로 기록한다.
