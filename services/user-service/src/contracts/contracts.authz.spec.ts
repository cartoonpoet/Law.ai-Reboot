import { evaluate, listRelatedUserIds } from "./contracts.authz";
import type { AuthzViewer, AuthzContract } from "./contracts.authz";
import type { TenantRole } from "@lawai/contracts";

/**
 * 중앙 RBAC 정책(evaluate) 단위 테스트 — 6역할 × 5액션 매트릭스(01-clarify 표) 검증.
 * 정책 데이터(ROLE_POLICY)와 평가 로직(evaluate)이 표대로 동작하는지를 순수 함수 레벨에서 확인한다.
 */

const OWNER_ID = "owner-1";
const CREATOR_ID = "creator-1";
const REQUESTER_ID = "requester-1";
const CC_USER_ID = "cc-1";

// 평가 대상 계약. status/securityLevel/owner 관계는 케이스별로 덮어쓴다.
const makeContract = (
  overrides: Partial<AuthzContract> = {},
): AuthzContract => ({
  createdById: CREATOR_ID,
  ownerId: OWNER_ID,
  requesterId: REQUESTER_ID,
  ccUserIds: [CC_USER_ID],
  status: "legalReview",
  securityLevel: "secure",
  departmentId: "dept-1",
  ...overrides,
});

const makeViewer = (
  role: TenantRole,
  id = "viewer-x",
  departmentId: string | null = "dept-1",
): AuthzViewer => ({ id, role, departmentId });

describe("contracts.authz evaluate", () => {
  // admin 역할은 loadViewer 에서 "inHouseCounsel" 로 매핑된 뒤 evaluate 에 진입하므로,
  // 여기서는 inHouseCounsel 로 evaluate 를 검증한다.
  // delete 는 TenantRole 어디에도 없음(admin 전용 권한은 service 레이어에서 관리).
  describe("inHouseCounsel(admin 매핑 포함): owner 건 전체 권한, delete 제외", () => {
    it("owner 인 무관 계약에도 view+edit+assign+transition 가능, delete=false", () => {
      const r = evaluate(makeViewer("inHouseCounsel", OWNER_ID), makeContract());
      expect(r).toEqual({
        canView: true,
        canEdit: true,
        canAssign: true,
        canTransition: true,
        canDelete: false, // TenantRole 기준 delete=false (admin 전용 로직은 service 레이어)
        maskSecret: false, // 특권 역할
      });
    });
  });

  describe("inHouseCounsel (법무팀: 전체 view, 담당 건만 쓰기)", () => {
    it("owner 인 경우 edit/assign/transition 가능", () => {
      const r = evaluate(
        makeViewer("inHouseCounsel", OWNER_ID),
        makeContract(),
      );
      expect(r.canView).toBe(true);
      expect(r.canEdit).toBe(true);
      expect(r.canAssign).toBe(true);
      expect(r.canTransition).toBe(true);
      expect(r.canDelete).toBe(false); // delete 는 admin 전용
      expect(r.maskSecret).toBe(false); // 특권 역할
    });

    it("owner 가 아니면 전체 view 는 되지만 쓰기 불가", () => {
      const r = evaluate(
        makeViewer("inHouseCounsel", "other-1"),
        makeContract(),
      );
      expect(r.canView).toBe(true); // 법무팀 전체 view
      expect(r.canEdit).toBe(false);
      expect(r.canAssign).toBe(false);
      expect(r.canTransition).toBe(false);
      expect(r.canDelete).toBe(false);
      expect(r.maskSecret).toBe(false); // 특권 역할이라 owner 아니어도 원문 열람
    });
  });

  describe("contractManager (법무팀: 전체 view, 담당 건만 쓰기)", () => {
    it("owner 인 경우 edit/assign/transition 가능", () => {
      const r = evaluate(
        makeViewer("contractManager", OWNER_ID),
        makeContract(),
      );
      expect(r.canView).toBe(true);
      expect(r.canEdit).toBe(true);
      expect(r.canAssign).toBe(true);
      expect(r.canTransition).toBe(true);
      expect(r.canDelete).toBe(false);
      expect(r.maskSecret).toBe(false);
    });

    it("creator 이지만 owner 아니면 쓰기 불가(담당 건 한정)", () => {
      const r = evaluate(
        makeViewer("contractManager", CREATOR_ID),
        makeContract(),
      );
      expect(r.canView).toBe(true);
      expect(r.canEdit).toBe(false);
      expect(r.canTransition).toBe(false);
      expect(r.maskSecret).toBe(false);
    });
  });

  describe("outsideCounsel (배정된 owner 건만)", () => {
    it("owner 인 경우 view/edit/transition 가능, assign 은 불가", () => {
      const r = evaluate(
        makeViewer("outsideCounsel", OWNER_ID),
        makeContract(),
      );
      expect(r.canView).toBe(true);
      expect(r.canEdit).toBe(true);
      expect(r.canAssign).toBe(false); // 배정 권한 없음
      expect(r.canTransition).toBe(true);
      expect(r.canDelete).toBe(false);
      expect(r.maskSecret).toBe(false); // owner 라 원문 열람
    });

    it("배정되지 않은(미owner) 건은 view 부터 불가 → 전부 false + maskSecret", () => {
      const r = evaluate(
        makeViewer("outsideCounsel", "other-1"),
        makeContract(),
      );
      expect(r.canView).toBe(false);
      expect(r.canEdit).toBe(false);
      expect(r.canAssign).toBe(false);
      expect(r.canTransition).toBe(false);
      expect(r.canDelete).toBe(false);
      expect(r.maskSecret).toBe(true); // 비특권·미owner
    });
  });

  describe("general (본인 관련만 view, 쓰기 전부 불가)", () => {
    it("creator 면 view 가능", () => {
      const r = evaluate(makeViewer("general", CREATOR_ID), makeContract());
      expect(r.canView).toBe(true);
      expect(r.maskSecret).toBe(false); // creator 는 원문 열람
    });

    it("owner 면 view 가능", () => {
      const r = evaluate(makeViewer("general", OWNER_ID), makeContract());
      expect(r.canView).toBe(true);
      expect(r.maskSecret).toBe(false); // owner 는 원문 열람
    });

    it("requester 면 view 가능(쓰기는 불가)", () => {
      const r = evaluate(makeViewer("general", REQUESTER_ID), makeContract());
      expect(r.canView).toBe(true);
      expect(r.canEdit).toBe(false);
      expect(r.canAssign).toBe(false);
      expect(r.canTransition).toBe(false);
      expect(r.canDelete).toBe(false);
      // requester 는 owner/creator 가 아니므로 비특권 → 마스킹
      expect(r.maskSecret).toBe(true);
    });

    it("cc 에 포함된 general 은 canView=true(본인 관련)", () => {
      const r = evaluate(makeViewer("general", CC_USER_ID), makeContract());
      expect(r.canView).toBe(true);
      expect(r.maskSecret).toBe(true); // cc 는 비특권
    });

    it("무관한 general 은 view 부터 false → 전부 false", () => {
      const r = evaluate(makeViewer("general", "stranger"), makeContract());
      expect(r.canView).toBe(false);
      expect(r.canEdit).toBe(false);
      expect(r.canAssign).toBe(false);
      expect(r.canTransition).toBe(false);
      expect(r.canDelete).toBe(false);
      expect(r.maskSecret).toBe(true);
    });
  });

  describe("sealManager (signing 단계 계약만, signing→signed 전이만)", () => {
    it("status 가 signing 이면 canView=true·canTransition=true", () => {
      const r = evaluate(
        makeViewer("sealManager", "seal-1"),
        makeContract({ status: "signing" }),
      );
      expect(r.canView).toBe(true);
      expect(r.canTransition).toBe(true);
      expect(r.canEdit).toBe(false);
      expect(r.canAssign).toBe(false);
      expect(r.canDelete).toBe(false);
      expect(r.maskSecret).toBe(true); // 비특권
    });

    it("status 가 signing 이 아니면 canView=false·canTransition=false", () => {
      const r = evaluate(
        makeViewer("sealManager", "seal-1"),
        makeContract({ status: "legalReview" }),
      );
      expect(r.canView).toBe(false);
      expect(r.canTransition).toBe(false);
    });
  });

  describe("canAssign 데드락 면제 (미배정 ownerId===null 첫 배정)", () => {
    // 미배정 계약: ownerId=null. requiresOwner 면제는 canAssign 한정.
    const unassigned = (over: Partial<AuthzContract> = {}) =>
      makeContract({ ownerId: null, status: "unassigned", ...over });

    it("미배정 건에서 inHouseCounsel(비담당)도 canAssign=true (데드락 해소)", () => {
      const r = evaluate(makeViewer("inHouseCounsel", "other-1"), unassigned());
      expect(r.canAssign).toBe(true);
    });

    it("미배정 건에서 contractManager(비담당)도 canAssign=true", () => {
      const r = evaluate(makeViewer("contractManager", "other-1"), unassigned());
      expect(r.canAssign).toBe(true);
    });

    it("미배정 건에서 inHouseCounsel(admin 매핑 포함) canAssign=true", () => {
      // admin 은 loadViewer 에서 inHouseCounsel 로 매핑되므로 동일 케이스.
      const r = evaluate(makeViewer("inHouseCounsel", "other-1"), unassigned());
      expect(r.canAssign).toBe(true);
    });

    it("미배정 건에서 canAssign 면제는 edit/transition 으로 번지지 않는다(과확대 없음)", () => {
      // inHouseCounsel 비담당: canEdit/canTransition 은 ownerOk 기반이라 여전히 false.
      const r = evaluate(makeViewer("inHouseCounsel", "other-1"), unassigned());
      expect(r.canEdit).toBe(false);
      expect(r.canTransition).toBe(false);
      expect(r.canDelete).toBe(false);
    });

    it("이미 배정된 건(ownerId!=null)에서 비담당 inHouseCounsel 은 canAssign=false (과확대 없음)", () => {
      const r = evaluate(
        makeViewer("inHouseCounsel", "other-1"),
        makeContract({ ownerId: "someone-else" }),
      );
      expect(r.canAssign).toBe(false);
      // edit/transition 도 불변(미배정 면제와 무관).
      expect(r.canEdit).toBe(false);
      expect(r.canTransition).toBe(false);
    });

    it("미배정이라도 policy.assign=false 역할은 canAssign=false (outsideCounsel)", () => {
      const r = evaluate(makeViewer("outsideCounsel", "other-1"), unassigned());
      expect(r.canAssign).toBe(false);
    });

    it("미배정이라도 policy.assign=false 역할은 canAssign=false (general — canView 통과 케이스)", () => {
      // creator 라 canView=true 이지만 general 은 policy.assign=false → canAssign=false.
      const r = evaluate(
        makeViewer("general", CREATOR_ID),
        unassigned({ createdById: CREATOR_ID }),
      );
      expect(r.canView).toBe(true);
      expect(r.canAssign).toBe(false);
    });

    it("미배정이라도 policy.assign=false 역할은 canAssign=false (sealManager, signing 단계)", () => {
      const r = evaluate(
        makeViewer("sealManager", "seal-1"),
        unassigned({ status: "signing" }),
      );
      expect(r.canAssign).toBe(false);
    });
  });

  describe("canEdit 미배정 생성자 완화 (create 직후 파일 반영 PATCH 를 위한 예외)", () => {
    // 미배정 계약: ownerId=null. 완화는 "생성자 본인 + 아직 미배정"일 때만 canEdit 한정.
    const unassigned = (over: Partial<AuthzContract> = {}) =>
      makeContract({ ownerId: null, status: "unassigned", ...over });

    it("생성자 + 미배정 → canEdit=true", () => {
      const r = evaluate(
        makeViewer("inHouseCounsel", CREATOR_ID),
        unassigned({ createdById: CREATOR_ID }),
      );
      expect(r.canEdit).toBe(true);
    });

    it("생성자라도 이미 타인에게 배정된 건 → canEdit=false (완화는 미배정 한정)", () => {
      const r = evaluate(
        makeViewer("inHouseCounsel", CREATOR_ID),
        makeContract({ createdById: CREATOR_ID, ownerId: "someone-else" }),
      );
      expect(r.canEdit).toBe(false);
    });

    it("생성자가 아닌 비담당자는 미배정 건이라도 canEdit=false", () => {
      const r = evaluate(
        makeViewer("inHouseCounsel", "other-1"),
        unassigned({ createdById: CREATOR_ID }),
      );
      expect(r.canEdit).toBe(false);
    });

    it("담당자가 배정되는 순간 생성자 본인이라도 원래 규칙(담당자만)으로 돌아간다", () => {
      const r = evaluate(
        makeViewer("inHouseCounsel", CREATOR_ID),
        makeContract({ createdById: CREATOR_ID, ownerId: "the-assigned-owner" }),
      );
      expect(r.canEdit).toBe(false);
    });

    it("이 완화는 canEdit 에만 적용되고 canAssign/canTransition/canDelete 는 그대로다(과확대 없음)", () => {
      const r = evaluate(
        makeViewer("inHouseCounsel", CREATOR_ID),
        unassigned({ createdById: CREATOR_ID }),
      );
      expect(r.canEdit).toBe(true);
      // canAssign 은 이미 "미배정이면 아무 담당 역할이나 가능"이라 true 인 게 정상(기존 완화) —
      // 여기서 확인하려는 건 canTransition/canDelete 가 이번 변경으로 새로 true 가 되지 않았는지다.
      expect(r.canTransition).toBe(false);
      expect(r.canDelete).toBe(false);
    });

    it("edit 권한이 아예 없는 역할(general)은 생성자 + 미배정이어도 canEdit=false", () => {
      const r = evaluate(
        makeViewer("general", CREATOR_ID),
        unassigned({ createdById: CREATOR_ID }),
      );
      expect(r.canEdit).toBe(false);
    });

    it("outsideCounsel 은 미배정 건을 애초에 볼 수 없어(view=owned) canEdit 완화가 무의미하다", () => {
      const r = evaluate(
        makeViewer("outsideCounsel", CREATOR_ID),
        unassigned({ createdById: CREATOR_ID }),
      );
      expect(r.canView).toBe(false);
      expect(r.canEdit).toBe(false);
    });
  });

  describe("null viewer (비인증/미상)", () => {
    it("전부 false + maskSecret=true (안전 기본)", () => {
      const r = evaluate(null, makeContract());
      expect(r).toEqual({
        canView: false,
        canEdit: false,
        canAssign: false,
        canTransition: false,
        canDelete: false,
        maskSecret: true,
      });
    });
  });

  describe("listRelatedUserIds (멘션 대상 관련자 목록)", () => {
    it("createdById/ownerId/requesterId/ccUserIds 를 모두 모아 반환한다", () => {
      const ids = listRelatedUserIds(makeContract());
      expect(ids).toEqual(
        expect.arrayContaining([
          CREATOR_ID,
          OWNER_ID,
          REQUESTER_ID,
          CC_USER_ID,
        ]),
      );
      expect(ids).toHaveLength(4);
    });

    it("중복(같은 사람이 여러 역할)을 dedupe 한다", () => {
      const ids = listRelatedUserIds(
        makeContract({
          createdById: "same-1",
          ownerId: "same-1",
          requesterId: "same-1",
          ccUserIds: ["same-1", "cc-2"],
        }),
      );
      // same-1 은 1번만, cc-2 1번 → 2개.
      expect(ids).toHaveLength(2);
      expect(new Set(ids)).toEqual(new Set(["same-1", "cc-2"]));
    });

    it("null/undefined(ownerId/requesterId 미배정)는 제외한다", () => {
      const ids = listRelatedUserIds(
        makeContract({
          ownerId: null,
          requesterId: null,
          ccUserIds: [],
        }),
      );
      expect(ids).toEqual([CREATOR_ID]);
    });

    it("ccUserIds 가 undefined 여도 안전하게 처리한다", () => {
      const ids = listRelatedUserIds(
        makeContract({ ccUserIds: undefined as unknown as string[] }),
      );
      expect(ids).toEqual(
        expect.arrayContaining([CREATOR_ID, OWNER_ID, REQUESTER_ID]),
      );
      expect(ids).toHaveLength(3);
    });
  });

  describe("maskSecret 산출 매트릭스", () => {
    it("특권 역할(inHouseCounsel/contractManager)은 maskSecret=false (admin은 inHouseCounsel로 매핑)", () => {
      const privilegedRoles: TenantRole[] = [
        "inHouseCounsel",
        "contractManager",
      ];
      for (const role of privilegedRoles) {
        const r = evaluate(makeViewer(role, "anyone"), makeContract());
        expect(r.maskSecret).toBe(false);
      }
    });

    it("owner/creator 는 역할 무관하게 maskSecret=false", () => {
      expect(
        evaluate(makeViewer("general", OWNER_ID), makeContract()).maskSecret,
      ).toBe(false);
      expect(
        evaluate(makeViewer("general", CREATOR_ID), makeContract()).maskSecret,
      ).toBe(false);
    });

    it("그 외(비특권·비owner·비creator)는 maskSecret=true", () => {
      // outsideCounsel 미배정, general 무관, sealManager 비특권
      expect(
        evaluate(makeViewer("general", REQUESTER_ID), makeContract())
          .maskSecret,
      ).toBe(true);
      expect(
        evaluate(makeViewer("outsideCounsel", "other"), makeContract())
          .maskSecret,
      ).toBe(true);
      expect(
        evaluate(
          makeViewer("sealManager", "seal-1"),
          makeContract({ status: "signing" }),
        ).maskSecret,
      ).toBe(true);
    });
  });
});
