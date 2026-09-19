# 표준계약서 문서 편집기 설계

- 날짜: 2026-09-19
- 사용자 결정
  - 구글독스 느낌은 "편집 화면·기능"만 — 여러 명 동시 실시간 편집은 이번 범위 아님.
  - 표준양식(템플릿)은 **회사(테넌트)별로 따로** 관리한다 — 운영사 콘솔(`apps/admin`)이 아니라 `apps/web` 안에 새 메뉴로.
  - DOCX 업로드는 **표준양식 관리**에서만(새 템플릿을 업로드로 시작). **계약 작성은 표준계약서 체결(`ctype=std`)일 때만 템플릿에서 시작**하고, 그 외 계약 유형은 지금처럼 파일 첨부로 그대로 둔다.
  - 에디터에서 저장하면 **진짜 .docx 파일**로 변환해 계약서 자리에 첨부한다(상대방이 워드로 다시 손볼 수 있어야 함).
  - 버전 이력을 처음부터 둔다 — 저장마다 새 버전을 쌓고(불변), **이전 버전으로 되돌리기**도 이번에 만든다.
  - AI 기능 셋 다 넣는다: 초안 생성, 선택 문장 다듬기/조항 작성, 초안 검토(위험·빈칸·누락 조항).

## 배경

"표준계약서 양식 보기"(`StandardFormsModal`)는 지금 하드코딩된 가짜 데이터 9개를 보여주고 "다운로드" 버튼만 있다(실제로 눌리지 않음 — 클릭 핸들러가 파일 없는 메타데이터 행만 폼에 추가). 회사가 자기 표준 양식을 만들고, 계약 작성 시 그 양식을 웹에서 바로 열어 고쳐 쓰는 기능이 없다.

## 기존 자산 (이번 설계가 재사용하는 것)

- `apps/web/src/components/ui/RichTextEditor.tsx` — Tiptap 기반, 굵게·기울임·밑줄·취소선·색·하이라이트·목록·들여쓰기·정렬·링크·구분선·서식지우기 툴바가 이미 완성돼 있고 Word/HWP 붙여넣기 정리(`cleanPastedHtml.ts`)도 있다. 표(Table)만 추가하면 문서 편집기로 확장 가능.
- `mammoth`(user-service, `contract-text.extractor.ts`) — DOCX → 텍스트/HTML 변환 라이브러리가 이미 의존성에 있다(지금은 `extractRawText`만 쓰지만 `convertToHtml`도 제공).
- `FileUploadField`(계약 작성) — `contractId` 없으면 blob을 폼에 들고 있다가 제출 시 일괄 업로드, 있으면 즉시 presign→PUT→confirm. **에디터가 만든 `File` 객체를 그대로 이 자리에 넣으면 새 업로드 로직이 거의 필요 없다.**
- `AiServiceClient.chat({ model, apiKey, system, messages })`(user-service, `assistant.service.ts`) — 로아이 채팅이 쓰는 자유 프롬프트 호출. AI 연동 키 없으면 `SETUP_REPLY`(설정 안내) 패턴도 이미 있다.
- `canSeeCycleTimeStats.ts` + `navPermission.ts` — 역할 기반 메뉴 노출 패턴(업무 통계와 동일하게 재사용).

## 데이터 모델 (Prisma, `shared` 스키마 — Contract/Advice와 같은 위치)

```prisma
enum TemplateCategory {
  nda       // 비밀유지
  service   // 용역
  supply    // 물품공급
  entrust   // 업무위탁
  license   // SW·라이선스
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
  content     Json     // Tiptap JSON — 정본
  clauseCount Int?
  createdById String
  createdAt   DateTime @default(now())

  template ContractTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, versionNo])
  @@index([templateId])
  @@schema("shared")
}
```

ERD("Law.ai Reboot")에 `ContractTemplate`·`ContractTemplateVersion` 반영 필요.

## 컴포넌트 구성

- **`packages/document-editor`** (새 workspace 패키지, `@lawai/document-editor`, apps/web 전용 내부 패키지 — npm 미배포) — 문서 편집기 UI 하나만 담당. `RichTextEditor`의 Tiptap 확장 세트 + `@tiptap/extension-table`(table/row/cell/header) 추가, 툴바는 기존 아이콘·구조 재사용(표 삽입 버튼 추가). 페이지처럼 보이는 캔버스(흰 배경·A4 비율 폭·그림자)로 감싼다. `content`(Tiptap JSON) in/out, 저장·AI 버튼은 이 패키지가 콜백으로 노출하고 실제 API 호출은 호출부(apps/web)가 한다(SRP — 패키지는 순수 에디터, 네트워크는 모른다).
- **`apps/web` 새 메뉴 "표준양식 관리"** — 사이드바 "계약 관리" 섹션, `inHouseCounsel`·시스템관리자만 보임(업무 통계와 같은 권한 패턴). 분류별 목록 → 새로 만들기(빈 문서 / DOCX 업로드) → 편집(`document-editor` 패키지) → 저장(새 버전) → 버전 이력(목록 + 되돌리기).
- **계약 작성(표준계약서 체결)** — `StandardFormsModal`을 실제 API 연결로 교체(가짜 `FORMS`/`STANDARD_FORM_CATEGORIES` 상수 제거). 양식 선택 → "이 양식으로 작성 시작" → 같은 에디터가 새 창/모달로 열리고 해당 템플릿의 **최신 버전** 내용으로 시작 → 저장하면 계약서 자리(`contractFiles`)에 채워짐.

## 저장 흐름 (핵심)

1. 에디터 "저장" → 클라이언트가 Tiptap JSON을 서버(user-service)로 보낸다.
2. 서버가 **표준양식 관리**에서 온 저장이면: JSON을 그대로 새 `ContractTemplateVersion`으로 저장(변환 없음).
3. 서버가 **계약 작성**에서 온 저장이면: JSON을 `docx` npm 라이브러리로 실제 .docx 바이트로 변환해 응답으로 돌려준다(파일 자체를 만들어 저장하지 않는 stateless 변환 — `POST /documents/export`).
4. 클라이언트는 받은 바이트로 `File` 객체를 만들어 **기존 `contractFiles` 필드**에 그대로 추가한다 — 이후는 지금 있는 업로드 파이프라인(제출 시 일괄 업로드 또는 즉시 presign) 그대로. 계약 쪽에 새로 만드는 백엔드 연결 로직은 사실상 없음.

DOCX 업로드(새 템플릿 만들기): 클라이언트가 파일을 `POST /documents/import`로 보내면 서버가 `mammoth.convertToHtml()`로 HTML을 만들어 돌려주고, 클라이언트가 그 HTML을 에디터에 `setContent`한다. 원본 DOCX 파일 자체는 저장하지 않는다(에디터 정본이 진실의 원천).

Tiptap JSON → docx 변환은 지원하는 노드/마크만 다룬다: 제목(1~3), 문단, 굵게/기울임/밑줄/취소선, 글자색·하이라이트, 글머리·번호 목록(중첩 포함), 정렬, 표, 구분선. 이 범위는 지금 툴바가 지원하는 것과 정확히 같다.

## AI 기능 (로아이와 같은 방식)

에디터 툴바에 "로아이" 버튼. 셋 다 사용자 본인의 AI 연동 키로 동작(없으면 기존 `SETUP_REPLY`와 같은 안내), 새 AI 서브시스템 없이 `AiServiceClient.chat` 재사용.

1. **초안 생성**: 빈 문서 또는 새 템플릿에서 "비밀유지계약서 초안 만들어줘" 같은 요청 → 시스템 프롬프트로 "계약서 조항 구조를 갖춘 HTML을 만들어라" 지시 → 응답 HTML을 에디터에 채움(비어있지 않으면 확인 후 교체).
2. **선택 문장 다듬기/조항 작성**: 선택 영역 + 지시문("다듬어줘"/"이 조항 써줘") → 그 선택 범위만 교체.
3. **초안 검토**: 현재 에디터 내용 전체를 시스템 프롬프트("위험 조항·안 채워진 칸([ ])·표준 조항 누락을 찾아라")로 보내 구조화된 JSON(`{ findings: [{ severity, title, note }] }`)을 받아 사이드 패널에 나열.

셋 다 새 RPC 패턴(`document.aiDraft` / `document.aiRewrite` / `document.aiReview`) — `assistant.service.ts`의 `chat()`과 같은 구조(자격 확인 → 시스템 프롬프트 구성 → `aiClient.chat` → 파싱).

## 권한

- 표준양식 관리 메뉴·API: `inHouseCounsel` + 시스템관리자(`canSeeCycleTimeStats`와 같은 판정 함수를 템플릿용으로 하나 더 만든다 — 필요하면 나중에 같은 판정으로 합칠 수 있다).
- 템플릿은 테넌트 범위 — 모든 조회·수정에 `tenantId` 필수(다른 회사 템플릿 접근 차단).
- 계약 작성 쪽 양식 선택·에디터 열기는 계약 작성 권한이 있는 사람 누구나(지금 계약서 검토 요청 권한과 동일) — 표준양식 "관리"(만들기/고치기/삭제)와는 다른 권한.

## 테스트 계획

- `packages/document-editor`: 순수 컴포넌트 단위 테스트(Vitest) — 표 삽입, JSON in/out, 빈 문서 판정.
- user-service: 템플릿 CRUD·버전 생성·되돌리기 서비스 테스트, Tiptap JSON→docx 변환기 단위 테스트(지원 노드별로 생성된 docx가 다시 읽었을 때 텍스트가 보존되는지), mammoth import 테스트(이미 있는 docx 픽스처 재사용).
- apps/web: `StandardFormsModal` 교체 후 목록·선택·"작성 시작" 플로우, 저장 후 `contractFiles`에 파일이 들어가는지, 권한에 따라 메뉴 숨김.
- AI 셋(초안 생성/다듬기/검토): 키 없을 때 안내, 정상 응답 파싱, 실패 시 오류 처리 — 기존 `assistant.service.spec.ts` 패턴 재사용.

## 이번에 안 하는 것 (다음 과제로 남김)

- 실시간 동시 편집(여러 명이 같은 문서를 동시에 봄) — 이번엔 한 번에 한 사람.
- 템플릿 카테고리를 관리자가 자유롭게 추가/삭제 — 고정 6종만.
- 표준계약서가 아닌 계약 유형에서도 에디터로 시작 — 그 외 유형은 지금처럼 파일 첨부만.
- 계약에 첨부된 최종 docx를 다시 에디터로 열어 고치기(체결 후 재수정) — 이번 범위는 "작성 시작"까지.
