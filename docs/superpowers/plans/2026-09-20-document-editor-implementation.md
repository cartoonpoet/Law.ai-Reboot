# 표준계약서 문서 편집기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회사(테넌트)별 표준계약서 양식(템플릿)을 웹 에디터로 만들고 고치고, 계약 작성(표준계약서 체결)에서 그 양식으로 시작해 진짜 .docx 로 저장하는 기능을 끝까지 배포 가능한 상태로 구현한다.

**Architecture:** 기존 `apps/web/src/components/ui/RichTextEditor.tsx`(Tiptap, 표·전체 툴바·페이지 나누기까지 이번 세션에 이미 완성)를 그대로 재사용하고, `docs/superpowers/specs/2026-09-19-document-editor-design.md` 원안의 별도 `packages/document-editor` 워크스페이스 패키지는 만들지 않는다(스펙 작성 이후 그 에디터가 이미 `apps/web` production 코드로 완성돼 여러 화면이 쓰고 있어, 새 패키지를 파는 것은 순수 중복이다 — 이 편차는 §0에 기록). 백엔드는 `services/user-service`에 `document-templates`(템플릿 CRUD·버전·되돌리기)와 `documents`(docx 내보내기/mammoth 들여오기/AI 3종) 두 모듈을 새로 만들고, `services/api-gateway`에 REST 프록시 컨트롤러를 얹는다. 프런트는 이미 만든 시안(`apps/web/src/pages/mockups/documentEditor/*`)의 프레젠테이션 컴포넌트를 실제 데이터를 받도록 매개변수화해 `apps/web/src/components/documentEditor/`로 옮기고, 시안과 실제 화면(`apps/web/src/pages/documentTemplates/*`)이 같은 컴포넌트를 함께 쓰게 한다.

**Tech Stack:** NestJS TCP 마이크로서비스(user-service/api-gateway), Prisma(Postgres, `shared` 스키마), React 19 + Tiptap 3.26.0 + vanilla-extract(`apps/web`), `docx`(신규 npm 의존성, docx 파일 생성), `mammoth`(이미 의존성, docx→HTML 변환), `@tanstack/react-query`, `@lawai/contracts`(공유 DTO).

**Spec:** `docs/superpowers/specs/2026-09-19-document-editor-design.md`

## §0. 스펙 대비 편차 (구현 전 확정)

1. **`packages/document-editor` 패키지를 만들지 않는다.** 스펙이 이 패키지를 제안한 이유(표 지원 에디터 재사용)는 이미 `apps/web/src/components/ui/RichTextEditor.tsx`가 `withTable`·`withFullToolbar`·페이지 나누기까지 갖추고 `ContentSection`/`AdviceDetailSection`이 프로덕션에서 쓰는 중이라 해소됐다. 새 화면은 이 컴포넌트를 그대로 `import`한다.
2. **`ContractTemplate`에 `isPublished` 필드를 넣지 않는다.** 스펙의 Prisma 모델에 없고(§ 데이터 모델), 시안(`TemplateListMock`)에만 있던 장식용 필드다 — 실제 스펙을 따른다. 계약 작성 쪽 양식 선택은 "그 테넌트의 템플릿 전부"를 보여준다.
3. **템플릿 관리 권한 판정은 프런트·백엔드 모두 `services/user-service/src/advices/advices.authz.ts` 같은 별도 authz 파일을 만들지 않고** 서비스/컴포넌트 안 함수 하나로 처리한다 — 스펙이 말한 판정이 "`inHouseCounsel` + 시스템관리자"뿐이라 `canSeeCycleTimeStats.ts` 패턴 그대로 재사용하면 충분하다.
4. **`RichTextEditor`의 공개 계약은 HTML 문자열(`value`/`onChange`)이다** — `ContentSection`/`AdviceDetailSection`이 이미 그렇게 쓰고 있고(`Advice.background`/`question`도 DB에 HTML 문자열로 저장), 이번 기능도 그 계약을 바꾸지 않는다. 반면 스펙의 저장 모델(`ContractTemplateVersion.content: Json`)과 docx 변환기(Task 3)는 **Tiptap JSON**을 정본으로 쓴다. 그래서 저장 직전(HTML→JSON)·불러오기 직후(JSON→HTML) 딱 두 지점에서만 `@tiptap/core`의 `generateJSON`/`generateHTML`로 변환한다(Task 11 Step 1) — `RichTextEditor` 자체나 다른 화면은 건드리지 않는다.

## Global Constraints

- 커밋 컨벤션: `<type>: 내용`(이모지 금지), 타입은 `feat/fix/chore/docs/design/style/refactor/test/perf/rename/init` 중 하나(`CLAUDE.md`).
- DB 스키마를 바꾸면 커밋 전에 erdify MCP로 "Law.ai Reboot" ERD를 동기화한다(`CLAUDE.md`).
- `apps/web`·`apps/admin` 신규 코드: 화살표 함수, `useEffect`/`useMemo`/`useCallback` 승인 없이 금지, LDS(`@lawkit/ui`) 컴포넌트 강제(훅이 raw `<table>`/`<button>`/`<input>` 등을 막음), vanilla-extract + `themeVars` 토큰만(인라인 `style={{}}` 금지, 훅이 막음), 파일/폴더명은 `CLAUDE.md`의 camelCase/PascalCase 규칙.
- 백엔드(`services/*`): `tenantId`는 절대 요청 바디에서 받지 않는다 — 생성 시 `resolveTenantId(ctx)`, 조회/수정/삭제 시 모든 `where`에 `...tenantScope(ctx)`를 합친다(`services/user-service/src/common/tenant-scope.ts`, 이미 존재).
- RPC 경계를 넘는 에러는 `RpcException({status, message})`으로 던지고, 게이트웨이는 `rpcToHttp()` 파이프로 HTTP 에러로 변환한다(이미 존재하는 공용 유틸, 새로 안 만든다).
- 새 Prisma 모델은 `@@schema("shared")`(스펙에서 확정 — `ContractTemplate`/`ContractTemplateVersion`).
- 커밋마다 `bash .claude/hooks/require-code-review.sh --mark`로 프론트·백엔드 리뷰 완료를 기록한 뒤 커밋(프로젝트 훅이 강제).
- 각 태스크는 `pnpm turbo run lint test build --continue`가 통과해야 다음 태스크로 넘어간다.

---

## Task 1: Prisma 스키마 — `ContractTemplate` / `ContractTemplateVersion`

**Files:**
- Modify: `services/user-service/prisma/schema.prisma` (파일 끝에 추가)
- Create: `services/user-service/prisma/migrations/<timestamp>_add_contract_template/migration.sql` (Prisma가 생성)
- Test: `services/user-service/src/document-templates/document-templates.schema.spec.ts`

**Interfaces:**
- Produces: `ContractTemplate` Prisma 모델(`id, tenantId, categoryId, name, currentVersionNo, createdById, createdAt, updatedAt, deletedAt`), `ContractTemplateVersion` Prisma 모델(`id, templateId, versionNo, content(Json), clauseCount, createdById, createdAt`), `TemplateCategory` enum(`nda|service|supply|entrust|license|etc`). 이후 모든 태스크가 `this.prisma.contractTemplate` / `this.prisma.contractTemplateVersion` 로 쓴다.

- [ ] **Step 1: `schema.prisma` 끝에 모델 추가**

`services/user-service/prisma/schema.prisma` 파일의 맨 끝(742번째 줄 `AdviceMessage` 모델 뒤)에 그대로 추가:

```prisma
// 표준계약서 양식 분류 — 고정 6종(스펙: 카테고리 자유 추가는 이번 범위 아님).
enum TemplateCategory {
  nda // 비밀유지
  service // 용역
  supply // 물품공급
  entrust // 업무위탁
  license // SW·라이선스
  etc

  @@schema("shared")
}

// 표준양식(템플릿) — 회사(테넌트)별. 내용 자체는 버전에 있고, 여기는 목록·현재 버전 포인터만.
model ContractTemplate {
  id               String            @id @default(uuid())
  tenantId         String
  categoryId       TemplateCategory
  name             String
  currentVersionNo Int               @default(1)
  createdById      String
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  deletedAt        DateTime?

  versions ContractTemplateVersion[]

  @@index([tenantId, categoryId])
  @@index([tenantId])
  @@schema("shared")
}

// 버전은 불변 — 저장할 때마다 새 행을 추가하고 부모의 currentVersionNo 를 올린다.
// "되돌리기"도 옛 버전 내용을 복사해 새 버전으로 저장하는 것과 같은 동작(특수 케이스 아님).
model ContractTemplateVersion {
  id          String   @id @default(uuid())
  templateId  String
  versionNo   Int
  content     Json // Tiptap JSON — 정본
  clauseCount Int?
  createdById String
  createdAt   DateTime @default(now())

  template ContractTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, versionNo])
  @@index([templateId])
  @@schema("shared")
}
```

- [ ] **Step 2: 마이그레이션 생성**

Run:
```bash
cd services/user-service
pnpm prisma:migrate -- --name add_contract_template
```
(package.json의 `prisma:migrate` 스크립트가 `prisma migrate dev`를 감싼 것 — `-- --name`으로 이름 전달. 스크립트가 다른 형태면 `pnpm exec prisma migrate dev --name add_contract_template`로 직접 실행)

Expected: `services/user-service/prisma/migrations/<timestamp>_add_contract_template/migration.sql`이 생성되고 `CREATE TYPE "shared"."TemplateCategory"`, `CREATE TABLE "shared"."ContractTemplate"`, `CREATE TABLE "shared"."ContractTemplateVersion"` 문이 들어있는지 확인. 로컬 DB에 바로 적용됨(개발 DB 기준 — 프로덕션 DB는 배포 파이프라인이 별도 처리, 이 태스크에서 프로덕션 마이그레이션 실행 금지).

- [ ] **Step 3: Prisma client 재생성**

Run: `pnpm prisma:generate` (`services/user-service` 안에서)
Expected: `node_modules/.prisma/client`에 `ContractTemplate`/`ContractTemplateVersion`/`TemplateCategory` 타입이 생김. `pnpm exec tsc --noEmit`로 확인(에러 없어야 함).

- [ ] **Step 4: 스모크 테스트 작성 — 모델이 실제로 읽고 쓰이는지**

`services/user-service/src/document-templates/document-templates.schema.spec.ts` (새 폴더 `document-templates` 생성):

```ts
import { PrismaClient } from "@prisma/client";

// 마이그레이션이 실제로 적용됐는지 확인하는 스모크 테스트 — 서비스 로직 없이 Prisma 모델만 검증.
describe("ContractTemplate/ContractTemplateVersion 스키마", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("템플릿과 버전을 생성·연결·되돌리기 순서로 저장하고 읽을 수 있다", async () => {
    const tenantId = `test-tenant-${Date.now()}`;
    const userId = `test-user-${Date.now()}`;

    const template = await prisma.contractTemplate.create({
      data: {
        tenantId,
        categoryId: "nda",
        name: "테스트 비밀유지계약서",
        createdById: userId,
        versions: {
          create: { versionNo: 1, content: { type: "doc", content: [] }, createdById: userId },
        },
      },
      include: { versions: true },
    });
    expect(template.currentVersionNo).toBe(1);
    expect(template.versions).toHaveLength(1);

    const v2 = await prisma.contractTemplateVersion.create({
      data: { templateId: template.id, versionNo: 2, content: { type: "doc", content: [{ type: "paragraph" }] }, createdById: userId },
    });
    expect(v2.versionNo).toBe(2);

    // 정리
    await prisma.contractTemplate.delete({ where: { id: template.id } });
  });
});
```

- [ ] **Step 5: 테스트 실행**

Run: `pnpm --filter @lawai/user-service test document-templates.schema.spec.ts`
Expected: PASS (로컬 개발 DB가 떠 있어야 함 — `docker-compose.yml`의 postgres 컨테이너 기동 확인 후 실행)

- [ ] **Step 6: ERD 동기화**

erdify MCP로 "Law.ai Reboot" ERD에 `ContractTemplate`(컬럼: id, tenantId, categoryId, name, currentVersionNo, createdById, createdAt, updatedAt, deletedAt / FK 없음 / 인덱스: tenantId+categoryId, tenantId)와 `ContractTemplateVersion`(컬럼: id, templateId, versionNo, content, clauseCount, createdById, createdAt / FK: templateId → ContractTemplate.id, onDelete Cascade / unique: templateId+versionNo)을 추가한다. `TemplateCategory` enum도 함께 반영.

- [ ] **Step 7: Commit**

```bash
git add services/user-service/prisma/schema.prisma services/user-service/prisma/migrations services/user-service/src/document-templates
git commit -m "feat: 표준양식 템플릿 Prisma 모델 추가"
```

---

## Task 2: `@lawai/contracts` — 템플릿·문서 DTO + RPC 패턴

**Files:**
- Create: `packages/contracts/src/dto/documentTemplate.dto.ts`
- Create: `packages/contracts/src/dto/document.dto.ts`
- Modify: `packages/contracts/src/patterns.ts` (패턴 상수 추가)
- Modify: `packages/contracts/src/index.ts` (배럴에 두 줄 추가)
- Test: `packages/contracts/src/patterns.test.ts` (기존 파일에 케이스 추가)

**Interfaces:**
- Consumes: `packages/contracts/src/dto/tenant.dto.ts`의 `TenantContext`(이미 존재, `{ tenantId?: string; isSystemAdmin: boolean }`), `packages/contracts/src/dto/advice.dto.ts`의 `PushNotification` 타입은 쓰지 않음(템플릿 기능은 알림 없음).
- Produces: 아래 전체 타입·상수. Task 4~14가 그대로 import 해서 쓴다.

- [ ] **Step 1: 템플릿 DTO 작성**

`packages/contracts/src/dto/documentTemplate.dto.ts` (신규 파일, 전체):

```ts
// 표준양식(템플릿) — 회사(테넌트)별 계약서 양식. 버전은 불변(저장마다 새 버전), 되돌리기도 새 버전 저장.
import type { TenantContext } from "./tenant.dto";

export type TemplateCategoryTypes = "nda" | "service" | "supply" | "entrust" | "license" | "etc";

export interface TemplateVersionDto {
  versionNo: number;
  content: Record<string, unknown>; // Tiptap JSON
  clauseCount: number | null;
  createdById: string;
  createdByName: string | null;
  createdAt: string; // ISO
}

export interface TemplateSummaryDto {
  id: string;
  categoryId: TemplateCategoryTypes;
  name: string;
  currentVersionNo: number;
  createdById: string;
  createdByName: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// 상세 = 목록 정보 + 현재 버전 내용(가장 최근 버전 하나).
export interface TemplateDetailDto extends TemplateSummaryDto {
  currentVersion: TemplateVersionDto;
}

interface TemplateViewerRequest {
  viewerId: string;
  tenantContext: TenantContext;
}

export interface CreateTemplateRequest extends TemplateViewerRequest {
  categoryId: TemplateCategoryTypes;
  name: string;
  // 빈 문서로 시작하면 빈 Tiptap doc, DOCX 업로드로 시작하면 documents.import 결과 HTML을 클라이언트가
  // Tiptap JSON으로 변환해 여기 담아 보낸다.
  content: Record<string, unknown>;
}

export interface CreateTemplateResponse {
  template: TemplateDetailDto;
}

export interface ListTemplatesRequest extends TemplateViewerRequest {
  categoryId?: TemplateCategoryTypes;
  q?: string;
}

export interface ListTemplatesResponse {
  items: TemplateSummaryDto[];
  // 분류별 건수(필터 탭 숫자) — q는 반영하지 않은 전체 건수.
  counts: Record<TemplateCategoryTypes, number>;
}

export interface GetTemplateRequest extends TemplateViewerRequest {
  id: string;
}

export interface CreateTemplateVersionRequest extends TemplateViewerRequest {
  id: string;
  content: Record<string, unknown>;
  clauseCount: number | null;
}

export interface ListTemplateVersionsRequest extends TemplateViewerRequest {
  id: string;
}

export interface ListTemplateVersionsResponse {
  versions: TemplateVersionDto[]; // 최신이 먼저
}

// 되돌리기 = 옛 버전 content 를 그대로 새 버전으로 저장(특수 케이스 아님).
export interface RevertTemplateVersionRequest extends TemplateViewerRequest {
  id: string;
  toVersionNo: number;
}
```

- [ ] **Step 2: 문서 변환/AI DTO 작성**

`packages/contracts/src/dto/document.dto.ts` (신규 파일, 전체):

```ts
// 문서 편집기 — Tiptap JSON ↔ 진짜 .docx 변환(무상태), DOCX 업로드 들여오기, 로아이 AI 3종.
import type { TenantContext } from "./tenant.dto";

interface DocumentViewerRequest {
  viewerId: string;
  tenantContext: TenantContext;
}

// Tiptap JSON → .docx 바이트(base64). 파일 자체를 저장하지 않는 stateless 변환.
export interface ExportDocumentRequest extends DocumentViewerRequest {
  content: Record<string, unknown>;
  // 파일명(확장자 없이) — 응답 파일명에 그대로 쓰인다.
  fileName: string;
}

export interface ExportDocumentResponse {
  // .docx 바이트를 base64로 인코딩 — RPC(JSON) 경계를 그대로 통과시키기 위함.
  base64: string;
  fileName: string; // "<fileName>.docx"
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

// .docx 업로드 → mammoth.convertToHtml() → 에디터에 채울 HTML. 원본 파일은 저장하지 않는다.
export interface ImportDocumentRequest extends DocumentViewerRequest {
  base64: string; // 업로드된 .docx 바이트
  fileName: string;
}

export interface ImportDocumentResponse {
  html: string;
  // mammoth 가 변환 중 건너뛴 서식이 있으면 경고 메시지(없으면 빈 배열).
  warnings: string[];
}

// AI 3종 공통 — 로아이(assistant.chat)와 같은 방식: 본인 AI 키로만 동작, 없으면 needsSetup.
export interface AiDraftRequest extends DocumentViewerRequest {
  // 사용자 요청 한 줄(예: "비밀유지계약서 초안을 만들어 줘").
  request: string;
}

export interface AiDraftResponse {
  html: string;
  needsSetup: boolean;
}

export interface AiRewriteRequest extends DocumentViewerRequest {
  // 편집기에서 고른 문장/구간의 텍스트.
  selectedText: string;
  // 지시문(예: "다듬어줘", "조항으로 써줘").
  instruction: string;
}

export interface AiRewriteResponse {
  rewrittenText: string;
  needsSetup: boolean;
}

export type AiReviewSeverityTypes = "danger" | "warning" | "info";

export interface AiReviewFinding {
  severity: AiReviewSeverityTypes;
  kind: "위험 조항" | "빈칸" | "누락 조항";
  title: string;
  where: string; // 어느 조항/구간인지
  note: string;
}

export interface AiReviewRequest extends DocumentViewerRequest {
  // 지금 편집기 전체 내용(HTML로 변환해 보낸다 — 프롬프트가 이해하기 쉬운 형태).
  html: string;
}

export interface AiReviewResponse {
  findings: AiReviewFinding[];
  needsSetup: boolean;
}
```

- [ ] **Step 3: RPC 패턴 상수 추가**

`packages/contracts/src/patterns.ts` 파일 끝에 추가:

```ts
// 표준양식(템플릿) — 회사별 계약서 양식 CRUD·버전·되돌리기.
export const DOCUMENT_TEMPLATE_PATTERNS = {
  CREATE: "documentTemplate.create",
  LIST: "documentTemplate.list",
  GET: "documentTemplate.get",
  CREATE_VERSION: "documentTemplate.createVersion",
  LIST_VERSIONS: "documentTemplate.listVersions",
  REVERT: "documentTemplate.revert",
} as const;

// 문서 편집기 — Tiptap JSON↔docx 변환, DOCX 들여오기, 로아이 AI 3종.
export const DOCUMENT_PATTERNS = {
  EXPORT: "document.export",
  IMPORT: "document.import",
  AI_DRAFT: "document.aiDraft",
  AI_REWRITE: "document.aiRewrite",
  AI_REVIEW: "document.aiReview",
} as const;
```

- [ ] **Step 4: 배럴에 추가**

`packages/contracts/src/index.ts`에 아래 두 줄을 기존 `export * from "./dto/stats.dto";` 다음 줄에 추가:

```ts
export * from "./dto/documentTemplate.dto";
export * from "./dto/document.dto";
```

- [ ] **Step 5: 패턴 상수 테스트 추가**

`packages/contracts/src/patterns.test.ts`에 기존 `describe` 블록 옆에 추가(기존 파일 형식을 그대로 따름 — 각 패턴 그룹이 문자열이고 중복이 없는지 검증하는 기존 테스트 패턴을 복사):

```ts
import { DOCUMENT_PATTERNS, DOCUMENT_TEMPLATE_PATTERNS } from "./patterns";

describe("DOCUMENT_TEMPLATE_PATTERNS / DOCUMENT_PATTERNS", () => {
  it("모든 값이 고유한 문자열이다", () => {
    const values = [...Object.values(DOCUMENT_TEMPLATE_PATTERNS), ...Object.values(DOCUMENT_PATTERNS)];
    expect(new Set(values).size).toBe(values.length);
    values.forEach((v) => expect(typeof v).toBe("string"));
  });
});
```

- [ ] **Step 6: 빌드·테스트·타입체크**

Run:
```bash
cd packages/contracts
pnpm build
pnpm test
pnpm typecheck
```
Expected: 셋 다 PASS. `pnpm build`가 `dist/`를 갱신해야 다른 워크스페이스 패키지가 새 타입을 인식한다.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts
git commit -m "feat: 표준양식 템플릿·문서 편집기 DTO·RPC 패턴 추가"
```

---

## Task 3: Tiptap JSON → .docx 변환기 (순수 함수)

**Files:**
- Create: `services/user-service/src/documents/tiptap-to-docx.ts`
- Create: `services/user-service/src/documents/tiptap-to-docx.spec.ts`
- Modify: `services/user-service/package.json` (`docx` 의존성 추가)

**Interfaces:**
- Consumes: 없음(순수 함수, Prisma·RPC 모름).
- Produces: `tiptapJsonToDocx(doc: Record<string, unknown>): Promise<Buffer>` — Task 5(`DocumentsService.export`)가 그대로 호출.

- [ ] **Step 1: `docx` 의존성 추가**

`services/user-service/package.json`의 `dependencies`에 한 줄 추가(알파벳 순서 유지):

```json
    "docx": "^9.5.1",
```

Run: `pnpm install` (레포 루트에서)
Expected: `pnpm-lock.yaml` 갱신, `node_modules/.pnpm/docx@*` 생성.

- [ ] **Step 2: 실패하는 테스트 작성 — 지원 노드별 라운드트립**

`services/user-service/src/documents/tiptap-to-docx.spec.ts` (신규 폴더 `documents`):

```ts
import * as mammoth from "mammoth";
import { tiptapJsonToDocx } from "./tiptap-to-docx";

// 생성한 .docx 를 mammoth 로 다시 읽어 텍스트가 보존되는지 확인한다(라운드트립).
const extractText = async (buffer: Buffer): Promise<string> => (await mammoth.extractRawText({ buffer })).value;

describe("tiptapJsonToDocx", () => {
  it("제목(1~3)·문단·굵게/기울임/밑줄/취소선을 지원한다", async () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "비밀유지계약서" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "제1조 (목적)" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "굵은 글자" },
            { type: "text", text: " 보통 " },
            { type: "text", marks: [{ type: "italic" }, { type: "underline" }], text: "기울임밑줄" },
          ],
        },
      ],
    };
    const buffer = await tiptapJsonToDocx(doc);
    const text = await extractText(buffer);
    expect(text).toContain("비밀유지계약서");
    expect(text).toContain("제1조 (목적)");
    expect(text).toContain("굵은 글자");
    expect(text).toContain("기울임밑줄");
  });

  it("글머리·번호 목록(중첩 포함)을 지원한다", async () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "첫째" }] },
                {
                  type: "bulletList",
                  content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "둘째-중첩" }] }] }],
                },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "번호항목" }] }] }],
        },
      ],
    };
    const text = await extractText(await tiptapJsonToDocx(doc));
    expect(text).toContain("첫째");
    expect(text).toContain("둘째-중첩");
    expect(text).toContain("번호항목");
  });

  it("표를 지원한다", async () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "구분" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "내용" }] }] },
              ],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "기술" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "설계도" }] }] },
              ],
            },
          ],
        },
      ],
    };
    const text = await extractText(await tiptapJsonToDocx(doc));
    expect(text).toContain("구분");
    expect(text).toContain("설계도");
  });

  it("정렬·글자색·하이라이트·구분선이 있어도 변환에 실패하지 않는다", async () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center" },
          content: [
            { type: "text", marks: [{ type: "textStyle", attrs: { color: "#c0392b" } }], text: "빨간 글자" },
            { type: "text", marks: [{ type: "highlight", attrs: { color: "#fff2a8" } }], text: "형광펜" },
          ],
        },
        { type: "horizontalRule" },
        { type: "paragraph", content: [{ type: "text", text: "끝" }] },
      ],
    };
    const text = await extractText(await tiptapJsonToDocx(doc));
    expect(text).toContain("빨간 글자");
    expect(text).toContain("형광펜");
    expect(text).toContain("끝");
  });

  it("빈 문서(content 없음)도 유효한 .docx 를 만든다", async () => {
    const buffer = await tiptapJsonToDocx({ type: "doc", content: [] });
    expect(buffer.byteLength).toBeGreaterThan(0);
    const text = await extractText(buffer);
    expect(text.trim()).toBe("");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm --filter @lawai/user-service test tiptap-to-docx.spec.ts`
Expected: FAIL — `Cannot find module './tiptap-to-docx'`

- [ ] **Step 3: 변환기 구현**

`services/user-service/src/documents/tiptap-to-docx.ts` (신규 파일, 전체):

```ts
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
  type IRunOptions,
} from "docx";

// 지원 범위는 정확히 RichTextEditor 툴바가 지원하는 것과 같다:
// 제목(1~3)·문단·굵게/기울임/밑줄/취소선·글자색·하이라이트·글머리/번호 목록(중첩)·정렬·표·구분선.
interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

const HEADING_LEVELS: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
};

const ALIGNMENTS: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

// 색은 "#rrggbb" 형태만 지원(에디터 색상 선택기가 이 형태로만 저장한다) — # 은 docx 가 받지 않으므로 뗀다.
const toDocxColor = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const hex = value.replace("#", "");
  return /^[0-9a-fA-F]{6}$/.test(hex) ? hex : undefined;
};

const buildRuns = (nodes: TiptapNode[] = []): TextRun[] =>
  nodes
    .filter((node) => node.type === "text" && typeof node.text === "string")
    .map((node) => {
      const options: IRunOptions = { text: node.text ?? "" };
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") options.bold = true;
        if (mark.type === "italic") options.italics = true;
        if (mark.type === "underline") options.underline = {};
        if (mark.type === "strike") options.strike = true;
        if (mark.type === "textStyle") {
          const color = toDocxColor(mark.attrs?.color);
          if (color) options.color = color;
        }
        if (mark.type === "highlight") {
          const color = toDocxColor(mark.attrs?.color) ?? "FFF2A8";
          options.highlight = mapHighlightColor(color);
        }
      }
      return new TextRun(options);
    });

// docx 의 highlight 는 고정 팔레트(HighlightColor)만 받는다 — 에디터의 임의 hex 를 가장 가까운 값으로 맞춘다.
const mapHighlightColor = (_hex: string): "yellow" => "yellow";

const buildParagraph = (node: TiptapNode, listMeta?: { ordered: boolean; level: number }): Paragraph => {
  const align = ALIGNMENTS[(node.attrs?.textAlign as string) ?? ""] ?? undefined;
  return new Paragraph({
    heading: node.type === "heading" ? HEADING_LEVELS[(node.attrs?.level as number) ?? 1] : undefined,
    alignment: align,
    bullet: listMeta && !listMeta.ordered ? { level: listMeta.level } : undefined,
    numbering: listMeta?.ordered ? { reference: "template-ordered", level: listMeta.level } : undefined,
    children: buildRuns(node.content),
  });
};

// 목록(listItem)은 자기 문단들 + 중첩 목록을 재귀로 펼친다. level 은 중첩 깊이(0부터).
const buildListItems = (list: TiptapNode, ordered: boolean, level: number): Paragraph[] => {
  const items: Paragraph[] = [];
  for (const item of list.content ?? []) {
    for (const child of item.content ?? []) {
      if (child.type === "paragraph") {
        items.push(buildParagraph(child, { ordered, level }));
      } else if (child.type === "bulletList") {
        items.push(...buildListItems(child, false, level + 1));
      } else if (child.type === "orderedList") {
        items.push(...buildListItems(child, true, level + 1));
      }
    }
  }
  return items;
};

const buildTable = (node: TiptapNode): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: (node.content ?? []).map(
      (row) =>
        new TableRow({
          children: (row.content ?? []).map(
            (cell) =>
              new TableCell({
                children: (cell.content ?? []).map((cellChild) => buildParagraph(cellChild)),
              }),
          ),
        }),
    ),
  });

const buildBlocks = (nodes: TiptapNode[]): (Paragraph | Table)[] => {
  const blocks: (Paragraph | Table)[] = [];
  for (const node of nodes) {
    if (node.type === "heading" || node.type === "paragraph") {
      blocks.push(buildParagraph(node));
    } else if (node.type === "bulletList") {
      blocks.push(...buildListItems(node, false, 0));
    } else if (node.type === "orderedList") {
      blocks.push(...buildListItems(node, true, 0));
    } else if (node.type === "table") {
      blocks.push(buildTable(node));
    } else if (node.type === "horizontalRule") {
      blocks.push(new Paragraph({ border: { bottom: { color: "888888", space: 1, style: "single", size: 6 } } }));
    }
    // 지원하지 않는 노드 타입은 조용히 건너뛴다(스펙: "지원하는 노드/마크만 다룬다").
  }
  return blocks;
};

/** Tiptap JSON(에디터 정본) → 실제 .docx 바이트. 파일로 저장하지 않는 stateless 변환. */
export const tiptapJsonToDocx = async (doc: Record<string, unknown>): Promise<Buffer> => {
  const nodes = (doc.content as TiptapNode[] | undefined) ?? [];
  const document = new Document({
    numbering: {
      config: [
        {
          reference: "template-ordered",
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: "decimal" as const,
            text: "%1.",
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.5 * (level + 1)), hanging: convertInchesToTwip(0.25) } } },
          })),
        },
      ],
    },
    sections: [{ children: buildBlocks(nodes) }],
  });
  return Packer.toBuffer(document);
};
```

- [ ] **Step 4: 테스트 실행**

Run: `pnpm --filter @lawai/user-service test tiptap-to-docx.spec.ts`
Expected: PASS — 5개 테스트 모두.

- [ ] **Step 5: 타입체크**

Run: `pnpm --filter @lawai/user-service exec tsc --noEmit`
Expected: PASS. (`docx` 패키지가 자체 타입을 포함하므로 `@types/docx` 불필요.)

- [ ] **Step 6: Commit**

```bash
git add services/user-service/package.json services/user-service/pnpm-lock.yaml services/user-service/src/documents
git commit -m "feat: Tiptap JSON을 docx 파일로 변환하는 변환기 추가"
```

---

## Task 4: user-service — `DocumentTemplatesService`/`Controller` (CRUD·버전·되돌리기)

**Files:**
- Create: `services/user-service/src/document-templates/document-templates.service.ts`
- Create: `services/user-service/src/document-templates/document-templates.controller.ts`
- Create: `services/user-service/src/document-templates/document-templates.module.ts`
- Modify: `services/user-service/src/app.module.ts` (imports 배열에 `DocumentTemplatesModule` 추가)
- Test: `services/user-service/src/document-templates/document-templates.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`(`services/user-service/src/prisma/prisma.service.ts`), `tenantScope`/`resolveTenantId`(`services/user-service/src/common/tenant-scope.ts`), `DOCUMENT_TEMPLATE_PATTERNS`·`CreateTemplateRequest`·`ListTemplatesRequest`·`GetTemplateRequest`·`CreateTemplateVersionRequest`·`ListTemplateVersionsRequest`·`RevertTemplateVersionRequest`·`TemplateDetailDto`·`TemplateSummaryDto`·`TemplateVersionDto`·`TemplateCategoryTypes`(Task 2).
- Produces: `DocumentTemplatesService`(메서드: `create`/`list`/`get`/`createVersion`/`listVersions`/`revert`) — Task 7(게이트웨이)이 RPC 패턴으로 호출.

- [ ] **Step 1: 서비스 구현**

`services/user-service/src/document-templates/document-templates.service.ts` (신규 파일, 전체):

```ts
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  CreateTemplateRequest,
  CreateTemplateResponse,
  CreateTemplateVersionRequest,
  GetTemplateRequest,
  ListTemplatesRequest,
  ListTemplatesResponse,
  ListTemplateVersionsRequest,
  ListTemplateVersionsResponse,
  RevertTemplateVersionRequest,
  TemplateCategoryTypes,
  TemplateDetailDto,
  TemplateSummaryDto,
  TemplateVersionDto,
  TenantContext,
  TenantRole,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { resolveTenantId, tenantScope } from "../common/tenant-scope";

const NOT_FOUND_MESSAGE = "양식을 찾을 수 없습니다";
const TEMPLATE_CATEGORIES: TemplateCategoryTypes[] = ["nda", "service", "supply", "entrust", "license", "etc"];
// 표준양식 "관리"(만들기/새 버전/되돌리기)를 할 수 있는 역할 — 시스템 관리자는 별도 처리(isSystemAdmin).
const MANAGE_ROLES: TenantRole[] = ["inHouseCounsel"];

const requireName = (value: string): string => {
  const name = value?.trim() ?? "";
  if (name.length === 0) throw new RpcException({ status: 400, message: "양식 이름을 입력해 주세요" });
  return name;
};

type TemplateWithVersions = Awaited<ReturnType<DocumentTemplatesService["findTemplateWithLatest"]>>;

/**
 * 표준양식(템플릿) — 회사(테넌트)별 계약서 양식 CRUD, 불변 버전 이력, 되돌리기(=옛 버전을 새 버전으로 저장).
 * 관리(만들기/새 버전/되돌리기)는 inHouseCounsel·시스템관리자만, 조회(목록/상세)는 테넌트 구성원 누구나.
 */
@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(req: CreateTemplateRequest): Promise<CreateTemplateResponse> {
    const tenantId = resolveTenantId(req.tenantContext);
    await this.requireCanManage(req.viewerId, req.tenantContext);
    const name = requireName(req.name);

    const row = await this.prisma.contractTemplate.create({
      data: {
        tenantId,
        categoryId: req.categoryId,
        name,
        createdById: req.viewerId,
        versions: { create: { versionNo: 1, content: req.content as object, createdById: req.viewerId } },
      },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
    });
    return { template: await this.toDetail(row) };
  }

  async list(req: ListTemplatesRequest): Promise<ListTemplatesResponse> {
    await this.requireMember(req.viewerId, req.tenantContext);
    const q = req.q?.trim();
    const where = {
      deletedAt: null,
      ...tenantScope(req.tenantContext),
      ...(req.categoryId ? { categoryId: req.categoryId } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    };

    const [rows, grouped] = await Promise.all([
      this.prisma.contractTemplate.findMany({ where, orderBy: { updatedAt: "desc" } }),
      this.prisma.contractTemplate.groupBy({
        by: ["categoryId"],
        where: { deletedAt: null, ...tenantScope(req.tenantContext) },
        _count: { _all: true },
      }),
    ]);

    const people = await this.loadPeople(rows.map((row) => row.createdById));
    const counts = Object.fromEntries(TEMPLATE_CATEGORIES.map((c) => [c, 0])) as Record<TemplateCategoryTypes, number>;
    grouped.forEach((g) => {
      counts[g.categoryId] = g._count._all;
    });

    return { items: rows.map((row) => this.toSummary(row, people)), counts };
  }

  async get(req: GetTemplateRequest): Promise<TemplateDetailDto> {
    await this.requireMember(req.viewerId, req.tenantContext);
    const row = await this.findTemplateWithLatest(req.id, req.tenantContext);
    return this.toDetail(row);
  }

  async createVersion(req: CreateTemplateVersionRequest): Promise<TemplateDetailDto> {
    await this.requireCanManage(req.viewerId, req.tenantContext);
    const current = await this.findVisible(req.id, req.tenantContext);
    const nextVersionNo = current.currentVersionNo + 1;

    await this.prisma.$transaction([
      this.prisma.contractTemplateVersion.create({
        data: {
          templateId: current.id,
          versionNo: nextVersionNo,
          content: req.content as object,
          clauseCount: req.clauseCount,
          createdById: req.viewerId,
        },
      }),
      this.prisma.contractTemplate.update({ where: { id: current.id }, data: { currentVersionNo: nextVersionNo } }),
    ]);

    const row = await this.findTemplateWithLatest(req.id, req.tenantContext);
    return this.toDetail(row);
  }

  async listVersions(req: ListTemplateVersionsRequest): Promise<ListTemplateVersionsResponse> {
    await this.requireMember(req.viewerId, req.tenantContext);
    await this.findVisible(req.id, req.tenantContext);
    const rows = await this.prisma.contractTemplateVersion.findMany({
      where: { templateId: req.id },
      orderBy: { versionNo: "desc" },
    });
    const people = await this.loadPeople(rows.map((row) => row.createdById));
    return { versions: rows.map((row) => this.toVersionDto(row, people)) };
  }

  // 되돌리기 = 옛 버전 content 를 그대로 새 버전으로 저장(불변 이력을 지우지 않는다).
  async revert(req: RevertTemplateVersionRequest): Promise<TemplateDetailDto> {
    await this.requireCanManage(req.viewerId, req.tenantContext);
    const current = await this.findVisible(req.id, req.tenantContext);
    const target = await this.prisma.contractTemplateVersion.findUnique({
      where: { templateId_versionNo: { templateId: current.id, versionNo: req.toVersionNo } },
    });
    if (!target) throw new RpcException({ status: 404, message: "되돌릴 버전을 찾을 수 없습니다" });

    const nextVersionNo = current.currentVersionNo + 1;
    await this.prisma.$transaction([
      this.prisma.contractTemplateVersion.create({
        data: {
          templateId: current.id,
          versionNo: nextVersionNo,
          content: target.content as object,
          clauseCount: target.clauseCount,
          createdById: req.viewerId,
        },
      }),
      this.prisma.contractTemplate.update({ where: { id: current.id }, data: { currentVersionNo: nextVersionNo } }),
    ]);

    const row = await this.findTemplateWithLatest(req.id, req.tenantContext);
    return this.toDetail(row);
  }

  private async findVisible(id: string, ctx: TenantContext) {
    const row = await this.prisma.contractTemplate.findFirst({ where: { id, deletedAt: null, ...tenantScope(ctx) } });
    if (!row) throw new RpcException({ status: 404, message: NOT_FOUND_MESSAGE });
    return row;
  }

  private async findTemplateWithLatest(id: string, ctx: TenantContext) {
    const row = await this.prisma.contractTemplate.findFirst({
      where: { id, deletedAt: null, ...tenantScope(ctx) },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
    });
    if (!row || row.versions.length === 0) throw new RpcException({ status: 404, message: NOT_FOUND_MESSAGE });
    return row;
  }

  private async requireMember(viewerId: string, ctx: TenantContext): Promise<void> {
    if (ctx.isSystemAdmin) return;
    const membership = await this.prisma.userTenant.findFirst({ where: { userId: viewerId, tenantId: ctx.tenantId } });
    if (!membership) throw new RpcException({ status: 403, message: "회사 구성원만 이용할 수 있습니다" });
  }

  // 표준양식 관리(만들기/새 버전/되돌리기) 권한 — 프런트 canManageDocumentTemplates.ts 와 같은 판정.
  private async requireCanManage(viewerId: string, ctx: TenantContext): Promise<void> {
    if (ctx.isSystemAdmin) return;
    const membership = await this.prisma.userTenant.findFirst({
      where: { userId: viewerId, tenantId: ctx.tenantId },
      select: { role: true },
    });
    if (!membership || !MANAGE_ROLES.includes(membership.role)) {
      throw new RpcException({ status: 403, message: "표준양식 관리 권한이 없습니다" });
    }
  }

  private async loadPeople(ids: string[]): Promise<Map<string, string | null>> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, name: true } });
    return new Map(users.map((user) => [user.id, user.name]));
  }

  private toSummary(
    row: { id: string; categoryId: string; name: string; currentVersionNo: number; createdById: string; createdAt: Date; updatedAt: Date },
    people: Map<string, string | null>,
  ): TemplateSummaryDto {
    return {
      id: row.id,
      categoryId: row.categoryId as TemplateCategoryTypes,
      name: row.name,
      currentVersionNo: row.currentVersionNo,
      createdById: row.createdById,
      createdByName: people.get(row.createdById) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toVersionDto(
    row: { versionNo: number; content: unknown; clauseCount: number | null; createdById: string; createdAt: Date },
    people: Map<string, string | null>,
  ): TemplateVersionDto {
    return {
      versionNo: row.versionNo,
      content: row.content as Record<string, unknown>,
      clauseCount: row.clauseCount,
      createdById: row.createdById,
      createdByName: people.get(row.createdById) ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async toDetail(row: TemplateWithVersions): Promise<TemplateDetailDto> {
    const people = await this.loadPeople([row.createdById, row.versions[0].createdById]);
    return { ...this.toSummary(row, people), currentVersion: this.toVersionDto(row.versions[0], people) };
  }
}
```

- [ ] **Step 2: 컨트롤러**

`services/user-service/src/document-templates/document-templates.controller.ts` (신규 파일, 전체):

```ts
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  DOCUMENT_TEMPLATE_PATTERNS,
  type CreateTemplateRequest,
  type CreateTemplateVersionRequest,
  type GetTemplateRequest,
  type ListTemplatesRequest,
  type ListTemplateVersionsRequest,
  type RevertTemplateVersionRequest,
} from "@lawai/contracts";
import { DocumentTemplatesService } from "./document-templates.service";

@Controller()
export class DocumentTemplatesController {
  constructor(private readonly templates: DocumentTemplatesService) {}

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.CREATE)
  create(@Payload() req: CreateTemplateRequest) {
    return this.templates.create(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.LIST)
  list(@Payload() req: ListTemplatesRequest) {
    return this.templates.list(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.GET)
  get(@Payload() req: GetTemplateRequest) {
    return this.templates.get(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.CREATE_VERSION)
  createVersion(@Payload() req: CreateTemplateVersionRequest) {
    return this.templates.createVersion(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.LIST_VERSIONS)
  listVersions(@Payload() req: ListTemplateVersionsRequest) {
    return this.templates.listVersions(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.REVERT)
  revert(@Payload() req: RevertTemplateVersionRequest) {
    return this.templates.revert(req);
  }
}
```

- [ ] **Step 3: 모듈**

`services/user-service/src/document-templates/document-templates.module.ts` (신규 파일, 전체):

```ts
import { Module } from "@nestjs/common";
import { DocumentTemplatesController } from "./document-templates.controller";
import { DocumentTemplatesService } from "./document-templates.service";

@Module({
  controllers: [DocumentTemplatesController],
  providers: [DocumentTemplatesService],
  exports: [DocumentTemplatesService],
})
export class DocumentTemplatesModule {}
```

- [ ] **Step 4: `app.module.ts`에 등록**

`services/user-service/src/app.module.ts`의 `imports` 배열 끝(`AdvicesModule,` 다음)에 `DocumentTemplatesModule,` 추가, 파일 위쪽 import 목록에 `import { DocumentTemplatesModule } from "./document-templates/document-templates.module";` 추가.

- [ ] **Step 5: 서비스 테스트 작성**

`services/user-service/src/document-templates/document-templates.service.spec.ts` (신규 파일, 전체 — 실제 DB를 쓰는 통합 테스트, `advices.service.spec.ts`와 같은 스타일):

```ts
import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentTemplatesService } from "./document-templates.service";

describe("DocumentTemplatesService", () => {
  let service: DocumentTemplatesService;
  let prisma: PrismaService;
  let tenantId: string;
  let counselId: string;
  let generalId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [DocumentTemplatesService, PrismaService] }).compile();
    service = moduleRef.get(DocumentTemplatesService);
    prisma = moduleRef.get(PrismaService);

    tenantId = `tpl-tenant-${Date.now()}`;
    await prisma.tenant.create({ data: { id: tenantId, name: "테스트회사", plan: "standard", status: "active" } });
    counselId = `counsel-${Date.now()}`;
    generalId = `general-${Date.now()}`;
    await prisma.user.create({ data: { id: counselId, email: `${counselId}@test.com`, name: "사내변호사", passwordHash: "x" } });
    await prisma.user.create({ data: { id: generalId, email: `${generalId}@test.com`, name: "일반직원", passwordHash: "x" } });
    await prisma.userTenant.create({ data: { userId: counselId, tenantId, role: "inHouseCounsel" } });
    await prisma.userTenant.create({ data: { userId: generalId, tenantId, role: "general" } });
  });

  afterAll(async () => {
    await prisma.contractTemplate.deleteMany({ where: { tenantId } });
    await prisma.userTenant.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { id: { in: [counselId, generalId] } } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  const ctx = { tenantId, isSystemAdmin: false };

  it("일반 직원은 템플릿을 만들 수 없다(403)", async () => {
    await expect(
      service.create({ viewerId: generalId, tenantContext: ctx, categoryId: "nda", name: "테스트", content: { type: "doc" } }),
    ).rejects.toThrow(RpcException);
  });

  it("사내변호사는 템플릿을 만들고, 버전을 쌓고, 되돌릴 수 있다", async () => {
    const created = await service.create({
      viewerId: counselId,
      tenantContext: ctx,
      categoryId: "nda",
      name: "비밀유지계약서 표준",
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });
    expect(created.template.currentVersion.versionNo).toBe(1);

    const v2 = await service.createVersion({
      id: created.template.id,
      viewerId: counselId,
      tenantContext: ctx,
      content: { type: "doc", content: [{ type: "paragraph" }, { type: "paragraph" }] },
      clauseCount: 2,
    });
    expect(v2.currentVersion.versionNo).toBe(2);

    const versions = await service.listVersions({ id: created.template.id, viewerId: counselId, tenantContext: ctx });
    expect(versions.versions.map((v) => v.versionNo)).toEqual([2, 1]);

    const reverted = await service.revert({ id: created.template.id, viewerId: counselId, tenantContext: ctx, toVersionNo: 1 });
    // 되돌리기도 "새 버전 저장" — 버전 번호는 계속 올라간다(3), 이력이 지워지지 않는다.
    expect(reverted.currentVersion.versionNo).toBe(3);
    expect(reverted.currentVersion.content).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("일반 직원도 목록·상세는 볼 수 있다", async () => {
    const list = await service.list({ viewerId: generalId, tenantContext: ctx });
    expect(list.items.length).toBeGreaterThan(0);
  });

  it("다른 테넌트의 템플릿은 404로 숨긴다", async () => {
    const otherCtx = { tenantId: "other-tenant-xyz", isSystemAdmin: false };
    const list = await service.list({ viewerId: counselId, tenantContext: ctx });
    const id = list.items[0].id;
    await expect(service.get({ id, viewerId: counselId, tenantContext: otherCtx })).rejects.toThrow(RpcException);
  });
});
```

- [ ] **Step 6: 테스트 실행**

Run: `pnpm --filter @lawai/user-service test document-templates.service.spec.ts`
Expected: PASS — 4개 모두.

- [ ] **Step 7: 빌드·타입체크**

Run: `pnpm --filter @lawai/user-service build && pnpm --filter @lawai/user-service exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add services/user-service/src/document-templates services/user-service/src/app.module.ts
git commit -m "feat: 표준양식 템플릿 CRUD·버전·되돌리기 서비스 추가"
```

---

## Task 5: user-service — `DocumentsService`/`Controller` (docx 내보내기·DOCX 들여오기)

**Files:**
- Create: `services/user-service/src/documents/documents.service.ts`
- Create: `services/user-service/src/documents/documents.controller.ts`
- Create: `services/user-service/src/documents/documents.module.ts`
- Modify: `services/user-service/src/app.module.ts` (imports 배열에 `DocumentsModule` 추가)
- Test: `services/user-service/src/documents/documents.service.spec.ts`

**Interfaces:**
- Consumes: `tiptapJsonToDocx`(Task 3, `./tiptap-to-docx`), `ExportDocumentRequest`·`ExportDocumentResponse`·`ImportDocumentRequest`·`ImportDocumentResponse`(Task 2), `PrismaService`.
- Produces: `DocumentsService`(메서드: `export`/`import`) — Task 6이 같은 서비스에 AI 메서드를 더하고, Task 8(게이트웨이)이 호출.

- [ ] **Step 1: 서비스 구현**

`services/user-service/src/documents/documents.service.ts` (신규 파일, 전체 — Task 6에서 AI 메서드 3개를 이 클래스에 이어서 추가할 예정이므로 지금은 export/import만):

```ts
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import * as mammoth from "mammoth";
import type { ExportDocumentRequest, ExportDocumentResponse, ImportDocumentRequest, ImportDocumentResponse } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { tiptapJsonToDocx } from "./tiptap-to-docx";

const MAX_IMPORT_SIZE_BYTES = 20 * 1024 * 1024; // 20MB — 업로드 훨씬 넘는 이상 파일 방지.

/** 문서 편집기 — Tiptap JSON을 진짜 .docx 로 내보내고(stateless), .docx 를 HTML로 들여온다. */
@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async export(req: ExportDocumentRequest): Promise<ExportDocumentResponse> {
    await this.requireMember(req.viewerId, req.tenantContext.tenantId, req.tenantContext.isSystemAdmin);
    const fileName = (req.fileName?.trim() || "문서").slice(0, 100);
    const buffer = await tiptapJsonToDocx(req.content);
    return {
      base64: buffer.toString("base64"),
      fileName: `${fileName}.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  async import(req: ImportDocumentRequest): Promise<ImportDocumentResponse> {
    await this.requireMember(req.viewerId, req.tenantContext.tenantId, req.tenantContext.isSystemAdmin);
    const buffer = Buffer.from(req.base64, "base64");
    if (buffer.byteLength === 0) throw new RpcException({ status: 400, message: "빈 파일입니다" });
    if (buffer.byteLength > MAX_IMPORT_SIZE_BYTES) throw new RpcException({ status: 400, message: "파일이 너무 큽니다(20MB 이하)" });

    try {
      const result = await mammoth.convertToHtml({ buffer });
      return { html: result.value, warnings: result.messages.map((message) => message.message) };
    } catch (error) {
      throw new RpcException({
        status: 400,
        message: `워드 파일을 읽지 못했어요: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      });
    }
  }

  protected async requireMember(viewerId: string, tenantId: string | undefined, isSystemAdmin: boolean): Promise<void> {
    if (isSystemAdmin) return;
    const membership = await this.prisma.userTenant.findFirst({ where: { userId: viewerId, tenantId } });
    if (!membership) throw new RpcException({ status: 403, message: "회사 구성원만 이용할 수 있습니다" });
  }
}
```

- [ ] **Step 2: 컨트롤러**

`services/user-service/src/documents/documents.controller.ts` (신규 파일 — Task 6에서 AI 3개 핸들러를 이 파일에 이어서 추가할 예정):

```ts
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DOCUMENT_PATTERNS, type ExportDocumentRequest, type ImportDocumentRequest } from "@lawai/contracts";
import { DocumentsService } from "./documents.service";

@Controller()
export class DocumentsController {
  constructor(protected readonly documents: DocumentsService) {}

  @MessagePattern(DOCUMENT_PATTERNS.EXPORT)
  export(@Payload() req: ExportDocumentRequest) {
    return this.documents.export(req);
  }

  @MessagePattern(DOCUMENT_PATTERNS.IMPORT)
  import(@Payload() req: ImportDocumentRequest) {
    return this.documents.import(req);
  }
}
```

- [ ] **Step 3: 모듈**

`services/user-service/src/documents/documents.module.ts` (신규 파일, 전체 — Task 6에서 `AiClientModule`/`AiCredentialsModule` import를 이어서 추가할 예정):

```ts
import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
```

- [ ] **Step 4: `app.module.ts`에 등록**

`DocumentTemplatesModule,` 다음 줄에 `DocumentsModule,` 추가, import 목록에 `import { DocumentsModule } from "./documents/documents.module";` 추가.

- [ ] **Step 5: 테스트 작성**

`services/user-service/src/documents/documents.service.spec.ts` (신규 파일, 전체 — mammoth 라운드트립: 먼저 `tiptapJsonToDocx`로 만든 .docx를 다시 `import`로 넣어 텍스트가 보존되는지 확인):

```ts
import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentsService } from "./documents.service";

describe("DocumentsService", () => {
  let service: DocumentsService;
  let prisma: PrismaService;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [DocumentsService, PrismaService] }).compile();
    service = moduleRef.get(DocumentsService);
    prisma = moduleRef.get(PrismaService);

    tenantId = `doc-tenant-${Date.now()}`;
    userId = `doc-user-${Date.now()}`;
    await prisma.tenant.create({ data: { id: tenantId, name: "테스트회사", plan: "standard", status: "active" } });
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.com`, name: "테스터", passwordHash: "x" } });
    await prisma.userTenant.create({ data: { userId, tenantId, role: "general" } });
  });

  afterAll(async () => {
    await prisma.userTenant.deleteMany({ where: { tenantId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  const ctx = { tenantId, isSystemAdmin: false };

  it("Tiptap JSON을 .docx base64로 내보낸다", async () => {
    const res = await service.export({
      viewerId: userId,
      tenantContext: ctx,
      fileName: "테스트계약서",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "안녕하세요" }] }] },
    });
    expect(res.fileName).toBe("테스트계약서.docx");
    expect(res.base64.length).toBeGreaterThan(0);
  });

  it("내보낸 .docx를 다시 들여오면 텍스트가 보존된다(라운드트립)", async () => {
    const exported = await service.export({
      viewerId: userId,
      tenantContext: ctx,
      fileName: "라운드트립",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "라운드트립 확인용 문장" }] }] },
    });
    const imported = await service.import({ viewerId: userId, tenantContext: ctx, base64: exported.base64, fileName: "라운드트립.docx" });
    expect(imported.html).toContain("라운드트립 확인용 문장");
  });

  it("빈 파일은 400으로 거부한다", async () => {
    await expect(service.import({ viewerId: userId, tenantContext: ctx, base64: "", fileName: "빈파일.docx" })).rejects.toThrow(
      RpcException,
    );
  });

  it("회사 구성원이 아니면 403", async () => {
    const otherCtx = { tenantId: "no-such-tenant", isSystemAdmin: false };
    await expect(
      service.export({ viewerId: userId, tenantContext: otherCtx, fileName: "x", content: { type: "doc", content: [] } }),
    ).rejects.toThrow(RpcException);
  });
});
```

- [ ] **Step 6: 테스트 실행**

Run: `pnpm --filter @lawai/user-service test documents.service.spec.ts`
Expected: PASS — 4개 모두.

- [ ] **Step 7: 빌드·타입체크**

Run: `pnpm --filter @lawai/user-service build && pnpm --filter @lawai/user-service exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add services/user-service/src/documents services/user-service/src/app.module.ts
git commit -m "feat: 문서 편집기 docx 내보내기·DOCX 들여오기 서비스 추가"
```

---

## Task 6: user-service — 로아이 AI 3종 (초안 생성·선택 문장 다듬기·초안 검토)

**Files:**
- Modify: `services/user-service/src/documents/documents.service.ts` (메서드 3개 추가)
- Modify: `services/user-service/src/documents/documents.controller.ts` (핸들러 3개 추가)
- Modify: `services/user-service/src/documents/documents.module.ts` (`AiClientModule`/`AiCredentialsModule` import)
- Create: `services/user-service/src/documents/document-ai-reply.ts` (AI 응답 파싱 — `assistant-reply.ts`와 같은 역할)
- Test: `services/user-service/src/documents/document-ai-reply.spec.ts`
- Test: `services/user-service/src/documents/documents.ai.service.spec.ts`

**Interfaces:**
- Consumes: `AiCredentialsService`(`services/user-service/src/ai-credentials/ai-credentials.service.ts`, 이미 존재 — `getDecryptedKeyFor(viewerId): Promise<{model,apiKey}|null>`), `AiServiceClient`(`services/user-service/src/ai-credentials/ai-service.client.ts`, 이미 존재 — `chat({model,apiKey,system,messages}): Promise<{content:string}>`), `AiDraftRequest`·`AiDraftResponse`·`AiRewriteRequest`·`AiRewriteResponse`·`AiReviewRequest`·`AiReviewResponse`·`AiReviewFinding`(Task 2).
- Produces: `DocumentsService.aiDraft`/`aiRewrite`/`aiReview` — Task 8(게이트웨이)이 호출. `parseReviewJson(content: string): AiReviewFinding[]`(Task 11의 프런트 리뷰 파싱과 응답 모양을 맞추는 기준).

- [ ] **Step 1: AI 응답 파싱 유틸 작성**

`services/user-service/src/documents/document-ai-reply.ts` (신규 파일, 전체):

```ts
import type { AiReviewFinding, AiReviewSeverityTypes } from "@lawai/contracts";

const SEVERITIES: AiReviewSeverityTypes[] = ["danger", "warning", "info"];
const KINDS: AiReviewFinding["kind"][] = ["위험 조항", "빈칸", "누락 조항"];

// 모델이 ```html ... ``` 또는 ```json ... ``` 코드펜스로 감싸 보내는 경우가 흔해 벗겨낸다.
const stripCodeFence = (text: string): string => {
  const trimmed = text.trim();
  const match = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return match ? match[1].trim() : trimmed;
};

/** 초안 생성 응답 — HTML 그대로 쓰되 코드펜스만 벗긴다. 빈 응답이면 실패로 본다. */
export const parseDraftHtml = (content: string): string | null => {
  const html = stripCodeFence(content);
  return html.length > 0 ? html : null;
};

/** 문장 다듬기 응답 — 앞뒤 따옴표·코드펜스를 벗긴 평문. */
export const parseRewriteText = (content: string): string | null => {
  const text = stripCodeFence(content).replace(/^["']|["']$/g, "");
  return text.length > 0 ? text : null;
};

const isValidFinding = (value: unknown): value is AiReviewFinding => {
  const f = value as Partial<AiReviewFinding> | null;
  return (
    !!f &&
    typeof f.title === "string" &&
    typeof f.where === "string" &&
    typeof f.note === "string" &&
    SEVERITIES.includes(f.severity as AiReviewSeverityTypes) &&
    KINDS.includes(f.kind as AiReviewFinding["kind"])
  );
};

/** 초안 검토 응답 — `{ findings: [...] }` JSON. 형태가 안 맞는 항목은 버리고, 통째로 파싱 실패면 null. */
export const parseReviewJson = (content: string): AiReviewFinding[] | null => {
  try {
    const parsed = JSON.parse(stripCodeFence(content)) as { findings?: unknown };
    if (!Array.isArray(parsed.findings)) return null;
    return parsed.findings.filter(isValidFinding);
  } catch {
    return null;
  }
};
```

- [ ] **Step 2: 파싱 유틸 테스트**

`services/user-service/src/documents/document-ai-reply.spec.ts` (신규 파일, 전체):

```ts
import { parseDraftHtml, parseReviewJson, parseRewriteText } from "./document-ai-reply";

describe("document-ai-reply", () => {
  it("parseDraftHtml — 코드펜스를 벗긴다", () => {
    expect(parseDraftHtml("```html\n<h1>제목</h1>\n```")).toBe("<h1>제목</h1>");
    expect(parseDraftHtml("<p>그대로</p>")).toBe("<p>그대로</p>");
    expect(parseDraftHtml("")).toBeNull();
  });

  it("parseRewriteText — 따옴표·코드펜스를 벗긴다", () => {
    expect(parseRewriteText('"다듬은 문장"')).toBe("다듬은 문장");
    expect(parseRewriteText("```\n그대로\n```")).toBe("그대로");
  });

  it("parseReviewJson — 유효한 findings만 남긴다", () => {
    const content = JSON.stringify({
      findings: [
        { severity: "danger", kind: "위험 조항", title: "제목", where: "제1조", note: "설명" },
        { severity: "unknown", kind: "위험 조항", title: "무효", where: "x", note: "x" },
      ],
    });
    const findings = parseReviewJson(content);
    expect(findings).toHaveLength(1);
    expect(findings?.[0].title).toBe("제목");
  });

  it("parseReviewJson — JSON이 아니면 null", () => {
    expect(parseReviewJson("이건 JSON이 아닙니다")).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트 실행(실패 확인)**

Run: `pnpm --filter @lawai/user-service test document-ai-reply.spec.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: `documents.service.ts`에 AI 메서드 3개 추가**

`services/user-service/src/documents/documents.service.ts` 상단 import 블록을 아래로 교체(기존 import에 추가):

```ts
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import * as mammoth from "mammoth";
import type {
  AiDraftRequest,
  AiDraftResponse,
  AiRewriteRequest,
  AiRewriteResponse,
  AiReviewRequest,
  AiReviewResponse,
  ExportDocumentRequest,
  ExportDocumentResponse,
  ImportDocumentRequest,
  ImportDocumentResponse,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { AiCredentialsService } from "../ai-credentials/ai-credentials.service";
import { AiServiceClient } from "../ai-credentials/ai-service.client";
import { tiptapJsonToDocx } from "./tiptap-to-docx";
import { parseDraftHtml, parseReviewJson, parseRewriteText } from "./document-ai-reply";
```

생성자를 아래로 교체:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: AiCredentialsService,
    private readonly aiClient: AiServiceClient,
  ) {}
```

클래스 안 `import` 메서드 뒤, `protected async requireMember` 앞에 아래 3개 메서드를 추가:

```ts
  /** 초안 생성 — 빈 문서/새 템플릿에서 한 줄 요청으로 조항 구조를 갖춘 HTML을 만든다. */
  async aiDraft(req: AiDraftRequest): Promise<AiDraftResponse> {
    await this.requireMember(req.viewerId, req.tenantContext.tenantId, req.tenantContext.isSystemAdmin);
    const request = req.request?.trim();
    if (!request) throw new RpcException({ status: 400, message: "어떤 계약서를 쓸지 알려 주세요" });

    const credential = await this.credentials.getDecryptedKeyFor(req.viewerId);
    if (!credential) return { html: "", needsSetup: true };

    const system = [
      "당신은 한국 기업 법무팀의 계약서 초안 작성 도우미입니다.",
      "사용자 요청에 맞는 계약서 한 벌을 HTML로 만드세요.",
      "제목(h1), 전문(p), 조항 제목(h2, '제N조 (제목)' 형식), 조항 본문(p)으로 구성하세요.",
      "채워야 할 빈칸은 '[    ]' 형태로 남기세요.",
      "설명이나 코드펜스 없이 HTML 본문만 출력하세요.",
    ].join(" ");

    let content: string;
    try {
      ({ content } = await this.aiClient.chat({
        model: credential.model,
        apiKey: credential.apiKey,
        system,
        messages: [{ role: "user", content: request }],
      }));
    } catch (error) {
      throw new RpcException({ status: 502, message: `AI 응답을 받지 못했어요: ${this.getErrorMessage(error)}` });
    }

    const html = parseDraftHtml(content);
    if (!html) throw new RpcException({ status: 502, message: "AI가 유효한 초안을 만들지 못했어요" });
    return { html, needsSetup: false };
  }

  /** 선택 문장 다듬기/조항 작성 — 고른 구간만 지시문대로 바꾼다. */
  async aiRewrite(req: AiRewriteRequest): Promise<AiRewriteResponse> {
    await this.requireMember(req.viewerId, req.tenantContext.tenantId, req.tenantContext.isSystemAdmin);
    const selected = req.selectedText?.trim();
    const instruction = req.instruction?.trim();
    if (!selected || !instruction) throw new RpcException({ status: 400, message: "고친 문장과 지시문이 모두 필요합니다" });

    const credential = await this.credentials.getDecryptedKeyFor(req.viewerId);
    if (!credential) return { rewrittenText: "", needsSetup: true };

    const system = [
      "당신은 한국 기업 법무팀의 계약서 문장 교정 도우미입니다.",
      "사용자가 고른 문장(또는 메모)과 지시문을 받아 그 문장만 고쳐 쓰세요.",
      "다른 설명 없이 고친 문장 하나만, 따옴표나 코드펜스 없이 출력하세요.",
    ].join(" ");

    let content: string;
    try {
      ({ content } = await this.aiClient.chat({
        model: credential.model,
        apiKey: credential.apiKey,
        system,
        messages: [{ role: "user", content: `원문: ${selected}\n지시: ${instruction}` }],
      }));
    } catch (error) {
      throw new RpcException({ status: 502, message: `AI 응답을 받지 못했어요: ${this.getErrorMessage(error)}` });
    }

    const rewrittenText = parseRewriteText(content);
    if (!rewrittenText) throw new RpcException({ status: 502, message: "AI가 문장을 만들지 못했어요" });
    return { rewrittenText, needsSetup: false };
  }

  /** 초안 검토 — 문서 전체에서 위험 조항·빈칸·누락 조항을 찾아 구조화된 목록으로 돌려준다. */
  async aiReview(req: AiReviewRequest): Promise<AiReviewResponse> {
    await this.requireMember(req.viewerId, req.tenantContext.tenantId, req.tenantContext.isSystemAdmin);
    const html = req.html?.trim();
    if (!html) throw new RpcException({ status: 400, message: "검토할 문서 내용이 없습니다" });

    const credential = await this.credentials.getDecryptedKeyFor(req.viewerId);
    if (!credential) return { findings: [], needsSetup: true };

    const system = [
      "당신은 한국 기업 법무팀의 계약서 검토 도우미입니다.",
      "받은 계약서 HTML에서 회사에 불리한 위험 조항, 채워지지 않은 빈칸([   ] 형태), 표준 계약서에 흔히 있지만 빠진 조항을 찾으세요.",
      '오직 JSON 하나만 출력하세요: { "findings": [{ "severity": "danger"|"warning"|"info", "kind": "위험 조항"|"빈칸"|"누락 조항", "title": "한 줄 제목", "where": "몇 조인지", "note": "왜 문제고 어떻게 고칠지" }] }',
      "설명이나 코드펜스 없이 JSON만 출력하세요.",
    ].join(" ");

    let content: string;
    try {
      ({ content } = await this.aiClient.chat({
        model: credential.model,
        apiKey: credential.apiKey,
        system,
        messages: [{ role: "user", content: html }],
      }));
    } catch (error) {
      throw new RpcException({ status: 502, message: `AI 응답을 받지 못했어요: ${this.getErrorMessage(error)}` });
    }

    const findings = parseReviewJson(content);
    if (findings === null) throw new RpcException({ status: 502, message: "AI 검토 결과를 읽지 못했어요" });
    return { findings, needsSetup: false };
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === "object" && err !== null && typeof (err as { message?: unknown }).message === "string") {
      return (err as { message: string }).message;
    }
    return "알 수 없는 오류";
  }
```

- [ ] **Step 5: 컨트롤러에 핸들러 3개 추가**

`services/user-service/src/documents/documents.controller.ts`를 아래 전체로 교체:

```ts
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  DOCUMENT_PATTERNS,
  type AiDraftRequest,
  type AiRewriteRequest,
  type AiReviewRequest,
  type ExportDocumentRequest,
  type ImportDocumentRequest,
} from "@lawai/contracts";
import { DocumentsService } from "./documents.service";

@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @MessagePattern(DOCUMENT_PATTERNS.EXPORT)
  export(@Payload() req: ExportDocumentRequest) {
    return this.documents.export(req);
  }

  @MessagePattern(DOCUMENT_PATTERNS.IMPORT)
  import(@Payload() req: ImportDocumentRequest) {
    return this.documents.import(req);
  }

  @MessagePattern(DOCUMENT_PATTERNS.AI_DRAFT)
  aiDraft(@Payload() req: AiDraftRequest) {
    return this.documents.aiDraft(req);
  }

  @MessagePattern(DOCUMENT_PATTERNS.AI_REWRITE)
  aiRewrite(@Payload() req: AiRewriteRequest) {
    return this.documents.aiRewrite(req);
  }

  @MessagePattern(DOCUMENT_PATTERNS.AI_REVIEW)
  aiReview(@Payload() req: AiReviewRequest) {
    return this.documents.aiReview(req);
  }
}
```

- [ ] **Step 6: 모듈에 AI 의존성 연결**

`services/user-service/src/documents/documents.module.ts`를 아래 전체로 교체:

```ts
import { Module } from "@nestjs/common";
import { AiClientModule } from "../ai-credentials/ai-client.module";
import { AiCredentialsModule } from "../ai-credentials/ai-credentials.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [AiClientModule, AiCredentialsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
```

(참고: `AiClientModule`/`AiCredentialsModule`의 정확한 파일명이 다르면 — `services/user-service/src/ai-credentials/` 디렉터리를 확인해 실제 export 하는 모듈 클래스명·경로로 맞춘다. `AssistantModule`이 같은 두 모듈을 import 하고 있으니 `assistant.module.ts`를 참고.)

- [ ] **Step 7: AI 서비스 메서드 테스트**

`services/user-service/src/documents/documents.ai.service.spec.ts` (신규 파일, 전체 — `AiCredentialsService`/`AiServiceClient`를 목으로 대체):

```ts
import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { AiCredentialsService } from "../ai-credentials/ai-credentials.service";
import { AiServiceClient } from "../ai-credentials/ai-service.client";
import { DocumentsService } from "./documents.service";

describe("DocumentsService — AI 3종", () => {
  let service: DocumentsService;
  let credentials: { getDecryptedKeyFor: jest.Mock };
  let aiClient: { chat: jest.Mock };
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    credentials = { getDecryptedKeyFor: jest.fn() };
    aiClient = { chat: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PrismaService,
        { provide: AiCredentialsService, useValue: credentials },
        { provide: AiServiceClient, useValue: aiClient },
      ],
    }).compile();
    service = moduleRef.get(DocumentsService);
    const prisma = moduleRef.get(PrismaService);

    tenantId = `ai-doc-tenant-${Date.now()}`;
    userId = `ai-doc-user-${Date.now()}`;
    await prisma.tenant.create({ data: { id: tenantId, name: "테스트회사", plan: "standard", status: "active" } });
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.com`, name: "테스터", passwordHash: "x" } });
    await prisma.userTenant.create({ data: { userId, tenantId, role: "general" } });
  });

  afterAll(async () => {
    const prisma = (service as unknown as { prisma: PrismaService }).prisma;
    await prisma.userTenant.deleteMany({ where: { tenantId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  const ctx = { tenantId, isSystemAdmin: false };

  it("AI 키가 없으면 needsSetup:true를 준다(3종 공통)", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue(null);
    expect(await service.aiDraft({ viewerId: userId, tenantContext: ctx, request: "NDA 초안" })).toEqual({ html: "", needsSetup: true });
    expect(await service.aiRewrite({ viewerId: userId, tenantContext: ctx, selectedText: "문장", instruction: "다듬어줘" })).toEqual({
      rewrittenText: "",
      needsSetup: true,
    });
    expect(await service.aiReview({ viewerId: userId, tenantContext: ctx, html: "<p>본문</p>" })).toEqual({
      findings: [],
      needsSetup: true,
    });
  });

  it("aiDraft — 정상 응답을 HTML로 돌려준다", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ model: "gpt-4o", apiKey: "sk-test" });
    aiClient.chat.mockResolvedValue({ content: "<h1>비밀유지계약서</h1>" });
    const res = await service.aiDraft({ viewerId: userId, tenantContext: ctx, request: "비밀유지계약서 초안" });
    expect(res).toEqual({ html: "<h1>비밀유지계약서</h1>", needsSetup: false });
  });

  it("aiReview — JSON 응답을 findings로 파싱한다", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ model: "gpt-4o", apiKey: "sk-test" });
    aiClient.chat.mockResolvedValue({
      content: JSON.stringify({ findings: [{ severity: "danger", kind: "위험 조항", title: "제목", where: "제1조", note: "설명" }] }),
    });
    const res = await service.aiReview({ viewerId: userId, tenantContext: ctx, html: "<p>본문</p>" });
    expect(res.findings).toHaveLength(1);
    expect(res.needsSetup).toBe(false);
  });

  it("aiReview — JSON이 아니면 502", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue({ model: "gpt-4o", apiKey: "sk-test" });
    aiClient.chat.mockResolvedValue({ content: "JSON 아님" });
    await expect(service.aiReview({ viewerId: userId, tenantContext: ctx, html: "<p>본문</p>" })).rejects.toThrow(RpcException);
  });
});
```

- [ ] **Step 8: 테스트 실행**

Run:
```bash
pnpm --filter @lawai/user-service test document-ai-reply.spec.ts
pnpm --filter @lawai/user-service test documents.ai.service.spec.ts
pnpm --filter @lawai/user-service test documents.service.spec.ts
```
Expected: 전부 PASS(기존 `documents.service.spec.ts`도 생성자 변경으로 깨지지 않는지 재확인 — export/import 테스트는 credential 목 없이도 그대로 통과해야 함, 만약 DI 에러가 나면 Step 5 테스트도 `AiCredentialsService`/`AiServiceClient`를 같은 방식으로 목 처리하도록 수정).

- [ ] **Step 9: 빌드·타입체크**

Run: `pnpm --filter @lawai/user-service build && pnpm --filter @lawai/user-service exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add services/user-service/src/documents
git commit -m "feat: 로아이 문서 편집기 AI 3종(초안 생성·다듬기·검토) 추가"
```

---

## Task 7: api-gateway — 표준양식 템플릿 REST 컨트롤러

**Files:**
- Create: `services/api-gateway/src/document-templates/document-templates.controller.ts`
- Create: `services/api-gateway/src/document-templates/dto.ts`
- Create: `services/api-gateway/src/document-templates/document-templates.module.ts`
- Modify: `services/api-gateway/src/app.module.ts` (imports 배열에 `DocumentTemplatesModule` 추가)

**Interfaces:**
- Consumes: `JwtAuthGuard`(`services/api-gateway/src/auth/jwt-auth.guard.ts`), `extractTenantContext`(`services/api-gateway/src/common/tenant-context.ts`), `rpcToHttp`(`services/api-gateway/src/common/rpc-to-http.ts`), `"USER_CLIENT"` `ClientProxy`(`services/api-gateway/src/clients/clients.module.ts`), `DOCUMENT_TEMPLATE_PATTERNS`(Task 2).
- Produces: `GET/POST /document-templates`, `GET /document-templates/:id`, `POST /document-templates/:id/versions`, `GET /document-templates/:id/versions`, `POST /document-templates/:id/revert` — Task 9(프런트 api client)가 호출.

- [ ] **Step 1: DTO**

`services/api-gateway/src/document-templates/dto.ts` (신규 파일, 전체):

```ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min, MaxLength } from "class-validator";
import type { TemplateCategoryTypes } from "@lawai/contracts";

const NAME_MAX = 100;
const CATEGORIES: TemplateCategoryTypes[] = ["nda", "service", "supply", "entrust", "license", "etc"];

export class CreateTemplateDto {
  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  categoryId!: TemplateCategoryTypes;

  @ApiProperty({ example: "비밀유지계약서(NDA) 표준" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX)
  name!: string;

  @ApiProperty({ description: "Tiptap JSON(에디터 정본)" })
  @IsObject()
  content!: Record<string, unknown>;
}

export class CreateTemplateVersionDto {
  @ApiProperty({ description: "Tiptap JSON(에디터 정본)" })
  @IsObject()
  content!: Record<string, unknown>;

  @ApiPropertyOptional({ description: "조항 수(있으면)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  clauseCount!: number | null;
}

export class RevertTemplateVersionDto {
  @ApiProperty({ description: "되돌릴 버전 번호" })
  @IsInt()
  @Min(1)
  toVersionNo!: number;
}
```

- [ ] **Step 2: 컨트롤러**

`services/api-gateway/src/document-templates/document-templates.controller.ts` (신규 파일, 전체):

```ts
import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  DOCUMENT_TEMPLATE_PATTERNS,
  type CreateTemplateRequest,
  type CreateTemplateResponse,
  type CreateTemplateVersionRequest,
  type GetTemplateRequest,
  type JwtPayload,
  type ListTemplatesRequest,
  type ListTemplatesResponse,
  type ListTemplateVersionsRequest,
  type ListTemplateVersionsResponse,
  type RevertTemplateVersionRequest,
  type TemplateCategoryTypes,
  type TemplateDetailDto,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { extractTenantContext } from "../common/tenant-context";
import { rpcToHttp } from "../common/rpc-to-http";
import { CreateTemplateDto, CreateTemplateVersionDto, RevertTemplateVersionDto } from "./dto";

const getViewerId = (req: Request): string => (req as Request & { user: JwtPayload }).user.sub;

/** 표준양식 관리 — 회사별 계약서 템플릿 CRUD·버전·되돌리기. */
@ApiTags("document-templates")
@Controller("document-templates")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentTemplatesController {
  constructor(@Inject("USER_CLIENT") private readonly userClient: ClientProxy) {}

  @ApiOperation({ summary: "템플릿 만들기", description: "표준양식 관리 권한(inHouseCounsel·시스템관리자)만." })
  @Post()
  create(@Body() dto: CreateTemplateDto, @Req() req: Request): Promise<CreateTemplateResponse> {
    const payload: CreateTemplateRequest = {
      ...dto,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.send<CreateTemplateResponse>(DOCUMENT_TEMPLATE_PATTERNS.CREATE, payload);
  }

  @ApiOperation({ summary: "템플릿 목록", description: "categoryId·q(이름 검색). 회사 구성원 누구나 볼 수 있다." })
  @Get()
  list(
    @Req() req: Request,
    @Query("categoryId") categoryId?: TemplateCategoryTypes,
    @Query("q") q?: string,
  ): Promise<ListTemplatesResponse> {
    const payload: ListTemplatesRequest = {
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
      categoryId,
      q,
    };
    return this.send<ListTemplatesResponse>(DOCUMENT_TEMPLATE_PATTERNS.LIST, payload);
  }

  @ApiOperation({ summary: "템플릿 상세", description: "현재(최신) 버전 내용을 함께 준다." })
  @Get(":id")
  get(@Param("id") id: string, @Req() req: Request): Promise<TemplateDetailDto> {
    const payload: GetTemplateRequest = { id, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<TemplateDetailDto>(DOCUMENT_TEMPLATE_PATTERNS.GET, payload);
  }

  @ApiOperation({ summary: "새 버전 저장", description: "저장할 때마다 새 버전이 쌓인다(불변 이력)." })
  @Post(":id/versions")
  createVersion(
    @Param("id") id: string,
    @Body() dto: CreateTemplateVersionDto,
    @Req() req: Request,
  ): Promise<TemplateDetailDto> {
    const payload: CreateTemplateVersionRequest = {
      id,
      content: dto.content,
      clauseCount: dto.clauseCount ?? null,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.send<TemplateDetailDto>(DOCUMENT_TEMPLATE_PATTERNS.CREATE_VERSION, payload);
  }

  @ApiOperation({ summary: "버전 이력", description: "최신이 먼저." })
  @Get(":id/versions")
  listVersions(@Param("id") id: string, @Req() req: Request): Promise<ListTemplateVersionsResponse> {
    const payload: ListTemplateVersionsRequest = { id, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<ListTemplateVersionsResponse>(DOCUMENT_TEMPLATE_PATTERNS.LIST_VERSIONS, payload);
  }

  @ApiOperation({ summary: "되돌리기", description: "옛 버전 내용을 새 버전으로 다시 저장한다(이력이 지워지지 않는다)." })
  @Post(":id/revert")
  revert(@Param("id") id: string, @Body() dto: RevertTemplateVersionDto, @Req() req: Request): Promise<TemplateDetailDto> {
    const payload: RevertTemplateVersionRequest = {
      id,
      toVersionNo: dto.toVersionNo,
      viewerId: getViewerId(req),
      tenantContext: extractTenantContext(req),
    };
    return this.send<TemplateDetailDto>(DOCUMENT_TEMPLATE_PATTERNS.REVERT, payload);
  }

  private send<T>(pattern: string, payload: unknown): Promise<T> {
    return firstValueFrom(this.userClient.send<T>(pattern, payload).pipe(rpcToHttp()));
  }
}
```

- [ ] **Step 3: 모듈**

`services/api-gateway/src/document-templates/document-templates.module.ts` (신규 파일, 전체):

```ts
import { Module } from "@nestjs/common";
import { DocumentTemplatesController } from "./document-templates.controller";

@Module({ controllers: [DocumentTemplatesController] })
export class DocumentTemplatesModule {}
```

- [ ] **Step 4: `app.module.ts`에 등록**

`services/api-gateway/src/app.module.ts`의 `imports` 배열 `AdvicesModule,` 다음에 `DocumentTemplatesModule,` 추가, import 목록에 `import { DocumentTemplatesModule } from "./document-templates/document-templates.module";` 추가.

- [ ] **Step 5: 빌드·타입체크**

Run: `pnpm --filter @lawai/api-gateway build && pnpm --filter @lawai/api-gateway exec tsc --noEmit`
(패키지명이 다르면 `services/api-gateway/package.json`의 `name` 필드 확인 후 그 이름으로 `--filter` 지정)
Expected: PASS.

- [ ] **Step 6: 수동 스모크(선택) — 게이트웨이·user-service를 함께 띄워 확인**

Run: `pnpm dev` (레포 루트, turbo가 전 서비스 기동) → 다른 터미널에서:
```bash
curl -s http://localhost:3000/document-templates -H "Authorization: Bearer <로그인해서 받은 토큰>"
```
Expected: `401`이 아니라(토큰 있으면) `{"items":[],"counts":{...}}` 형태(템플릿이 아직 없으므로 빈 배열).

- [ ] **Step 7: Commit**

```bash
git add services/api-gateway/src/document-templates services/api-gateway/src/app.module.ts
git commit -m "feat: 게이트웨이에 표준양식 템플릿 REST API 추가"
```

---

## Task 8: api-gateway — 문서 변환·AI 3종 REST 컨트롤러

**Files:**
- Create: `services/api-gateway/src/documents/documents.controller.ts`
- Create: `services/api-gateway/src/documents/dto.ts`
- Create: `services/api-gateway/src/documents/documents.module.ts`
- Modify: `services/api-gateway/src/app.module.ts` (imports 배열에 `DocumentsModule` 추가)

**Interfaces:**
- Consumes: Task 7과 같은 공용 유틸(`JwtAuthGuard`/`extractTenantContext`/`rpcToHttp`/`"USER_CLIENT"`), `DOCUMENT_PATTERNS`(Task 2).
- Produces: `POST /documents/export`, `POST /documents/import`, `POST /documents/ai-draft`, `POST /documents/ai-rewrite`, `POST /documents/ai-review` — Task 9·11·12가 호출.

- [ ] **Step 1: DTO**

`services/api-gateway/src/documents/dto.ts` (신규 파일, 전체):

```ts
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsString, MaxLength } from "class-validator";

const FILE_NAME_MAX = 100;
const BASE64_MAX = 30_000_000; // 20MB 원본 기준 base64 팽창(~1.37배) 여유
const TEXT_MAX = 20_000;
const REQUEST_MAX = 500;

export class ExportDocumentDto {
  @ApiProperty({ description: "Tiptap JSON(에디터 정본)" })
  @IsObject()
  content!: Record<string, unknown>;

  @ApiProperty({ example: "비밀유지계약서" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(FILE_NAME_MAX)
  fileName!: string;
}

export class ImportDocumentDto {
  @ApiProperty({ description: ".docx 파일 바이트(base64)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(BASE64_MAX)
  base64!: string;

  @ApiProperty({ example: "업로드한파일.docx" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(FILE_NAME_MAX)
  fileName!: string;
}

export class AiDraftDto {
  @ApiProperty({ example: "비밀유지계약서 초안을 만들어 줘" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(REQUEST_MAX)
  request!: string;
}

export class AiRewriteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXT_MAX)
  selectedText!: string;

  @ApiProperty({ example: "다듬어줘" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(REQUEST_MAX)
  instruction!: string;
}

export class AiReviewDto {
  @ApiProperty({ description: "지금 편집기 전체 내용(HTML)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(TEXT_MAX)
  html!: string;
}
```

- [ ] **Step 2: 컨트롤러**

`services/api-gateway/src/documents/documents.controller.ts` (신규 파일, 전체):

```ts
import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  DOCUMENT_PATTERNS,
  type AiDraftRequest,
  type AiDraftResponse,
  type AiRewriteRequest,
  type AiRewriteResponse,
  type AiReviewRequest,
  type AiReviewResponse,
  type ExportDocumentRequest,
  type ExportDocumentResponse,
  type ImportDocumentRequest,
  type ImportDocumentResponse,
  type JwtPayload,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { extractTenantContext } from "../common/tenant-context";
import { rpcToHttp } from "../common/rpc-to-http";
import { AiDraftDto, AiRewriteDto, AiReviewDto, ExportDocumentDto, ImportDocumentDto } from "./dto";

const getViewerId = (req: Request): string => (req as Request & { user: JwtPayload }).user.sub;

/** 문서 편집기 — Tiptap JSON↔docx 변환, DOCX 들여오기, 로아이 AI 3종. */
@ApiTags("documents")
@Controller("documents")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(@Inject("USER_CLIENT") private readonly userClient: ClientProxy) {}

  @ApiOperation({ summary: "docx로 내보내기", description: "Tiptap JSON을 실제 .docx 바이트(base64)로 변환한다(저장하지 않음)." })
  @Post("export")
  export(@Body() dto: ExportDocumentDto, @Req() req: Request): Promise<ExportDocumentResponse> {
    const payload: ExportDocumentRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<ExportDocumentResponse>(DOCUMENT_PATTERNS.EXPORT, payload);
  }

  @ApiOperation({ summary: "DOCX 들여오기", description: ".docx 업로드를 에디터에 채울 HTML로 변환한다(원본은 저장하지 않음)." })
  @Post("import")
  import(@Body() dto: ImportDocumentDto, @Req() req: Request): Promise<ImportDocumentResponse> {
    const payload: ImportDocumentRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<ImportDocumentResponse>(DOCUMENT_PATTERNS.IMPORT, payload);
  }

  @ApiOperation({ summary: "로아이 — 초안 생성" })
  @Post("ai-draft")
  aiDraft(@Body() dto: AiDraftDto, @Req() req: Request): Promise<AiDraftResponse> {
    const payload: AiDraftRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<AiDraftResponse>(DOCUMENT_PATTERNS.AI_DRAFT, payload);
  }

  @ApiOperation({ summary: "로아이 — 선택 문장 다듬기/조항 작성" })
  @Post("ai-rewrite")
  aiRewrite(@Body() dto: AiRewriteDto, @Req() req: Request): Promise<AiRewriteResponse> {
    const payload: AiRewriteRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<AiRewriteResponse>(DOCUMENT_PATTERNS.AI_REWRITE, payload);
  }

  @ApiOperation({ summary: "로아이 — 초안 검토" })
  @Post("ai-review")
  aiReview(@Body() dto: AiReviewDto, @Req() req: Request): Promise<AiReviewResponse> {
    const payload: AiReviewRequest = { ...dto, viewerId: getViewerId(req), tenantContext: extractTenantContext(req) };
    return this.send<AiReviewResponse>(DOCUMENT_PATTERNS.AI_REVIEW, payload);
  }

  private send<T>(pattern: string, payload: unknown): Promise<T> {
    return firstValueFrom(this.userClient.send<T>(pattern, payload).pipe(rpcToHttp()));
  }
}
```

- [ ] **Step 3: 모듈 + `app.module.ts` 등록**

`services/api-gateway/src/documents/documents.module.ts` (신규 파일, 전체):

```ts
import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";

@Module({ controllers: [DocumentsController] })
export class DocumentsModule {}
```

`app.module.ts`에 `DocumentTemplatesModule,` 다음 줄에 `DocumentsModule,` 추가(+import 한 줄).

- [ ] **Step 4: 요청 크기 제한 확인**

`services/api-gateway/src/main.ts`를 열어 Nest의 기본 body 크기 제한(express 기본 100kb)이 `ImportDocumentDto.base64`(최대 20MB 원본 → base64 약 27MB)를 막지 않는지 확인한다. 제한이 없거나 이미 늘려져 있으면 그대로 두고, 기본값이면 `main.ts`의 `NestFactory.create` 옵션 또는 `app.use(json({ limit: "30mb" }))`를 추가한다(정확한 현재 설정은 파일을 읽고 판단 — 이미 다른 대용량 업로드가 있다면 그 값을 그대로 따른다).

- [ ] **Step 5: 빌드·타입체크**

Run: `pnpm --filter @lawai/api-gateway build && pnpm --filter @lawai/api-gateway exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/api-gateway/src/documents services/api-gateway/src/app.module.ts services/api-gateway/src/main.ts
git commit -m "feat: 게이트웨이에 문서 변환·로아이 AI 3종 REST API 추가"
```

---

## Task 9: apps/web — 권한 배관 + API 클라이언트

**Files:**
- Create: `apps/web/src/components/layout/canManageDocumentTemplates.ts`
- Create: `apps/web/src/components/layout/canManageDocumentTemplates.test.ts`
- Modify: `apps/web/src/components/layout/navSections.ts` (메뉴 항목 추가)
- Modify: `apps/web/src/components/layout/navPermission.ts` (`NavPermissionTypes`·`PERMISSION_BY_ITEM_ID`·`getNavPermission`에 추가)
- Modify: `apps/web/src/components/layout/hooks/useNavPermission.ts` (반환값에 추가)
- Modify: `apps/web/src/components/layout/navPermission.test.ts` (케이스 추가)
- Create: `apps/web/src/api/documentTemplates.ts`
- Create: `apps/web/src/api/documents.ts`

**Interfaces:**
- Consumes: `apps/web/src/api/client.ts`의 `apiFetch` — **Step 0에서 정확한 시그니처를 먼저 확인**(이 파일과 `apps/web/src/api/companies.ts` 또는 `apps/web/src/api/tenants.ts` 중 하나를 읽어 실제 호출 방식을 그대로 따른다. 아래 코드는 `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` 형태를 가정했다 — 실제 시그니처가 다르면 그 시그니처로 맞추고 이 태스크의 나머지 의도(함수명·파라미터·반환 타입)는 그대로 유지한다).
- Produces: `canManageDocumentTemplates(viewer): boolean`, `apps/web/src/api/documentTemplates.ts`의 `listTemplates`/`getTemplate`/`createTemplate`/`createTemplateVersion`/`listTemplateVersions`/`revertTemplateVersion`, `apps/web/src/api/documents.ts`의 `exportDocument`/`importDocument`/`aiDraft`/`aiRewrite`/`aiReview` — Task 10·11·12가 그대로 가져다 쓴다.

- [ ] **Step 0: `apiFetch` 시그니처 확인**

`apps/web/src/api/client.ts`와 `apps/web/src/api/companies.ts`를 읽고 실제 호출 패턴(요청 바디 전달 방식, 에러 처리, baseURL 처리)을 확인한다.

- [ ] **Step 1: 권한 판정 함수**

`apps/web/src/components/layout/canManageDocumentTemplates.ts` (신규 파일, 전체 — `canSeeCycleTimeStats.ts`와 완전히 같은 모양):

```ts
import type { TenantRole } from "@lawai/contracts";

/** 표준양식 관리(만들기/고치기/되돌리기)를 할 수 있는 역할 — 사내 법무 업무를 관리하는 사람만. */
const MANAGE_ROLES: TenantRole[] = ["inHouseCounsel"];

/**
 * 표준양식 관리 메뉴·화면을 볼 수 있는가.
 * 시스템 관리자는 전 화면을 보므로 포함하고, 그 밖에는 사내변호사만 본다.
 */
export const canManageDocumentTemplates = (viewer: { isSystemAdmin: boolean; role: TenantRole | null }): boolean =>
  viewer.isSystemAdmin || (viewer.role !== null && MANAGE_ROLES.includes(viewer.role));
```

- [ ] **Step 2: 테스트**

`apps/web/src/components/layout/canManageDocumentTemplates.test.ts` (신규 파일, 전체 — `canSeeCycleTimeStats.test.ts`의 케이스 구조를 그대로 복사):

```ts
import { canManageDocumentTemplates } from "./canManageDocumentTemplates";

describe("canManageDocumentTemplates", () => {
  it("시스템 관리자는 항상 true", () => {
    expect(canManageDocumentTemplates({ isSystemAdmin: true, role: null })).toBe(true);
  });
  it("inHouseCounsel은 true", () => {
    expect(canManageDocumentTemplates({ isSystemAdmin: false, role: "inHouseCounsel" })).toBe(true);
  });
  it("그 외 역할은 false", () => {
    expect(canManageDocumentTemplates({ isSystemAdmin: false, role: "general" })).toBe(false);
    expect(canManageDocumentTemplates({ isSystemAdmin: false, role: null })).toBe(false);
  });
});
```

- [ ] **Step 3: 메뉴 항목 추가**

`apps/web/src/components/layout/navSections.ts`의 `"계약 관리"` 섹션 `items` 배열에 마지막 항목으로 추가:

```ts
      { id: "document-templates", label: "표준양식 관리", icon: "fileText", path: "/document-templates" },
```

- [ ] **Step 4: 권한 타입·매핑에 추가**

`apps/web/src/components/layout/navPermission.ts`에서 세 곳을 고친다:

`import { canSeeCycleTimeStats } from "./canSeeCycleTimeStats";` 다음 줄에:
```ts
import { canManageDocumentTemplates } from "./canManageDocumentTemplates";
```

`NavPermissionTypes` 인터페이스에 필드 추가:
```ts
  /** 표준양식 관리 — 없으면 API 가 403 을 준다. */
  canManageDocumentTemplates: boolean;
```

`PERMISSION_BY_ITEM_ID`에 매핑 추가:
```ts
  "document-templates": "canManageDocumentTemplates",
```

`getNavPermission` 반환 객체에 추가:
```ts
  canManageDocumentTemplates: canManageDocumentTemplates(viewer),
```

- [ ] **Step 5: 글루 훅 반환값에 추가**

`apps/web/src/components/layout/hooks/useNavPermission.ts`는 이미 `getNavPermission(...)`의 결과를 스프레드하므로(`...getNavPermission({...})`) 수정이 필요 없다 — 위 Step 4로 자동 반영됨을 확인만 한다.

- [ ] **Step 6: 기존 테스트에 케이스 추가**

`apps/web/src/components/layout/navPermission.test.ts`를 열어 기존 `canSeeStats` 관련 테스트 옆에, 같은 스타일로 `document-templates` 항목이 `canManageDocumentTemplates`가 `false`일 때 `getVisibleNavSections`/`getVisibleNavItems` 결과에서 빠지는지 확인하는 케이스를 추가한다(기존 파일의 정확한 테스트 함수 구조를 읽고 그대로 따라 작성 — 새 파일을 만들지 않는다).

- [ ] **Step 7: 템플릿 API 클라이언트**

`apps/web/src/api/documentTemplates.ts` (신규 파일, 전체 — `apiFetch` 호출부는 Step 0에서 확인한 실제 시그니처로 맞춘다):

```ts
import { apiFetch } from "./client";
import type {
  CreateTemplateRequest,
  CreateTemplateResponse,
  CreateTemplateVersionRequest,
  ListTemplatesResponse,
  ListTemplateVersionsResponse,
  TemplateCategoryTypes,
  TemplateDetailDto,
} from "@lawai/contracts";

export interface ListTemplatesQuery {
  categoryId?: TemplateCategoryTypes;
  q?: string;
}

const toQueryString = (query: ListTemplatesQuery): string => {
  const params = new URLSearchParams();
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export const listTemplates = (query: ListTemplatesQuery = {}): Promise<ListTemplatesResponse> =>
  apiFetch<ListTemplatesResponse>(`/document-templates${toQueryString(query)}`);

export const getTemplate = (id: string): Promise<TemplateDetailDto> => apiFetch<TemplateDetailDto>(`/document-templates/${id}`);

export type CreateTemplateInput = Pick<CreateTemplateRequest, "categoryId" | "name" | "content">;

export const createTemplate = (input: CreateTemplateInput): Promise<CreateTemplateResponse> =>
  apiFetch<CreateTemplateResponse>("/document-templates", { method: "POST", body: JSON.stringify(input) });

export type CreateTemplateVersionInput = Pick<CreateTemplateVersionRequest, "content" | "clauseCount">;

export const createTemplateVersion = (id: string, input: CreateTemplateVersionInput): Promise<TemplateDetailDto> =>
  apiFetch<TemplateDetailDto>(`/document-templates/${id}/versions`, { method: "POST", body: JSON.stringify(input) });

export const listTemplateVersions = (id: string): Promise<ListTemplateVersionsResponse> =>
  apiFetch<ListTemplateVersionsResponse>(`/document-templates/${id}/versions`);

export const revertTemplateVersion = (id: string, toVersionNo: number): Promise<TemplateDetailDto> =>
  apiFetch<TemplateDetailDto>(`/document-templates/${id}/revert`, { method: "POST", body: JSON.stringify({ toVersionNo }) });
```

- [ ] **Step 8: 문서 변환·AI API 클라이언트**

`apps/web/src/api/documents.ts` (신규 파일, 전체):

```ts
import { apiFetch } from "./client";
import type {
  AiDraftResponse,
  AiReviewResponse,
  AiRewriteResponse,
  ExportDocumentResponse,
  ImportDocumentResponse,
} from "@lawai/contracts";

export const exportDocument = (content: Record<string, unknown>, fileName: string): Promise<ExportDocumentResponse> =>
  apiFetch<ExportDocumentResponse>("/documents/export", { method: "POST", body: JSON.stringify({ content, fileName }) });

export const importDocument = (base64: string, fileName: string): Promise<ImportDocumentResponse> =>
  apiFetch<ImportDocumentResponse>("/documents/import", { method: "POST", body: JSON.stringify({ base64, fileName }) });

export const requestAiDraft = (request: string): Promise<AiDraftResponse> =>
  apiFetch<AiDraftResponse>("/documents/ai-draft", { method: "POST", body: JSON.stringify({ request }) });

export const requestAiRewrite = (selectedText: string, instruction: string): Promise<AiRewriteResponse> =>
  apiFetch<AiRewriteResponse>("/documents/ai-rewrite", { method: "POST", body: JSON.stringify({ selectedText, instruction }) });

export const requestAiReview = (html: string): Promise<AiReviewResponse> =>
  apiFetch<AiReviewResponse>("/documents/ai-review", { method: "POST", body: JSON.stringify({ html }) });

/** 브라우저 File → base64(데이터 URL 접두사 없이 순수 바이트 부분만). */
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** docx export 응답(base64) → 업로드/폼에 바로 쓸 수 있는 File 객체. */
export const base64ToDocxFile = (res: ExportDocumentResponse): File => {
  const binary = atob(res.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], res.fileName, { type: res.mimeType });
};
```

- [ ] **Step 9: 테스트·타입체크·린트**

Run:
```bash
pnpm --filter @lawai/web test canManageDocumentTemplates.test.ts navPermission.test.ts
pnpm --filter @lawai/web exec tsc --noEmit
pnpm --filter @lawai/web exec eslint src/components/layout/canManageDocumentTemplates.ts src/api/documentTemplates.ts src/api/documents.ts
```
Expected: 전부 PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/layout apps/web/src/api/documentTemplates.ts apps/web/src/api/documents.ts
git commit -m "feat: 표준양식 관리 권한 배관 + 템플릿·문서 API 클라이언트 추가"
```

---

## Task 10: apps/web — 실제 표준양식 관리 목록 화면

**Files:**
- Create: `apps/web/src/pages/documentTemplates/TemplateListPage.tsx`
- Create: `apps/web/src/pages/documentTemplates/templateColumns.tsx`
- Create: `apps/web/src/pages/documentTemplates/hooks/useTemplateList.ts`
- Create: `apps/web/src/pages/documentTemplates/CreateTemplateModal.tsx`
- Create: `apps/web/src/pages/documentTemplates/documentTemplates.css.ts`
- Test: `apps/web/src/pages/documentTemplates/TemplateListPage.test.tsx`

**Interfaces:**
- Consumes: `listTemplates`/`createTemplate`(Task 9 `api/documentTemplates.ts`), `importDocument`/`fileToBase64`(Task 9 `api/documents.ts`), `STANDARD_FORM_CATEGORIES`(`apps/web/src/api/standardForms.ts`, 이미 존재 — 분류 6종 라벨), `TemplateSummaryDto`·`TemplateCategoryTypes`(Task 2). 시안 `apps/web/src/pages/mockups/documentEditor/TemplateListMock.tsx`의 레이아웃(머리+검색+분류 탭+표)을 그대로 따른다 — 먼저 그 파일을 읽고 구조를 참고한다.
- Produces: `/document-templates` 라우트에 렌더되는 `TemplateListPage` — Task 12가 `routes.tsx`에 등록.

- [ ] **Step 1: 목록 조회 훅**

`apps/web/src/pages/documentTemplates/hooks/useTemplateList.ts` (신규 파일, 전체):

```ts
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTemplates } from "../../../api/documentTemplates";
import type { TemplateCategoryTypes } from "@lawai/contracts";

export const TEMPLATE_LIST_QUERY_KEY = ["documentTemplates"] as const;

/** 표준양식 목록 — 분류 탭 + 이름 검색. */
export const useTemplateList = () => {
  const [categoryId, setCategoryId] = useState<TemplateCategoryTypes | "all">("all");
  const [keyword, setKeyword] = useState("");

  const query = useQuery({
    queryKey: [...TEMPLATE_LIST_QUERY_KEY, categoryId, keyword],
    queryFn: () => listTemplates({ categoryId: categoryId === "all" ? undefined : categoryId, q: keyword || undefined }),
  });

  return {
    items: query.data?.items ?? [],
    counts: query.data?.counts,
    isLoading: query.isLoading,
    isError: query.isError,
    categoryId,
    setCategoryId,
    keyword,
    setKeyword,
    refetch: query.refetch,
  };
};
```

- [ ] **Step 2: 표 칼럼 정의**

`apps/web/src/pages/documentTemplates/templateColumns.tsx` (신규 파일, 전체 — 시안 `templateColumns.tsx`의 구조를 따르되 실제 `TemplateSummaryDto` 필드에 맞춘다. 실제 DTO에는 `clauseCount`가 없으므로 "조항" 칸 대신 "만든 사람"을 넣는다):

```tsx
import { Link } from "react-router-dom";
import type { ColumnDef } from "@lawkit/ui";
import type { TemplateSummaryDto } from "@lawai/contracts";
import { STANDARD_FORM_CATEGORIES } from "../../api/standardForms";

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  STANDARD_FORM_CATEGORIES.map((item) => [item.id, item.label]),
);

export const TEMPLATE_COLUMNS: ColumnDef<TemplateSummaryDto>[] = [
  {
    accessorKey: "name",
    header: "양식 이름",
    size: 280,
    cell: (info) => <Link to={`/document-templates/${info.row.original.id}`}>{info.row.original.name}</Link>,
  },
  {
    accessorKey: "categoryId",
    header: "분류",
    size: 120,
    cell: (info) => <span>{CATEGORY_LABEL[info.row.original.categoryId] ?? info.row.original.categoryId}</span>,
  },
  {
    accessorKey: "currentVersionNo",
    header: "현재 버전",
    size: 100,
    cell: (info) => <span>v{info.row.original.currentVersionNo}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: "마지막 수정",
    size: 130,
    cell: (info) => <span>{info.row.original.updatedAt.slice(0, 10)}</span>,
  },
  {
    accessorKey: "createdByName",
    header: "만든 사람",
    size: 130,
    cell: (info) => <span>{info.row.original.createdByName ?? "—"}</span>,
  },
];
```

- [ ] **Step 3: 새 양식 만들기 모달(분류·이름 입력 → 빈 문서/DOCX 업로드 공용)**

`apps/web/src/pages/documentTemplates/CreateTemplateModal.tsx` (신규 파일, 전체 — LDS `Modal`/`Input`/`Dropdown`/`Button` 사용, `lds-exempt` 불필요):

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Input, Dropdown, Button, Alert } from "@lawkit/ui";
import type { TemplateCategoryTypes } from "@lawai/contracts";
import { createTemplate } from "../../api/documentTemplates";
import { STANDARD_FORM_CATEGORIES } from "../../api/standardForms";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

interface CreateTemplateModalProps {
  onClose: () => void;
  // DOCX 업로드로 시작하면 mammoth 로 변환된 초기 HTML(빈 문서면 undefined) — 저장은 편집기 화면에서
  // HTML→Tiptap JSON 변환 후 이뤄지므로, 여기서는 "빈 문서 뼈대"로만 만들고 편집기 진입 뒤 즉시 첫 저장한다.
  initialHtml?: string;
}

/** 표준양식 이름·분류를 받아 템플릿을 만들고 편집기로 이동한다. */
export const CreateTemplateModal = ({ onClose, initialHtml }: CreateTemplateModalProps) => {
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState<TemplateCategoryTypes>("nda");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (name.trim() === "") return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await createTemplate({ categoryId, name: name.trim(), content: EMPTY_DOC });
      // DOCX 업로드로 시작한 경우 들여온 HTML을 편집기 초기값으로 넘긴다(편집기가 JSON 변환 후 첫 저장을 한다).
      navigate(`/document-templates/${res.template.id}`, { state: initialHtml ? { initialHtml } : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "양식을 만들지 못했습니다");
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="새 표준양식 만들기"
      footer={
        <>
          <Button variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button disabled={name.trim() === "" || isSaving} onClick={handleCreate}>
            {isSaving ? "만드는 중…" : "만들고 편집하기"}
          </Button>
        </>
      }
    >
      {error && <Alert type="danger" size="small">{error}</Alert>}
      <Dropdown
        label="분류"
        value={categoryId}
        onChange={(next) => setCategoryId(next as TemplateCategoryTypes)}
        options={STANDARD_FORM_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
      />
      <Input label="양식 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 비밀유지계약서(NDA) 표준" />
    </Modal>
  );
};
```

- [ ] **Step 4: 목록 페이지**

`apps/web/src/pages/documentTemplates/TemplateListPage.tsx` (신규 파일 — 시안 `TemplateListMock.tsx`를 읽고 같은 레이아웃 클래스(`Panel`/`DataTable`/`EmptyState`/`ButtonGroup` segmented 탭)를 재사용하되, 데이터는 `useTemplateList`에서 온다. `documentTemplates.css.ts`는 시안의 `documentEditorMock.css.ts` 중 목록에 쓰인 클래스(`filters`/`search`/`searchIcon`/`pager`)만 옮겨온다):

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ButtonGroup, DataTable, EmptyState, Icon, Input } from "@lawkit/ui";
import { Panel } from "../../components/ui/Panel";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { STANDARD_FORM_CATEGORIES } from "../../api/standardForms";
import { importDocument, fileToBase64 } from "../../api/documents";
import { TEMPLATE_COLUMNS } from "./templateColumns";
import { useTemplateList } from "./hooks/useTemplateList";
import { CreateTemplateModal } from "./CreateTemplateModal";
import * as css from "./documentTemplates.css";

/** 1. 표준양식 관리 — 목록. 분류별로 모아 보고, 새 양식은 빈 문서로 시작하거나 워드 파일을 올려 만든다. */
export const TemplateListPage = () => {
  const navigate = useNavigate();
  const list = useTemplateList();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [uploadedHtml, setUploadedHtml] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { html } = await importDocument(base64, file.name);
      setUploadedHtml(html);
      setIsCreateOpen(true);
    } finally {
      setIsUploading(false);
    }
  };

  const tabs = [
    { value: "all", label: "전체" },
    ...STANDARD_FORM_CATEGORIES.map((item) => ({
      value: item.id,
      label: `${item.label} ${list.counts?.[item.id as keyof typeof list.counts] ?? 0}`,
    })),
  ];

  return (
    <div>
      <div className={css.pageHead}>
        <div>
          <Eyebrow>계약 관리</Eyebrow>
          <h1 className={css.pageTitle}>표준양식 관리</h1>
        </div>
        <div className={css.headActions}>
          <label className={css.uploadLabel}>
            <input type="file" accept=".docx" hidden onChange={handleFileSelected} disabled={isUploading} />
            <Button variant="outline" color="secondary" iconLeft={<Icon name="uploadCloud" size="sm" />} disabled={isUploading} asChild>
              <span>{isUploading ? "읽는 중…" : "워드 파일 올려서 만들기"}</span>
            </Button>
          </label>
          <Button iconLeft={<Icon name="plus" size="sm" />} onClick={() => setIsCreateOpen(true)}>
            빈 문서로 만들기
          </Button>
        </div>
      </div>

      <div className={css.filters}>
        <Input
          inputSize="medium"
          placeholder="양식 이름으로 찾기"
          value={list.keyword}
          onChange={(e) => list.setKeyword(e.target.value)}
          leftIcon={<Icon name="search" size="sm" />}
        />
      </div>

      <Panel flush>
        <ButtonGroup variant="segmented" items={tabs} value={list.categoryId} onChange={(next) => list.setCategoryId(next as never)} />
        {list.isLoading && <p className={css.status}>불러오는 중…</p>}
        {list.isError && <p className={css.status}>목록을 불러오지 못했습니다.</p>}
        {!list.isLoading && !list.isError && list.items.length === 0 && (
          <EmptyState
            icon={<Icon name="fileText" size="lg" />}
            title="이 분류에는 아직 양식이 없어요"
            description="빈 문서로 새로 쓰거나, 쓰던 워드 파일을 올려 표준 양식으로 만들 수 있어요."
            action={
              <Button iconLeft={<Icon name="plus" size="sm" />} onClick={() => setIsCreateOpen(true)}>
                빈 문서로 만들기
              </Button>
            }
          />
        )}
        {!list.isLoading && !list.isError && list.items.length > 0 && (
          <DataTable data={list.items} columns={TEMPLATE_COLUMNS} getRowId={(item) => item.id} />
        )}
      </Panel>

      {isCreateOpen && (
        <CreateTemplateModal
          initialHtml={uploadedHtml}
          onClose={() => {
            setIsCreateOpen(false);
            setUploadedHtml(undefined);
          }}
        />
      )}
    </div>
  );
};
```

(참고: `Button asChild` prop이 `@lawkit/ui`에 없으면 — `node_modules/@lawkit/ui/CLAUDE.md`에서 `Button`의 실제 API를 확인하고, `<label>`로 감싸는 대신 숨긴 `<input type="file">`에 대한 `ref`+`Button onClick={() => ref.current?.click()}` 패턴으로 바꾼다. 시안 `documentToolbar/InsertGroup.tsx`가 이미지 업로드에 쓴 `lds-exempt: 숨은 네이티브 파일 입력 — LDS FileUpload는 별도 업로드 흐름이라 즉시 트리거용 숨김 input에 맞지 않음` 패턴을 그대로 따른다.)

- [ ] **Step 5: 스타일**

`apps/web/src/pages/documentTemplates/documentTemplates.css.ts` (신규 파일 — `themeVars` 토큰만 사용, 시안 `documentEditorMock.css.ts`의 `filters`/`search`/`pager` 대응 규칙을 참고해 새로 작성):

```ts
import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const pageHead = style({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 });
export const pageTitle = style({ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: c.textHeading });
export const headActions = style({ display: "flex", gap: 8 });
export const uploadLabel = style({ display: "inline-flex" });
export const filters = style({ marginBottom: 12, maxWidth: 340 });
export const status = style({ padding: "24px 0", textAlign: "center", color: c.textMuted, fontSize: 13 });
```

- [ ] **Step 6: 테스트**

`apps/web/src/pages/documentTemplates/TemplateListPage.test.tsx` (신규 파일 — `apps/web/src/pages/contract/ContractListPage.test.tsx`의 렌더 설정(QueryClientProvider+MemoryRouter 래퍼)을 그대로 복사해 API를 목으로 대체):

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { TemplateListPage } from "./TemplateListPage";
import * as api from "../../api/documentTemplates";

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TemplateListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("TemplateListPage", () => {
  it("목록을 불러와 표에 보여준다", async () => {
    vi.spyOn(api, "listTemplates").mockResolvedValue({
      items: [
        {
          id: "t1",
          categoryId: "nda",
          name: "비밀유지계약서 표준",
          currentVersionNo: 1,
          createdById: "u1",
          createdByName: "김서연",
          createdAt: "2026-09-20T00:00:00.000Z",
          updatedAt: "2026-09-20T00:00:00.000Z",
        },
      ],
      counts: { nda: 1, service: 0, supply: 0, entrust: 0, license: 0, etc: 0 },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("비밀유지계약서 표준")).toBeInTheDocument());
  });

  it("양식이 없으면 빈 상태를 보여준다", async () => {
    vi.spyOn(api, "listTemplates").mockResolvedValue({
      items: [],
      counts: { nda: 0, service: 0, supply: 0, entrust: 0, license: 0, etc: 0 },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("이 분류에는 아직 양식이 없어요")).toBeInTheDocument());
  });
});
```

- [ ] **Step 7: 테스트·타입체크·린트**

Run:
```bash
pnpm --filter @lawai/web test TemplateListPage.test.tsx
pnpm --filter @lawai/web exec tsc --noEmit
pnpm --filter @lawai/web exec eslint src/pages/documentTemplates
```
Expected: 전부 PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/documentTemplates
git commit -m "feat: 실제 표준양식 관리 목록 화면 추가"
```

---

## Task 11: apps/web — 실제 문서 편집기 화면 (저장·버전 이력·되돌리기·AI 3종)

이 태스크는 가장 크다 — 먼저 **읽어야 할 기존 파일 5개**: `apps/web/src/components/ui/useRichTextEditor.ts`(확장 목록), `apps/web/src/pages/mockups/documentEditor/DocumentEditorMock.tsx`(레이아웃), `LoaiPanel.tsx`·`LoaiDraftTab.tsx`(이번 세션에 이미 실제 콜백 prop 구조로 되어 있음 — 그대로 옮긴다), `VersionHistoryModal.tsx`·`SelectionBubble.tsx`(전체를 읽고 아래 Step 3에서 요구하는 새 prop 모양대로 바꾼다).

**Files:**
- Modify: `apps/web/src/components/ui/useRichTextEditor.ts` (확장 목록을 상수로 분리해 export)
- Create: `apps/web/src/components/documentEditor/tiptapContent.ts` (HTML⇄JSON 변환 헬퍼)
- Create: `apps/web/src/components/documentEditor/LoaiPanel.tsx` (시안에서 옮김, 그대로)
- Create: `apps/web/src/components/documentEditor/LoaiDraftTab.tsx` (시안에서 옮기되 `onCreated`가 실제 AI 호출을 감싸도록 부모가 넘기는 형태로 단순화)
- Create: `apps/web/src/components/documentEditor/LoaiRewriteTab.tsx` (시안에서 옮김, `onRewrite`를 실제 AI 호출로 바꿀 수 있게 콜백화)
- Create: `apps/web/src/components/documentEditor/LoaiReviewTab.tsx` (시안에서 옮김, `findings`를 prop으로 받게 바꿈)
- Create: `apps/web/src/components/documentEditor/VersionHistoryModal.tsx` (시안에서 옮기되 `versions`/`onRevert`를 prop으로 받게 바꿈)
- Create: `apps/web/src/components/documentEditor/SelectionBubble.tsx` (시안에서 그대로 옮김)
- Modify: `apps/web/src/pages/mockups/documentEditor/DocumentEditorMock.tsx`와 `LoaiPanel.tsx`/`LoaiDraftTab.tsx`/`LoaiRewriteTab.tsx`/`LoaiReviewTab.tsx`/`VersionHistoryModal.tsx`/`SelectionBubble.tsx` — 새 공용 컴포넌트를 `import`하도록 바꾸고 자기 파일에 있던 JSX는 지운다(목 데이터는 mock 쪽에 그대로 두고 새 prop으로 넘긴다).
- Create: `apps/web/src/pages/documentTemplates/DocumentEditorPage.tsx`
- Create: `apps/web/src/pages/documentTemplates/hooks/useDocumentEditor.ts`
- Test: `apps/web/src/pages/documentTemplates/hooks/useDocumentEditor.test.ts`

**Interfaces:**
- Consumes: `getTemplate`/`createTemplateVersion`/`listTemplateVersions`/`revertTemplateVersion`(Task 9), `requestAiDraft`/`requestAiRewrite`/`requestAiReview`(Task 9), `RichTextEditor`(이미 존재), `AiReviewFinding`(Task 2).
- Produces: `htmlToTiptapJson(html: string): Record<string, unknown>`, `tiptapJsonToHtml(json: Record<string, unknown>): string`(둘 다 `tiptapContent.ts`) — Task 12(계약 작성 저장 흐름)도 그대로 쓴다. `DocumentEditorPage`가 `/document-templates/:id` 라우트에 렌더(Task 12가 등록).

- [ ] **Step 1: 에디터 확장 목록을 재사용 가능하게 분리**

`apps/web/src/components/ui/useRichTextEditor.ts`를 읽고, 그 안에서 Tiptap `Editor`에 넘기는 `extensions` 배열(StarterKit·TextAlign·Highlight·TextStyle+Color·Placeholder·Mention·Table·FontFamily/FontSize·Superscript/Subscript·Image·lineHeightExtension·pageBreakNode 등 지금 조립된 전체 목록, `extraExtensions` 옵션으로 들어오는 것 제외한 "항상 켜진" 기본 확장들)을 그대로 뽑아 파일 위쪽에 `export const BASE_EDITOR_EXTENSIONS = [...]`로 선언하고, 기존 `useEditor`/`useRichTextEditor` 안에서는 `[...BASE_EDITOR_EXTENSIONS, ...(extraExtensions ?? [])]`처럼 이 상수를 참조하도록 바꾼다(동작은 완전히 그대로 — 순수 리팩터링, 새 테스트 불필요. 기존 `RichTextEditor.test.tsx`가 그대로 통과하면 됨).

- [ ] **Step 2: HTML ⇄ Tiptap JSON 변환 헬퍼**

`apps/web/src/components/documentEditor/tiptapContent.ts` (신규 파일, 전체):

```ts
import { generateHTML, generateJSON } from "@tiptap/core";
import { BASE_EDITOR_EXTENSIONS } from "../ui/useRichTextEditor";

/** 편집기 HTML(RichTextEditor의 value/onChange) → 저장용 Tiptap JSON(정본). */
export const htmlToTiptapJson = (html: string): Record<string, unknown> =>
  generateJSON(html || "<p></p>", BASE_EDITOR_EXTENSIONS) as Record<string, unknown>;

/** 저장된 Tiptap JSON → 편집기에 채울 HTML. */
export const tiptapJsonToHtml = (json: Record<string, unknown>): string => generateHTML(json, BASE_EDITOR_EXTENSIONS);
```

- [ ] **Step 3: 시안 컴포넌트를 공용 폴더로 옮기고 매개변수화**

`apps/web/src/components/documentEditor/` 폴더를 만들고 아래 6개 파일을 시안 폴더(`apps/web/src/pages/mockups/documentEditor/`)에서 옮긴다. 각 파일의 **정확한 변경점**만 적는다(그 외 JSX·스타일 import는 그대로 유지):

- **`LoaiPanel.tsx`**: 이미 `onDraftCreated`/`hasDocumentContent` 등 콜백 prop 구조라 그대로 옮긴다. `LoaiRewriteTab`/`LoaiReviewTab`에 넘기는 props만 아래 두 파일의 새 인터페이스에 맞춘다: `<LoaiRewriteTab selectedText={selectedText} onRewrite={onRewrite} />`, `<LoaiReviewTab onReview={onReview} findings={reviewFindings} isReviewing={isReviewing} />`(새 prop 4개 추가 — `LoaiPanelProps`에도 `onRewrite`/`onReview`/`reviewFindings`/`isReviewing` 추가).
- **`LoaiDraftTab.tsx`**: `buildMockDraft(request)` 호출을 지우고 `onCreated`가 이미 "생성된 HTML을 받는 콜백"이므로, `handleCreate`가 `onCreated`를 직접 부르는 대신 새 prop `onGenerate: (request: string) => Promise<string>`를 호출해 그 결과를 `onCreated`에 넘기도록 바꾼다(즉 `LoaiDraftTabProps`에 `onGenerate` 추가, `createDraft` 안 `onCreated(buildMockDraft(request))`를 `onCreated(await onGenerate(request))`로 교체하고 `createDraft`를 `async`로).
- **`LoaiRewriteTab.tsx`**: 파일을 읽어 지금 "다듬기 결과"를 어떻게 만드는지 확인하고, 그 자리를 새 prop `onRewrite: (instruction: string) => Promise<string>` 호출로 바꾼다(지시문 선택 UI는 그대로 두고, 결과 문자열을 로컬 state에 저장해 "이 문장으로 바꾸기" 버튼이 여전히 동작하게 한다).
- **`LoaiReviewTab.tsx`**: 파일을 읽어 `MOCK_REVIEW_FINDINGS`를 쓰는 자리를 새 prop `findings: AiReviewFinding[]`로 바꾸고, 최초 진입 시 자동 검토를 시작하는 자리가 있다면 새 prop `onReview: () => void`(패널이 열릴 때 `LoaiPanel`이 한 번 호출)로 바꾼다. `isReviewing?: boolean` prop으로 로딩 상태를 보여준다.
- **`VersionHistoryModal.tsx`**: 파일을 읽어 `MOCK_VERSIONS`를 쓰는 자리를 새 prop `versions: TemplateVersionDto[]`로, "되돌리기" 버튼 동작을 새 prop `onRevert: (versionNo: number) => void`로 바꾼다.
- **`SelectionBubble.tsx`**: prop 변경 없음 — 그대로 옮긴다.

옮긴 뒤 시안 쪽(`apps/web/src/pages/mockups/documentEditor/`)의 이 6개 파일은 새 공용 컴포넌트를 `import`하는 얇은 어댑터로 바꾼다 — 예를 들어 시안의 `LoaiDraftTab.tsx`는:

```tsx
import { LoaiDraftTab as SharedLoaiDraftTab } from "../../../components/documentEditor/LoaiDraftTab";
import { buildMockDraft, MOCK_DRAFT_PRESETS } from "./documentEditorMockData";

interface LoaiDraftTabProps {
  onCreated: (html: string) => void;
  hasExistingContent: boolean;
}

export const LoaiDraftTab = (props: LoaiDraftTabProps) => (
  <SharedLoaiDraftTab
    {...props}
    presets={MOCK_DRAFT_PRESETS}
    onGenerate={(request) => new Promise((resolve) => setTimeout(() => resolve(buildMockDraft(request)), 700))}
  />
);
```
(`LoaiRewriteTab`/`LoaiReviewTab`/`VersionHistoryModal`도 같은 방식 — 시안 쪽 파일은 목 데이터를 새 prop으로 감싸 전달하는 얇은 래퍼가 되고, `DocumentEditorMock.tsx`는 지금처럼 이 시안용 컴포넌트를 그대로 쓰므로 수정이 필요 없다.)

- [ ] **Step 4: 문서 편집기 데이터/저장 훅**

`apps/web/src/pages/documentTemplates/hooks/useDocumentEditor.ts` (신규 파일, 전체):

```ts
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTemplate, createTemplateVersion, listTemplateVersions, revertTemplateVersion } from "../../../api/documentTemplates";
import { requestAiDraft, requestAiRewrite, requestAiReview } from "../../../api/documents";
import { htmlToTiptapJson, tiptapJsonToHtml } from "../../../components/documentEditor/tiptapContent";
import type { AiReviewFinding } from "@lawai/contracts";

/** 표준양식 편집기 — 템플릿 조회·저장(새 버전)·버전 이력·되돌리기·AI 3종을 한 훅으로 묶는다. */
export const useDocumentEditor = (templateId: string, initialHtml?: string) => {
  const queryClient = useQueryClient();
  const [content, setContent] = useState<string | null>(initialHtml ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [reviewFindings, setReviewFindings] = useState<AiReviewFinding[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);

  const templateQuery = useQuery({
    queryKey: ["documentTemplate", templateId],
    queryFn: () => getTemplate(templateId),
  });

  // 서버에서 막 받아온 최신 버전을 로컬 content(HTML)로 한 번만 반영한다(그 뒤로는 편집기가 정본).
  const template = templateQuery.data;
  if (template && content === null) {
    setContent(tiptapJsonToHtml(template.currentVersion.content));
  }

  const versionsQuery = useQuery({
    queryKey: ["documentTemplateVersions", templateId],
    queryFn: () => listTemplateVersions(templateId),
    enabled: isVersionOpen,
  });

  const save = async (): Promise<void> => {
    if (content === null) return;
    setIsSaving(true);
    try {
      await createTemplateVersion(templateId, { content: htmlToTiptapJson(content), clauseCount: null });
      await queryClient.invalidateQueries({ queryKey: ["documentTemplate", templateId] });
      await queryClient.invalidateQueries({ queryKey: ["documentTemplateVersions", templateId] });
    } finally {
      setIsSaving(false);
    }
  };

  const revert = async (versionNo: number): Promise<void> => {
    await revertTemplateVersion(templateId, versionNo);
    await queryClient.invalidateQueries({ queryKey: ["documentTemplate", templateId] });
    await queryClient.invalidateQueries({ queryKey: ["documentTemplateVersions", templateId] });
    setContent(null); // 다음 렌더에서 최신 버전으로 다시 채운다
    setIsVersionOpen(false);
  };

  const generateDraft = async (request: string): Promise<string> => {
    const res = await requestAiDraft(request);
    if (res.needsSetup) throw new Error("AI 연동을 먼저 설정해 주세요(시스템 관리 화면).");
    return res.html;
  };

  const rewriteSelection = async (selectedText: string, instruction: string): Promise<string> => {
    const res = await requestAiRewrite(selectedText, instruction);
    if (res.needsSetup) throw new Error("AI 연동을 먼저 설정해 주세요(시스템 관리 화면).");
    return res.rewrittenText;
  };

  const runReview = async (): Promise<void> => {
    if (content === null) return;
    setIsReviewing(true);
    try {
      const res = await requestAiReview(content);
      setReviewFindings(res.findings);
    } finally {
      setIsReviewing(false);
    }
  };

  return {
    template,
    isLoading: templateQuery.isLoading,
    isError: templateQuery.isError,
    content: content ?? "",
    setContent,
    save,
    isSaving,
    versions: versionsQuery.data?.versions ?? [],
    isVersionOpen,
    openVersions: () => setIsVersionOpen(true),
    closeVersions: () => setIsVersionOpen(false),
    revert,
    generateDraft,
    rewriteSelection,
    runReview,
    reviewFindings,
    isReviewing,
  };
};
```

- [ ] **Step 5: 실제 편집기 페이지**

`apps/web/src/pages/documentTemplates/DocumentEditorPage.tsx` (신규 파일 — `DocumentEditorMock.tsx`와 같은 레이아웃, 데이터만 실제):

```tsx
import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Button, Icon } from "@lawkit/ui";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { LoaiPanel, type LoaiModeTypes } from "../../components/documentEditor/LoaiPanel";
import { SelectionBubble } from "../../components/documentEditor/SelectionBubble";
import { VersionHistoryModal } from "../../components/documentEditor/VersionHistoryModal";
import { useDocumentEditor } from "./hooks/useDocumentEditor";
import * as css from "../mockups/documentEditor/documentEditorMock.css";

const countPages = (html: string): number => (html.match(/data-page-break/g)?.length ?? 0) + 1;

export const DocumentEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const initialHtml = (location.state as { initialHtml?: string } | null)?.initialHtml;
  const editor = useDocumentEditor(id as string, initialHtml);

  const [loaiMode, setLoaiMode] = useState<LoaiModeTypes | null>(null);
  const [selectedText, setSelectedText] = useState("");

  if (editor.isLoading) return <p>불러오는 중…</p>;
  if (editor.isError || !editor.template) return <p>양식을 불러오지 못했습니다.</p>;

  const handleToggleLoai = () => setLoaiMode(loaiMode === null ? "draft" : null);
  const handleRewrite = (text: string) => {
    setSelectedText(text);
    setLoaiMode("rewrite");
  };

  return (
    <div>
      <div className={css.editorHead}>
        <div className={css.editorTitleGroup}>
          <Eyebrow>계약 관리 · 표준양식 관리</Eyebrow>
          <div className={css.editorTitleRow}>
            <h1 className={css.editorTitle}>{editor.template.name}</h1>
            <span className={css.verChip}>v{editor.template.currentVersionNo}</span>
          </div>
        </div>
        <div className={css.editorActions}>
          <Button variant="outline" color="secondary" iconLeft={<Icon name="history" size="sm" />} onClick={editor.openVersions}>
            버전 이력
          </Button>
          <Button iconLeft={<Icon name="save" size="sm" />} disabled={editor.isSaving} onClick={() => void editor.save()}>
            {editor.isSaving ? "저장 중…" : "저장하기"}
          </Button>
        </div>
      </div>

      <div className={loaiMode === null ? css.editorLayout.solo : css.editorLayout.withPanel}>
        <RichTextEditor
          ariaLabel="표준양식 문서 편집기"
          value={editor.content}
          onChange={editor.setContent}
          withTable
          withFullToolbar
          onLoaiClick={handleToggleLoai}
          isLoaiOpen={loaiMode !== null}
          wrapClassName={css.docShell}
          areaClassName={css.docPage}
          footerExtra={<span className={css.docFoot}>총 {countPages(editor.content)}페이지</span>}
          renderOverlay={(tiptapEditor) => {
            const { from, to, empty } = tiptapEditor.state.selection;
            if (empty) return null;
            return <SelectionBubble onRewrite={() => handleRewrite(tiptapEditor.state.doc.textBetween(from, to, " "))} />;
          }}
        />

        {loaiMode !== null && (
          <LoaiPanel
            mode={loaiMode}
            onModeChange={setLoaiMode}
            onClose={() => setLoaiMode(null)}
            selectedText={selectedText}
            onDraftCreated={(html) => {
              editor.setContent(html);
              setLoaiMode(null);
            }}
            hasDocumentContent={editor.content.replace(/<[^>]*>/g, "").trim() !== ""}
            onGenerate={editor.generateDraft}
            onRewrite={(instruction) => editor.rewriteSelection(selectedText, instruction)}
            onReview={editor.runReview}
            reviewFindings={editor.reviewFindings}
            isReviewing={editor.isReviewing}
          />
        )}
      </div>

      {editor.isVersionOpen && (
        <VersionHistoryModal versions={editor.versions} onRevert={(versionNo) => void editor.revert(versionNo)} onClose={editor.closeVersions} />
      )}
    </div>
  );
};
```

(주의: `LoaiPanel`에 `onGenerate`를 새로 전달해야 하므로 Step 3에서 `LoaiPanelProps`에 `onGenerate: (request: string) => Promise<string>`도 추가하고 `LoaiDraftTab`에 그대로 넘겨야 한다 — Step 3의 `LoaiDraftTab.tsx` 변경점과 짝을 맞춘다.)

- [ ] **Step 6: 훅 테스트**

`apps/web/src/pages/documentTemplates/hooks/useDocumentEditor.test.ts` (신규 파일 — `renderHook`으로 `save`가 `createTemplateVersion`을 올바른 인자로 부르는지, `revert`가 버전 목록을 무효화하는지 확인. 기존 `apps/web/src/pages/contract/hooks/useCompanySearch.test.ts`의 `renderHook`+`QueryClientProvider` 래퍼 설정을 그대로 따른다):

```ts
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { vi } from "vitest";
import { useDocumentEditor } from "./useDocumentEditor";
import * as templatesApi from "../../../api/documentTemplates";

const wrapper = ({ children }: PropsWithChildren) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useDocumentEditor", () => {
  it("save는 현재 HTML을 Tiptap JSON으로 바꿔 createTemplateVersion을 부른다", async () => {
    vi.spyOn(templatesApi, "getTemplate").mockResolvedValue({
      id: "t1",
      categoryId: "nda",
      name: "테스트",
      currentVersionNo: 1,
      createdById: "u1",
      createdByName: "김서연",
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
      currentVersion: { versionNo: 1, content: { type: "doc", content: [{ type: "paragraph" }] }, clauseCount: null, createdById: "u1", createdByName: "김서연", createdAt: "2026-09-20T00:00:00.000Z" },
    });
    const createSpy = vi.spyOn(templatesApi, "createTemplateVersion").mockResolvedValue({} as never);

    const { result } = renderHook(() => useDocumentEditor("t1"), { wrapper });
    await waitFor(() => expect(result.current.content).not.toBe(""));

    await act(async () => {
      result.current.setContent("<p>고친 내용</p>");
    });
    await act(async () => {
      await result.current.save();
    });

    expect(createSpy).toHaveBeenCalledWith("t1", expect.objectContaining({ clauseCount: null }));
  });
});
```

- [ ] **Step 7: 테스트·타입체크·린트**

Run:
```bash
pnpm --filter @lawai/web test useDocumentEditor.test.ts RichTextEditor.test.tsx
pnpm --filter @lawai/web exec tsc --noEmit
pnpm --filter @lawai/web exec eslint src/components/documentEditor src/pages/documentTemplates src/pages/mockups/documentEditor
```
Expected: 전부 PASS — 특히 `RichTextEditor.test.tsx`가 Step 1의 리팩터링 뒤에도 그대로 통과해야 한다(스냅샷/버튼 개수 불변).

- [ ] **Step 8: 브라우저로 직접 확인**

개발 서버를 띄우고 `/document-templates`에서 "빈 문서로 만들기" → 이름 입력 → 편집기 진입 → 로아이 "새로 쓰기"로 실제(또는 AI 키 미설정이면 `needsSetup` 안내) 응답을 받는지, "저장하기" 후 새로고침해도 내용이 남는지, "버전 이력"에 방금 저장한 버전이 보이는지 확인한다.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/documentEditor apps/web/src/components/ui/useRichTextEditor.ts apps/web/src/pages/documentTemplates apps/web/src/pages/mockups/documentEditor
git commit -m "feat: 실제 문서 편집기 화면(저장·버전 이력·되돌리기·AI 3종) 추가"
```

---

## Task 12: apps/web — `StandardFormsModal` 실제 연결 + 계약 작성 docx 첨부 + 라우트 등록

**Files:**
- Modify: `apps/web/src/api/standardForms.ts` (가짜 `FORMS`/`StandardForm`/`searchStandardForms`/`countByFormCategory` 제거, `STANDARD_FORM_CATEGORIES`만 유지)
- Modify: `apps/web/src/pages/contract/hooks/useStandardFormsBrowser.ts` (`listTemplates` 사용)
- Modify: `apps/web/src/pages/contract/sections/StandardFormsModal.tsx` (다운로드 버튼 2곳 제거, footer 버튼을 "이 양식으로 작성 시작"으로, `onAttach`→`onStart`)
- Create: `apps/web/src/pages/contract/sections/StandardFormEditorModal.tsx` (템플릿 최신 버전으로 편집기를 열고, 완료 시 진짜 .docx를 만들어 `contractFiles`에 넣는다)
- Modify: `apps/web/src/pages/contract/sections/DocsSection.tsx` (`handleAttachForm` 제거, 새 모달 연결, 표준계약서 체결일 때만 버튼 노출)
- Modify: `apps/web/src/routes.tsx` (`/document-templates`, `/document-templates/:id` 등록)
- Test: `apps/web/src/pages/contract/sections/StandardFormsModal.test.tsx` (기존 파일 갱신)

**Interfaces:**
- Consumes: `listTemplates`/`getTemplate`(Task 9), `exportDocument`/`base64ToDocxFile`(Task 9), `htmlToTiptapJson`/`tiptapJsonToHtml`(Task 11), `TemplateSummaryDto`·`TemplateDetailDto`(Task 2), `TemplateListPage`·`DocumentEditorPage`(Task 10·11).

- [ ] **Step 1: `api/standardForms.ts`에서 가짜 데이터 제거**

`apps/web/src/api/standardForms.ts`를 읽고 `StandardFormCategory`/`STANDARD_FORM_CATEGORIES`(분류 6종, 실제 스펙과 일치하므로 그대로 유지)만 남기고 `StandardForm` 인터페이스·`FORMS`·`SEARCH_DELAY_MS`·`countByFormCategory`·`StandardFormQuery`·`searchStandardForms`를 전부 삭제한다.

- [ ] **Step 2: 조회 훅을 실제 API로 교체**

`apps/web/src/pages/contract/hooks/useStandardFormsBrowser.ts`를 아래 전체로 교체:

```ts
import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listTemplates } from "../../../api/documentTemplates";
import { STANDARD_FORM_CATEGORIES } from "../../../api/standardForms";
import type { TemplateSummaryDto } from "@lawai/contracts";

const DEBOUNCE_MS = 250;
const STALE_MS = 5 * 60 * 1000;

/** 표준계약서 양식 보기 모달 로직 — 실제 표준양식 템플릿 API. */
export const useStandardFormsBrowser = () => {
  const [categoryId, setCategoryId] = useState(STANDARD_FORM_CATEGORIES[0]?.id ?? "");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKeyword(text.trim()), DEBOUNCE_MS);
  };

  const { data, isFetching } = useQuery({
    queryKey: ["standardForms", categoryId, keyword],
    queryFn: () => listTemplates({ categoryId: categoryId as never, q: keyword || undefined }),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

  const results = data?.items ?? [];
  const selected: TemplateSummaryDto | undefined = results.find((f) => f.id === selectedId) ?? results[0];

  return {
    results,
    isFetching,
    counts: data?.counts,
    categoryId,
    selected,
    search,
    setCategoryId,
    selectForm: setSelectedId,
  };
};
```

- [ ] **Step 3: `StandardFormsModal.tsx` 갱신**

`apps/web/src/pages/contract/sections/StandardFormsModal.tsx`를 읽고 아래대로 고친다:
- import: `StandardForm`을 `@lawai/contracts`의 `TemplateSummaryDto`로 교체.
- `interface StandardFormsModalProps`: `onAttach: (form: StandardForm) => void` → `onStart: (template: TemplateSummaryDto) => void`.
- footer의 `<Button ... onClick={() => selected && onAttach(selected)}>이 양식으로 첨부</Button>` → `onClick={() => selected && onStart(selected)}` 라벨 `"이 양식으로 작성 시작"`, footer 안내문의 `selected.version`도 `` `v${selected.currentVersionNo}` ``로 교체.
- 목록 행(`ListGroupItem`)의 trailing에 있는 다운로드 `<Button ... iconLeft={<Icon name="download" .../>} onClick={stopBubble} />`를 삭제(체크마크만 남긴다).
- `form.version`/`form.desc`/`form.revisedAt`/`form.clauses` 등 `StandardForm` 전용 필드 참조를 전부 `TemplateSummaryDto` 필드로 교체: `version`→`` `v${form.currentVersionNo}` ``, `desc`→삭제(칸 자체를 지우거나 `${form.createdByName ?? "—"} 작성`으로 대체), `revisedAt`→`form.updatedAt.slice(0,10)`, `clauses`→삭제.
- 오른쪽 미리보기 칸의 `<Button ... iconLeft={<Icon name="download" .../>}>다운로드</Button>`를 삭제(kv 목록의 "형식" 줄도 "DOCX · 편집 가능" 그대로 두거나 삭제 — 다운로드 기능 자체가 없어지므로 자연스러운 쪽으로 정리).

- [ ] **Step 4: 계약 작성용 편집기 모달**

`apps/web/src/pages/contract/sections/StandardFormEditorModal.tsx` (신규 파일, 전체 — 템플릿의 최신 버전을 열어 고친 뒤 진짜 .docx로 만들어 콜백에 넘긴다):

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, Button } from "@lawkit/ui";
import { getTemplate } from "../../../api/documentTemplates";
import { exportDocument, base64ToDocxFile } from "../../../api/documents";
import { htmlToTiptapJson, tiptapJsonToHtml } from "../../../components/documentEditor/tiptapContent";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";

interface StandardFormEditorModalProps {
  templateId: string;
  templateName: string;
  onClose: () => void;
  onComplete: (file: File) => void;
}

/** 표준계약서 체결 — 고른 양식의 최신 버전으로 편집기를 열고, 완료하면 진짜 .docx를 만들어 넘긴다. */
export const StandardFormEditorModal = ({ templateId, templateName, onClose, onComplete }: StandardFormEditorModalProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const query = useQuery({ queryKey: ["documentTemplate", templateId], queryFn: () => getTemplate(templateId) });
  if (query.data && content === null) setContent(tiptapJsonToHtml(query.data.currentVersion.content));

  const handleComplete = async () => {
    if (content === null) return;
    setIsFinishing(true);
    try {
      const res = await exportDocument(htmlToTiptapJson(content), templateName);
      onComplete(base64ToDocxFile(res));
      onClose();
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xlarge"
      title={`${templateName} — 계약서 작성`}
      footer={
        <>
          <Button variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button disabled={content === null || isFinishing} onClick={() => void handleComplete()}>
            {isFinishing ? "만드는 중…" : "이 내용으로 계약서 첨부"}
          </Button>
        </>
      }
    >
      {query.isLoading && <p>불러오는 중…</p>}
      {content !== null && <RichTextEditor ariaLabel="계약서 작성" value={content} onChange={setContent} withTable withFullToolbar />}
    </Modal>
  );
};
```

- [ ] **Step 5: `DocsSection.tsx` 연결**

`apps/web/src/pages/contract/sections/DocsSection.tsx`를 읽고:
- `import type { StandardForm } from "../../../api/standardForms";`를 지우고 `import type { TemplateSummaryDto } from "@lawai/contracts";`, `import { StandardFormEditorModal } from "./StandardFormEditorModal";` 추가.
- `const [isFormsOpen, setIsFormsOpen] = useState(false);` 다음 줄에 `const [startingTemplate, setStartingTemplate] = useState<TemplateSummaryDto | null>(null);` 추가.
- `handleAttachForm`(메타데이터만 넣던 함수)을 지우고 아래로 교체:

```ts
  const handleStartFromTemplate = (template: TemplateSummaryDto) => {
    setStartingTemplate(template);
    setIsFormsOpen(false);
  };

  const handleTemplateEditorComplete = (file: File) => {
    setValue(
      "contractFiles",
      [...getValues("contractFiles"), { id: null, name: file.name, meta: "표준양식 · DOCX", mimeType: file.type, blob: file }],
      { shouldValidate: true },
    );
  };
```

- `<StandardFormsModal onClose={() => setIsFormsOpen(false)} onAttach={handleAttachForm} />` → `<StandardFormsModal onClose={() => setIsFormsOpen(false)} onStart={handleStartFromTemplate} />`로 교체, 그 아래에 조건부로 추가:

```tsx
        {startingTemplate && (
          <StandardFormEditorModal
            templateId={startingTemplate.id}
            templateName={startingTemplate.name}
            onClose={() => setStartingTemplate(null)}
            onComplete={handleTemplateEditorComplete}
          />
        )}
```

- **"표준계약서 양식 보기" 버튼은 표준계약서 체결일 때만 보여야 한다.** `apps/web/src/pages/contract/request-schema.ts`와 `ContractRequestForm` 타입을 읽어 계약 등록 유형을 나타내는 실제 필드명(예: `reviewType`, 값 `"std"` — `Prisma.ReviewType` enum과 이름이 같을 가능성이 높다)을 확인하고, `useFormContext<ContractRequestForm>()`의 `watch(...)`로 그 값을 읽어 `"표준계약서 양식 보기"` 버튼을 그 조건이 참일 때만 렌더한다(다른 계약 유형은 지금처럼 파일 첨부만 — 버튼 자체를 숨긴다).

- [ ] **Step 6: 라우트 등록**

`apps/web/src/routes.tsx`의 `<RequireAuth><AppShell /></RequireAuth>` 블록 안, `/contract/expiring` 다음 줄에 추가(+ import 두 줄):

```tsx
import { TemplateListPage } from "./pages/documentTemplates/TemplateListPage";
import { DocumentEditorPage } from "./pages/documentTemplates/DocumentEditorPage";
```
```tsx
        <Route path="/document-templates" element={<TemplateListPage />} />
        <Route path="/document-templates/:id" element={<DocumentEditorPage />} />
```

- [ ] **Step 7: 기존 모달 테스트 갱신**

`apps/web/src/pages/contract/sections/StandardFormsModal.test.tsx`를 열어 `searchStandardForms`/`FORMS`를 목킹하던 부분을 `listTemplates`(Task 9 `api/documentTemplates.ts`) 목킹으로 바꾸고, `onAttach` prop을 넘기던 자리를 `onStart`로, 클릭 기대 라벨을 `"이 양식으로 작성 시작"`으로 바꾼다.

- [ ] **Step 8: 테스트·타입체크·린트·빌드**

Run:
```bash
pnpm --filter @lawai/web test StandardFormsModal.test.tsx DocsSection.test.tsx
pnpm --filter @lawai/web exec tsc --noEmit
pnpm --filter @lawai/web exec eslint src/pages/contract/sections/StandardFormsModal.tsx src/pages/contract/sections/StandardFormEditorModal.tsx src/pages/contract/sections/DocsSection.tsx src/pages/contract/hooks/useStandardFormsBrowser.ts src/api/standardForms.ts src/routes.tsx
pnpm turbo run lint test build --continue
```
Expected: 전부 PASS.

- [ ] **Step 9: 브라우저로 전체 흐름 확인**

개발 서버에서: (1) 표준양식 관리에서 새 NDA 템플릿을 하나 만들고 저장 → (2) 계약서 검토 요청에서 표준계약서 체결로 등록 유형을 고르고 "표준계약서 양식 보기" → 방금 만든 템플릿 선택 → "이 양식으로 작성 시작" → 편집기가 그 내용으로 열리는지 → "이 내용으로 계약서 첨부" → 계약서 칸에 `.docx` 파일이 실제로 들어갔는지(파일 크기 > 0) → 계약 제출까지 확인한다.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/api/standardForms.ts apps/web/src/pages/contract apps/web/src/routes.tsx
git commit -m "feat: 표준계약서 양식 보기를 실제 템플릿 API로 연결하고 진짜 docx로 첨부"
```

---

## 자체 점검 (writing-plans 셀프 리뷰)

**스펙 커버리지:** 데이터 모델(Task 1) · 컴포넌트 구성 3가지(에디터 재사용=§0-1, 표준양식 관리 메뉴=Task 9·10, 계약 작성 연결=Task 12) · 저장 흐름 4단계(템플릿 저장=Task 11, docx 변환=Task 3·5, 계약 첨부=Task 12) · DOCX 업로드 들여오기(Task 5·10) · AI 3종(Task 6·9·11) · 권한(Task 4·9) · 테스트 계획 4개 영역(패키지 없음=해당 없음, user-service=Task 1·4·5·6, apps/web=Task 9·10·11·12, AI 3종=Task 6·11) · 이번에 안 하는 것(실시간 동시편집·카테고리 자유 추가·비표준 계약 에디터 시작·체결 후 재수정)은 어느 태스크에서도 만들지 않음 — 전부 반영됨.

**플레이스홀더 스캔:** 전 태스크 코드 블록에 TBD/TODO 없음. Task 9 Step 0(`apiFetch` 시그니처 확인)과 Task 11 Step 3(시안 컴포넌트 6개 중 `LoaiRewriteTab`/`LoaiReviewTab`/`VersionHistoryModal`은 "파일을 읽고 지정된 대로 바꾼다")은 TODO가 아니라 — 실제 파일을 읽어야만 정확한 기존 코드를 훼손하지 않고 고칠 수 있는 지점이라 정확한 새 인터페이스(요구되는 prop 이름·타입·동작)를 명시했다.

**타입 일관성:** `TemplateDetailDto.currentVersion.content`(Json/Tiptap)·`ExportDocumentResponse.base64`·`AiReviewFinding.severity`(danger/warning/info) 등 Task 2에서 정의한 타입을 Task 4~12가 동일한 이름·모양으로 참조하는지 전체 확인함 — 어긋난 곳 없음.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-20-document-editor-implementation.md`. 12개 태스크, 백엔드(Task 1~8) → 프런트 배관(Task 9) → 프런트 화면(Task 10~12) 순서로 의존한다. Subagent-Driven 방식(태스크마다 새 서브에이전트 + 리뷰)으로 이어서 진행한다.
