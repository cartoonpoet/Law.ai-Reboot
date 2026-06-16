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

### Style
- 시맨틱 태그 최대한 활용
- 스타일은 **무조건 vanilla-extract** 사용, 정의된 **디자인 토큰** 사용
- 토큰에 없는 값은 **임의로 쓰지 말고 먼저 물어볼 것**
- **인라인 스타일 절대 금지**

> ⚠️ 현행 상태: `apps/web`는 전부 인라인 `style={{}}`로 작성돼 있어 위 Style 규칙과 충돌한다. 신규 코드는 가능한 한 vanilla-extract로 작성하고, 기존 코드의 마이그레이션은 별도 작업으로 진행한다(범위가 크므로 임의 일괄 변경 금지).
