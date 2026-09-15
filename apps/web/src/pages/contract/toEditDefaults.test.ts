import { describe, it, expect } from "vitest";
import type { ContractResponse } from "@lawai/contracts";
import { toEditDefaults } from "./toEditDefaults";
import { toCreateRequest } from "./toCreateRequest";
import { toDerivedRequestDefaults } from "./toDerivedRequestDefaults";

const company = {
  id: "comp-1",
  type: "company" as const,
  name: "삼성전자(주)",
  bizNo: "124-81-00998",
  ceo: "한종희",
  phone: null,
  address: null,
  addressDetail: null,
  managerName: null,
  managerPhone: null,
  managerEmail: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const response: ContractResponse = {
  id: "uuid-1",
  code: "C20260621-0001",
  title: "수정대상",
  status: "legalReview",
  securityLevel: "top",
  reviewType: "std",
  party: "본사계약",
  categoryId: "cat-saas",
  categoryLabel: "개발/공급 > 소프트웨어 > SaaS 이용",
  requesterId: "jhson1",
  requesterName: null,
  ownerId: "lee",
  ownerName: null,
  createdById: "u1",
  periodStart: "2026-07-01T00:00:00.000Z",
  periodEnd: null,
  dueDate: "2026-07-10T00:00:00.000Z",
  signedAt: null,
  closedReason: null,
  closedAt: null,
  closedNote: null,
  originContractId: null,
  originContract: null,
  derivedContracts: [],
  schemaVersion: 1,
  details: {
    stage: "change",
    periodText: "",
    periodManual: false,
    noEndDate: false,
    lang: "en",
    legal: "dom",
    negotiation: 70,
    money: [{ vat: "included", amount: 500, currency: "USD" }],
    moneyNote: "비고",
    payTerms: "선금",
    purpose: "목적",
    keyPoints: "핵심",
    concerns: "우려",
    urls: ["https://a.io", "https://b.io"],
    owner: { id: "lee", name: "이법무" },
    project: null,
    relatedDocs: [],
  },
  counterparties: [
    { id: "cp-1", companyId: "comp-1", partyType: null, snapshot: company },
  ],
  approvalLine: {
    id: "l-1",
    status: "pending",
    steps: [
      { id: "s-1", stepOrder: 0, userId: "u-son", name: "손준호", avatarUrl: null, dept: "법무팀", type: "draft", status: "pending", comment: null, decidedAt: null },
      { id: "s-2", stepOrder: 1, userId: "u-lee", name: "이법무", avatarUrl: null, dept: "법무팀", type: "approve", status: "pending", comment: null, decidedAt: null },
    ],
    currentStepId: "s-2",
    submittedById: "u-son",
    submittedAt: "2026-06-01T00:00:00.000Z",
  },
  plannedApprovers: [],
  files: [
    { id: "f-1", role: "contract", name: "계약서.docx", meta: "DOCX", size: null, mimeType: null, storageKey: null, sortOrder: 0 },
    { id: "f-2", role: "attach", name: "별첨.pdf", meta: "PDF", size: null, mimeType: null, storageKey: null, sortOrder: 0 },
  ],
  references: [
    { id: "r-1", ccType: "user", isSecret: false, refId: "u2", name: "김참조" },
    { id: "r-2", ccType: "dept", isSecret: false, refId: "d1", name: "법무팀" },
    { id: "r-3", ccType: "user", isSecret: true, refId: "u9", name: "비밀임원" },
  ],
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-08T00:00:00.000Z",
};

describe("toDerivedRequestDefaults (갱신·변경·해지 요청 폼)", () => {
  const origin: ContractResponse = {
    ...response,
    status: "fulfilling",
    periodStart: "2025-10-10T00:00:00.000Z",
    periodEnd: "2026-10-09T00:00:00.000Z",
    signedAt: "2025-10-01T00:00:00.000Z",
  };

  it("갱신은 원 계약 내용을 가져오고 계약명·기간(만료 다음 날부터 같은 길이)을 제안한다", () => {
    const form = toDerivedRequestDefaults(origin, "renew", "me-1");
    expect(form.stage).toBe("renew");
    expect(form.originContract).toEqual({ id: origin.id, code: origin.code, title: origin.title });
    expect(form.name).toBe(`${origin.title} (갱신)`);
    expect([form.periodStart, form.periodEnd]).toEqual(["2026-10-10", "2027-10-09"]);
    expect(form.counterparties).toEqual(origin.counterparties.map((cp) => cp.snapshot));
    expect(form.requester).toBe("me-1");
  });

  it("새 요청이라 파일·체결 정보·관련 문서는 비우고 검토 요청으로 시작한다", () => {
    const form = toDerivedRequestDefaults(origin, "terminate", "me-1");
    expect(form.name).toBe(`${origin.title} (해지 합의)`);
    expect(form.registerAs).toBe("review");
    expect(form.signedAt).toBe("");
    expect([form.contractFiles, form.attachFiles, form.refFiles, form.signedFiles, form.relatedDocs]).toEqual([[], [], [], [], []]);
  });

  it("폼을 그대로 보내면 원 계약 id 가 요청에 실린다", () => {
    const req = toCreateRequest(toDerivedRequestDefaults(origin, "renew", "me-1"));
    expect(req.originContractId).toBe(origin.id);
    expect(req.details.stage).toBe("renew");
    expect(toCreateRequest({ ...toDerivedRequestDefaults(origin, "renew", "me-1"), stage: "new" }).originContractId).toBeNull();
  });
});

describe("toEditDefaults", () => {
  it("응답을 폼 값으로 역매핑한다(코어·details)", () => {
    const f = toEditDefaults(response);
    expect(f.name).toBe("수정대상");
    expect(f.secure).toBe("top");
    expect(f.ctype).toBe("std");
    expect(f.categoryId).toBe("cat-saas");
    expect(f.periodStart).toBe("2026-07-01");
    expect(f.expectedDate).toBe("2026-07-10");
    expect(f.lang).toBe("en");
    expect(f.negotiation).toBe(70);
    expect(f.urls).toEqual([{ value: "https://a.io" }, { value: "https://b.io" }]);
    expect(f.owner).toEqual({ id: "lee", name: "이법무" });
  });

  it("관계를 폼 배열로 복원한다", () => {
    const f = toEditDefaults(response);
    expect(f.counterparties[0].name).toBe("삼성전자(주)");
    expect(f.contractFiles).toEqual([
      { id: "f-1", name: "계약서.docx", meta: "DOCX", mimeType: null },
    ]);
    expect(f.attachFiles).toEqual([
      { id: "f-2", name: "별첨.pdf", meta: "PDF", mimeType: null },
    ]);
    expect(f.ccUsers).toEqual([{ id: "u2", name: "김참조" }]);
    expect(f.ccDepts).toEqual([{ id: "d1", name: "법무팀" }]);
    expect(f.ccSecret).toEqual([{ id: "u9", name: "비밀임원" }]);
    expect(f.approvers).toHaveLength(2);
    expect(f.approvers[1].type).toBe("approve");
  });

  it("plannedApprovers 가 있으면 활성 라인 대신 그걸 우선 사용한다(userId 포함)", () => {
    const withPlanned = {
      ...response,
      plannedApprovers: [
        { userId: "u-planned", name: "박기획", dept: "기획팀", type: "approve" as const },
      ],
    };
    const f = toEditDefaults(withPlanned);
    expect(f.approvers).toEqual([
      { userId: "u-planned", name: "박기획", dept: "기획팀", type: "approve" },
    ]);
  });

  it("plannedApprovers 가 없으면 활성 라인 스텝의 userId 를 보존한다", () => {
    const f = toEditDefaults(response);
    expect(f.approvers[0].userId).toBe("u-son");
    expect(f.approvers[1].userId).toBe("u-lee");
  });

  it("역매핑→toCreateRequest 라운드트립이 안정적이다", () => {
    const req = toCreateRequest(toEditDefaults(response));
    expect(req.title).toBe("수정대상");
    expect(req.securityLevel).toBe("top");
    expect(req.files).toHaveLength(2);
    expect(req.references).toHaveLength(3);
    expect(req.approvers).toHaveLength(2);
    expect(req.counterparties[0].companyId).toBe("comp-1");
  });

  // C1 회귀 방지: toEditDefaults 가 registerAs/signedAt/signedFiles 를 복원하지 못하면,
  // 편집 화면이 "법무 검토 요청"으로 잘못 렌더되고(체결일·서명본 UI가 아예 안 뜸), 그 상태로
  // 저장하면 PATCH 의 files 배열에 서명본이 빠져 실제 서명 원본(R2 객체 포함)이 삭제된다.
  describe("체결 완료 등록 계약(role=signed 파일 존재 + 결재 라인 없음)", () => {
    // 체결 완료 등록은 검토·결재를 건너뛰는 경로라 결재 라인이 "영원히" 없다
    // (finalizeRegistration 은 결재 라인을 만들지 않는다) — approvalLine:null 이 이 픽스처의
    // 핵심 전제다(E 회귀 테스트 참고: 이게 없으면 completeSigning 승격 케이스와 구분이 안 된다).
    const signedResponse: ContractResponse = {
      ...response,
      approvalLine: null,
      plannedApprovers: [],
      signedAt: "2026-09-12T00:00:00.000Z",
      files: [
        ...response.files,
        {
          id: "f-signed-1",
          role: "signed",
          name: "서명본.pdf",
          meta: "PDF",
          size: 1024,
          mimeType: "application/pdf",
          storageKey: "contracts/uuid-1/abc/서명본.pdf",
          sortOrder: 0,
        },
      ],
    };

    it("registerAs 를 signed 로 복원한다(role=signed 파일 존재로 역산)", () => {
      const f = toEditDefaults(signedResponse);
      expect(f.registerAs).toBe("signed");
    });

    it("signedAt 을 날짜만(YYYY-MM-DD) 복원한다", () => {
      const f = toEditDefaults(signedResponse);
      expect(f.signedAt).toBe("2026-09-12");
    });

    it("signedFiles 를 복원한다(id 포함 — 편집 저장 시 PATCH 에서 이 id 가 유지돼야 삭제되지 않는다)", () => {
      const f = toEditDefaults(signedResponse);
      expect(f.signedFiles).toEqual([
        { id: "f-signed-1", name: "서명본.pdf", meta: "PDF", mimeType: "application/pdf" },
      ]);
    });

    it("일반 검토 계약(role=signed 파일 없음)은 registerAs=review, signedFiles=[]", () => {
      const f = toEditDefaults(response);
      expect(f.registerAs).toBe("review");
      expect(f.signedFiles).toEqual([]);
      expect(f.signedAt).toBe("");
    });

    it("역매핑→toCreateRequest 라운드트립에 signedFiles 의 id 가 그대로 살아있다(삭제 방지의 핵심)", () => {
      const req = toCreateRequest(toEditDefaults(signedResponse));
      const signedFile = req.files.find((file) => file.role === "signed");
      expect(signedFile?.id).toBe("f-signed-1");
    });
  });

  // E 회귀 방지: completeSigning 은 정상 검토 계약의 파일도 role=signed 로 승격시킨다.
  // role=signed 파일 존재만으로 registerAs 를 판단하면, "법무 검토 → 결재 → 체결"을 정상적으로
  // 다 거친 계약도 편집을 열 때 체결 완료 등록 모드로 잘못 표시돼(계약서 유형·검토 요청자
  // 필드가 숨어버린다) — 결재 라인 유무로 구분해야 한다.
  describe("completeSigning 으로 승격된 일반 검토 계약(결재 라인 있음 + role=signed 파일 있음)", () => {
    const completedReviewResponse: ContractResponse = {
      ...response,
      status: "signed",
      signedAt: "2026-09-12T00:00:00.000Z",
      // response 는 이미 approvalLine 이 있다(검토 흐름을 정상적으로 거쳤다는 뜻) — 그대로 둔다.
      files: [
        // completeSigning 은 새 파일을 만들지 않고 기존 계약서(f-1)의 role 만 signed 로
        // 바꾼다 — 그래서 "contract" 항목은 더는 없고 같은 id 가 signed 로 남는다.
        {
          id: "f-1",
          role: "signed",
          name: "계약서.docx",
          meta: "DOCX",
          size: 2048,
          mimeType: null,
          storageKey: "contracts/uuid-1/xyz/계약서.docx",
          sortOrder: 0,
        },
        response.files[1], // f-2, role=attach — 그대로.
      ],
    };

    it("결재 라인이 있으면 role=signed 파일이 있어도 registerAs=review 로 남는다", () => {
      const f = toEditDefaults(completedReviewResponse);
      expect(f.registerAs).toBe("review");
    });

    it("registerAs=review 라서 계약서 유형·검토 요청자 필드가 숨지 않는다(폼 필드 값 자체는 보존)", () => {
      const f = toEditDefaults(completedReviewResponse);
      expect(f.ctype).toBe("std");
      expect(f.requester).toBe("jhson1");
    });
  });
});
