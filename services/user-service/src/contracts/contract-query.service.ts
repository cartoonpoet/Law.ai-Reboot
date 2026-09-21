// 계약 조회(읽기 전용): 상세(get)와 목록(list).
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  ContractResponse,
  ContractStatus,
  GetContractRequest,
  ListContractsRequest,
  ListContractsResponse,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { ApprovalsService } from "../approvals/approvals.service";
import { tenantScope } from "../common/tenant-scope";
import { AuditService } from "./contracts.audit";
import { evaluate } from "./contracts.authz";
import { ALLOWED_TRANSITIONS } from "./contract-transitions";
import { buildListWhere } from "./contract-list-filters";
import { loadViewer } from "./contract-loaders";
import {
  contractInclude,
  maskCompany,
  toAuthzContract,
  toContractSummary,
  toResponse,
} from "./contract.mapper";

@Injectable()
export class ContractQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly approvals: ApprovalsService,
  ) {}

  async get(req: GetContractRequest): Promise<ContractResponse> {
    const ctx = req.tenantContext!;
    const row = await this.prisma.contract.findFirst({
      // 삭제된 계약도 읽는다 — 알림·결재함 링크로 들어온 사람에게 "삭제됨"을 알려주기 위해서.
      where: { id: req.id, ...tenantScope(ctx) },
      include: contractInclude,
    });
    if (!row) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    // 권한 평가는 중앙 authz 모듈(evaluate) 단일 출처로 구동(이중 판정 금지).
    const viewer = await loadViewer(this.prisma, req.viewerId, ctx);
    const authz = evaluate(viewer, toAuthzContract(row));

    // 비관련 계약 접근은 존재를 노출하지 않도록 404(general 본인무관·outsideCounsel 미배정 등).
    // admin/법무팀은 canView=true 라 영향 없음.
    if (!authz.canView) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    // 볼 권한이 있던 사람에게만 삭제 사실을 알린다(권한 없는 사람은 위에서 일반 404).
    if (row.deletedAt) {
      throw new RpcException({ status: 404, message: "삭제된 계약입니다" });
    }

    // 결재 라인은 결재 모듈에서 폴리모픽 조회(활성 = 최신 라인).
    const active = await this.approvals.getActive("contract", row.id);
    const response = toResponse(row, active.line);

    // 마스킹: evaluate.maskSecret 결과로만 비밀참조 숨김 + 상대회사 PII 마스킹.
    if (authz.maskSecret) {
      response.references = response.references.filter((r) => !r.isSecret);
      response.counterparties = response.counterparties.map((cp) => ({
        ...cp,
        snapshot: maskCompany(cp.snapshot),
      }));
    }

    // 조회자별 수행 가능 액션을 응답에 부착(프론트 버튼 파생).
    response.can = {
      edit: authz.canEdit,
      assign: authz.canAssign,
      transition: authz.canTransition,
      // 시스템 관리자 전권은 evaluate 에 드러나지 않으므로 여기서 더한다(remove() 와 같은 규칙 — 체결 결재 중 불가).
      delete: authz.canDelete || (Boolean(ctx.isSystemAdmin) && row.status !== "signing"),
      replaceSignedFile: authz.canReplaceSignedFile,
    };

    // view 감사: top/secure 보안등급 열람만 기록(normal 은 기록하지 않음).
    if (row.securityLevel !== "normal" && viewer) {
      await this.audit.record({
        action: "view",
        targetType: "Contract",
        targetId: row.id,
        actorId: viewer.id,
        tenantId: row.tenantId,
        detail: { securityLevel: row.securityLevel },
      });
    }

    return response;
  }

  async list(req: ListContractsRequest): Promise<ListContractsResponse> {
    const ctx = req.tenantContext!;
    const page = Math.max(1, req.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, req.pageSize ?? 20));
    const { where, countWhere } = buildListWhere(req, ctx);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        include: {
          requester: { select: { name: true } },
          owner: { select: { name: true } },
          counterparties: { take: 1, orderBy: { createdAt: "asc" } },
        },
        // 만료 관리는 만료가 가까운 순(같은 날이면 최근 수정 순), 그 외는 최근 수정 순.
        orderBy:
          req.sort === "periodEnd"
            ? [{ periodEnd: "asc" }, { updatedAt: "desc" }]
            : [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contract.count({ where }),
    ]);
    // 그룹 탭 건수 — 목록과 조건이 달라(상태 제외) 따로 센다.
    const grouped = await this.prisma.contract.groupBy({
      by: ["status"],
      where: countWhere,
      _count: { _all: true },
    });
    const counts = Object.fromEntries(
      Object.keys(ALLOWED_TRANSITIONS).map((status) => [status, 0]),
    ) as Record<ContractStatus, number>;
    grouped.forEach((group) => {
      counts[group.status] = group._count._all;
    });

    return { items: rows.map(toContractSummary), total, page, pageSize, counts };
  }
}
