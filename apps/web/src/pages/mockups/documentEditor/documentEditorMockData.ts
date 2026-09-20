/**
 * 표준양식 관리 · 문서 편집기 시안용 가짜 데이터.
 * 실제 API(user-service 템플릿 CRUD·버전·로아이)가 붙기 전 화면만 보기 위한 값이다.
 * 분류 6종은 api/standardForms.ts 의 STANDARD_FORM_CATEGORIES 를 그대로 쓴다.
 */

export interface MockTemplate {
  id: string;
  categoryId: string;
  name: string;
  /** 지금 쓰이는 버전 번호 */
  versionNo: number;
  clauseCount: number;
  updatedAt: string;
  updatedBy: string;
  /** 계약 작성에서 고를 수 있게 공개한 양식인지 */
  isPublished: boolean;
}

export const MOCK_TEMPLATES: MockTemplate[] = [
  { id: "t-nda-1", categoryId: "nda", name: "비밀유지계약서(NDA) 표준", versionNo: 3, clauseCount: 8, updatedAt: "2026-09-12", updatedBy: "김서연 변호사", isPublished: true },
  { id: "t-nda-2", categoryId: "nda", name: "상호 비밀유지계약서(MNDA)", versionNo: 2, clauseCount: 9, updatedAt: "2026-08-28", updatedBy: "김서연 변호사", isPublished: true },
  { id: "t-nda-3", categoryId: "nda", name: "영문 비밀유지계약서(NDA, EN)", versionNo: 1, clauseCount: 7, updatedAt: "2026-06-04", updatedBy: "박도윤 변호사", isPublished: false },
  { id: "t-svc-1", categoryId: "service", name: "용역계약서 표준", versionNo: 5, clauseCount: 12, updatedAt: "2026-09-16", updatedBy: "박도윤 변호사", isPublished: true },
  { id: "t-svc-2", categoryId: "service", name: "기술용역(개발) 계약서", versionNo: 4, clauseCount: 14, updatedAt: "2026-07-22", updatedBy: "이지훈 대리", isPublished: true },
  { id: "t-sup-1", categoryId: "supply", name: "물품공급계약서 표준", versionNo: 2, clauseCount: 11, updatedAt: "2026-05-19", updatedBy: "김서연 변호사", isPublished: true },
  { id: "t-ent-1", categoryId: "entrust", name: "업무위탁계약서 표준", versionNo: 3, clauseCount: 10, updatedAt: "2026-04-07", updatedBy: "박도윤 변호사", isPublished: true },
  { id: "t-lic-1", categoryId: "license", name: "SW 라이선스계약서 표준", versionNo: 1, clauseCount: 13, updatedAt: "2026-03-30", updatedBy: "이지훈 대리", isPublished: false },
  { id: "t-etc-1", categoryId: "etc", name: "양해각서(MOU) 표준", versionNo: 2, clauseCount: 6, updatedAt: "2026-02-11", updatedBy: "김서연 변호사", isPublished: true },
];

export interface MockVersion {
  versionNo: number;
  savedAt: string;
  savedBy: string;
  /** 무엇이 바뀌었는지 한 줄 */
  note: string;
}

/** 비밀유지계약서(NDA) 표준의 저장 이력 — 최신이 위. */
export const MOCK_VERSIONS: MockVersion[] = [
  { versionNo: 3, savedAt: "2026-09-12 14:20", savedBy: "김서연 변호사", note: "손해배상 상한을 계약금액의 2배로 고치고 준거법 조항을 더했습니다." },
  { versionNo: 2, savedAt: "2026-07-03 09:41", savedBy: "박도윤 변호사", note: "비밀정보의 범위 표를 넣고 반환·파기 기한을 30일로 맞췄습니다." },
  { versionNo: 1, savedAt: "2026-05-02 17:08", savedBy: "김서연 변호사", note: "법무팀 표준 양식으로 처음 등록했습니다." },
];

export type ReviewSeverityTypes = "danger" | "warning" | "info";

export interface MockReviewFinding {
  id: string;
  severity: ReviewSeverityTypes;
  kind: "위험 조항" | "빈칸" | "누락 조항";
  title: string;
  where: string;
  note: string;
}

/** 로아이 초안 검토 결과 — 위험 2 · 빈칸 1 · 누락 1. */
export const MOCK_REVIEW_FINDINGS: MockReviewFinding[] = [
  {
    id: "f1",
    severity: "danger",
    kind: "위험 조항",
    title: "손해배상 한도가 없습니다",
    where: "제6조 (손해배상)",
    note: "배상 범위가 열려 있어 우리 회사가 부담할 금액이 정해지지 않습니다. 계약금액의 100% 또는 2배처럼 상한을 넣어 주세요.",
  },
  {
    id: "f2",
    severity: "danger",
    kind: "위험 조항",
    title: "비밀유지 기간이 '영구'로 되어 있습니다",
    where: "제5조 (기간)",
    note: "기간을 정하지 않으면 관리 부담이 계속 남습니다. 계약 종료 후 3년처럼 끝나는 날을 정하는 것이 보통입니다.",
  },
  {
    id: "f3",
    severity: "warning",
    kind: "빈칸",
    title: "채우지 않은 칸이 있습니다",
    where: "제5조 (기간) · 전문",
    note: "[     ] 로 남은 곳 2군데가 있습니다. 계약 체결일과 비밀유지 기간을 채워 주세요.",
  },
  {
    id: "f4",
    severity: "info",
    kind: "누락 조항",
    title: "분쟁 해결 조항이 없습니다",
    where: "제8조 뒤",
    note: "다툼이 생겼을 때 어느 법원에서 다툴지 정한 조항이 없습니다. 표준 양식은 보통 관할법원 조항을 함께 둡니다.",
  },
];

/** 로아이 초안 생성 — 자주 쓰는 요청 보기. */
export const MOCK_DRAFT_PRESETS: string[] = [
  "비밀유지계약서 초안을 만들어 줘",
  "용역계약서를 우리 회사가 발주하는 쪽으로 써 줘",
  "물품공급계약서에 검수·하자담보 조항을 넣어 줘",
];

/** 로아이 선택 문장 다듬기 — 고를 수 있는 지시. */
export const MOCK_REWRITE_ACTIONS: { id: string; label: string; hint: string }[] = [
  { id: "polish", label: "문장 다듬기", hint: "뜻은 그대로 두고 읽기 쉽게 고칩니다." },
  { id: "tighten", label: "우리에게 유리하게", hint: "책임을 줄이고 상대 의무를 또렷하게 씁니다." },
  { id: "clause", label: "조항으로 쓰기", hint: "적어 둔 메모를 계약 조항 문장으로 바꿉니다." },
  { id: "plain", label: "쉬운 말로", hint: "어려운 법률 용어를 풀어 씁니다." },
];

/** 다듬기 결과 미리보기(가짜) */
export const MOCK_REWRITE_RESULT =
  "“갑”과 “을”은 본 계약에 따라 알게 된 상대방의 비밀정보를 제3자에게 공개하거나 본 계약의 목적 외의 용도로 사용해서는 안 된다. 다만, 법령이나 법원의 명령에 따라 공개하는 경우에는 사전에 상대방에게 알린다.";

/** "빈 문서로 만들기"로 들어갔을 때 캔버스 초기값 — 정말로 비어 있다. */
export const MOCK_BLANK_HTML = "";

interface MockDraftTemplate {
  title: string;
  purpose: string;
  articleHtml: string;
}

/** 로아이 "새로 쓰기" 요청 문구에서 계약 종류를 가늠해 그에 맞는 초안 골격을 고른다. */
const MOCK_DRAFT_TEMPLATES: { match: RegExp; template: MockDraftTemplate }[] = [
  {
    match: /비밀유지|NDA/i,
    template: {
      title: "비밀유지계약서",
      purpose: "상호 제공하는 정보의 비밀을 지키기 위하여",
      articleHtml: `
<h2>제1조 (목적)</h2>
<p>본 계약은 “갑”과 “을”이 상호 제공하는 정보의 비밀 유지에 관한 사항을 정하는 것을 목적으로 한다.</p>
<h2>제2조 (비밀정보의 정의)</h2>
<p>본 계약에서 “비밀정보”란 일방 당사자가 상대방에게 서면·구두·전자적 방법 등으로 제공한 일체의 정보를 말한다.</p>
<h2>제3조 (비밀유지 의무)</h2>
<p>“갑”과 “을”은 비밀정보를 제3자에게 공개하지 아니하며, 본 계약의 목적 외의 용도로 사용하지 아니한다.</p>
<div data-page-break></div>
<h2>제4조 (기간)</h2>
<p>본 계약은 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]부터 효력이 생기며, 비밀유지 의무는 계약 종료 후 [&nbsp;&nbsp;&nbsp;&nbsp;]년간 존속한다.</p>
<h2>제5조 (손해배상)</h2>
<p>일방 당사자가 본 계약을 위반하여 상대방에게 손해를 입힌 경우 그 손해를 배상한다.</p>`,
    },
  },
  {
    match: /용역/,
    template: {
      title: "용역계약서",
      purpose: "용역의 위탁 및 수행에 관한 사항을 정하기 위하여",
      articleHtml: `
<h2>제1조 (목적)</h2>
<p>“갑”은 “을”에게 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;] 용역(이하 “본 용역”)을 위탁하고, “을”은 이를 수행한다.</p>
<h2>제2조 (용역 기간)</h2>
<p>본 용역의 수행 기간은 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]부터 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]까지로 한다.</p>
<h2>제3조 (용역 대가)</h2>
<p>“갑”은 “을”에게 본 용역의 대가로 금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원을 지급한다.</p>
<div data-page-break></div>
<h2>제4조 (검수)</h2>
<p>“갑”은 용역 결과물을 인도받은 날로부터 [&nbsp;&nbsp;&nbsp;&nbsp;]일 이내에 검수하고 그 결과를 “을”에게 통지한다.</p>
<h2>제5조 (계약 해지)</h2>
<p>일방 당사자가 본 계약을 위반하고 상당한 기간 내 이를 고치지 아니하면 상대방은 계약을 해지할 수 있다.</p>`,
    },
  },
  {
    match: /물품|공급/,
    template: {
      title: "물품공급계약서",
      purpose: "물품의 공급 및 대금 지급에 관한 사항을 정하기 위하여",
      articleHtml: `
<h2>제1조 (목적)</h2>
<p>“을”은 “갑”에게 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;] 물품(이하 “본 물품”)을 공급하고, “갑”은 그 대금을 지급한다.</p>
<h2>제2조 (공급 및 검수)</h2>
<p>“을”은 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]까지 본 물품을 납품하며, “갑”은 인도일로부터 [&nbsp;&nbsp;&nbsp;&nbsp;]일 이내에 검수한다.</p>
<h2>제3조 (대금 지급)</h2>
<p>“갑”은 검수 완료 후 [&nbsp;&nbsp;&nbsp;&nbsp;]일 이내에 대금을 지급한다.</p>
<div data-page-break></div>
<h2>제4조 (하자담보책임)</h2>
<p>본 물품에 하자가 있는 경우 “을”은 “갑”의 청구에 따라 보수·교환 또는 손해배상의 책임을 진다.</p>
<h2>제5조 (소유권 이전)</h2>
<p>본 물품의 소유권은 대금 완납 시 “갑”에게 이전된다.</p>`,
    },
  },
  {
    match: /업무위탁|위탁/,
    template: {
      title: "업무위탁계약서",
      purpose: "업무의 위탁 및 수행에 관한 사항을 정하기 위하여",
      articleHtml: `
<h2>제1조 (목적)</h2>
<p>“갑”은 “을”에게 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;] 업무(이하 “위탁업무”)를 위탁하고, “을”은 이를 수행한다.</p>
<h2>제2조 (위탁 범위)</h2>
<p>위탁업무의 구체적인 범위와 방법은 별지 업무분장표에 따른다.</p>
<h2>제3조 (위탁 대가)</h2>
<p>“갑”은 “을”에게 위탁업무의 대가로 매월 금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원을 지급한다.</p>
<div data-page-break></div>
<h2>제4조 (재위탁 금지)</h2>
<p>“을”은 “갑”의 사전 서면 동의 없이 위탁업무의 전부 또는 일부를 제3자에게 재위탁할 수 없다.</p>
<h2>제5조 (계약 기간)</h2>
<p>본 계약의 유효기간은 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]부터 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]까지로 한다.</p>`,
    },
  },
];

const MOCK_DRAFT_DEFAULT: MockDraftTemplate = {
  title: "계약서",
  purpose: "아래와 같은 내용을 정하기 위하여",
  articleHtml: `
<h2>제1조 (목적)</h2>
<p>“갑”과 “을”은 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]에 관한 사항을 정하기 위하여 본 계약을 체결한다.</p>
<h2>제2조 (계약 기간)</h2>
<p>본 계약은 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]부터 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]까지 효력을 가진다.</p>
<div data-page-break></div>
<h2>제3조 (당사자의 의무)</h2>
<p>“갑”과 “을”은 신의성실의 원칙에 따라 본 계약을 이행한다.</p>
<h2>제4조 (손해배상)</h2>
<p>일방 당사자가 본 계약을 위반하여 상대방에게 손해를 입힌 경우 그 손해를 배상한다.</p>`,
};

/** 사용자가 적은 요청 문구를 본문 HTML에 그대로 넣기 전에 태그로 읽히지 않게 막는다. */
const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * 로아이 "새로 쓰기" 결과(가짜) — 요청 문구에 담긴 계약 종류를 골라 그에 맞는 초안 HTML을 만든다.
 * 실제 구현에서는 AiServiceClient.chat 이 이 자리를 대신한다.
 */
export const buildMockDraft = (request: string): string => {
  const matched = MOCK_DRAFT_TEMPLATES.find((item) => item.match.test(request));
  const template = matched?.template ?? MOCK_DRAFT_DEFAULT;

  return `
<h1>${template.title}</h1>
<p>[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;](이하 “갑”이라 한다)과(와) [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;](이하 “을”이라 한다)은(는) ${template.purpose} 다음과 같이 계약을 체결한다.</p>
${template.articleHtml}
<hr>
<p>본 계약의 성립을 증명하기 위하여 계약서 2통을 만들어 “갑”과 “을”이 서명·날인한 뒤 각 1통씩 보관한다.</p>
<p><em>“${escapeHtml(request)}” 요청으로 로아이가 만든 초안입니다. 빈칸과 조건을 확인한 뒤 저장하세요.</em></p>`;
};

/** 편집기 캔버스에 처음 들어가는 내용 — 비밀유지계약서 v3. */
export const MOCK_NDA_HTML = `
<h1>비밀유지계약서</h1>
<p>주식회사 로아이(이하 “갑”이라 한다)와 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;](이하 “을”이라 한다)은(는) 상호 간에 제공하는 정보의 비밀을 지키기 위하여 다음과 같이 계약을 체결한다.</p>
<h2>제1조 (목적)</h2>
<p>본 계약은 “갑”과 “을”이 <strong>공동 사업 검토</strong>를 위하여 서로 제공하는 정보의 비밀 유지에 관한 사항을 정하는 것을 목적으로 한다.</p>
<h2>제2조 (비밀정보의 정의)</h2>
<p>본 계약에서 “비밀정보”란 일방 당사자가 상대방에게 서면·구두·전자적 방법 등으로 제공한 일체의 정보로서, 아래 표에 적은 것을 포함한다.</p>
<table>
  <tbody>
    <tr>
      <th>구분</th>
      <th>포함되는 정보</th>
      <th>제외되는 정보</th>
    </tr>
    <tr>
      <td>기술</td>
      <td>설계도·소스코드·시험 결과</td>
      <td>공개 특허 명세서</td>
    </tr>
    <tr>
      <td>영업</td>
      <td>가격표·고객 목록·사업계획</td>
      <td>이미 공개된 보도자료</td>
    </tr>
  </tbody>
</table>
<h2>제3조 (비밀유지 의무)</h2>
<p>“갑”과 “을”은 비밀정보를 제3자에게 공개하지 아니하며, 본 계약의 목적 외의 용도로 사용하지 아니한다. 다만 <mark>법령 또는 법원의 명령에 따라 공개가 요구되는 경우</mark>에는 그러하지 아니하되, 공개 전에 상대방에게 그 사실을 알린다.</p>
<h2>제4조 (목적 외 사용 금지 및 복제 제한)</h2>
<ul>
  <li>상대방의 사전 서면 동의 없이 비밀정보를 복제하지 아니한다.</li>
  <li>업무상 알 필요가 있는 임직원에게만 비밀정보를 알리고, 그 임직원에게 본 계약과 같은 의무를 지운다.</li>
</ul>
<div data-page-break></div>
<h2>제5조 (기간)</h2>
<p>본 계약은 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]부터 효력이 생기며, 비밀유지 의무는 <strong>영구히</strong> 존속한다.</p>
<h2>제6조 (손해배상)</h2>
<p>일방 당사자가 본 계약을 위반하여 상대방에게 손해를 입힌 경우 그 손해를 배상한다.</p>
<h2>제7조 (반환·파기)</h2>
<p>본 계약이 끝나거나 상대방이 요청하면 비밀정보가 담긴 문서·매체를 30일 안에 돌려주거나 없애고, 그 결과를 서면으로 알린다.</p>
<h2>제8조 (권리의 부존재)</h2>
<p>본 계약으로 비밀정보에 관한 어떠한 지식재산권도 상대방에게 넘어가지 아니한다.</p>
<hr>
<p>본 계약의 성립을 증명하기 위하여 계약서 2통을 만들어 “갑”과 “을”이 서명·날인한 뒤 각 1통씩 보관한다.</p>
`;
