// 계약 흐름에서 AI 분석을 백그라운드로 띄우는 곳. 전부 fire-and-forget(await 하지 않음) —
// AiAnalysisService.trigger 는 어떤 경우에도 reject 하지 않고, 본문 추출기는 실패해도 null 이다.
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  AnalyzeRenewalTermsRequest,
  ApprovalLineDto,
  ContractResponse,
  ContractStatus,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { AiAnalysisService } from "../ai-analysis/ai-analysis.service";
import { ContractTextExtractor } from "../ai-analysis/contract-text.extractor";
import {
  buildApprovalBriefingPayload,
  buildPrecheckPayload,
  buildRenewalTermsPayload,
  buildRiskPayload,
  buildSubmitBriefingPayload,
} from "../ai-analysis/prompt-payloads";
import { evaluate } from "./contracts.authz";
import { TERMINABLE_STATUSES } from "./contract-transitions";
import { ensureContractExists, loadViewer } from "./contract-loaders";
import { toAuthzContract, toResponse } from "./contract.mapper";

// 계약서 본문을 함께 넘기는 AI 분석 종류 → 입력 페이로드 빌더.
export const CONTRACT_TEXT_PAYLOAD_BUILDERS = {
  precheck: buildPrecheckPayload,
  risk: buildRiskPayload,
  renewalTerms: buildRenewalTermsPayload,
} as const;
export type ContractTextAnalysisKind = keyof typeof CONTRACT_TEXT_PAYLOAD_BUILDERS;

@Injectable()
export class ContractAiTriggers {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAnalysis: AiAnalysisService,
    private readonly contractText: ContractTextExtractor,
  ) {}

  // 계약서 원본 파일에서 본문을 뽑아 넣고 AI 분석을 트리거한다. 파일 다운로드·추출이 요청 응답을 붙잡지 않게
  // 전부 백그라운드(await 하지 않음) — 추출기는 실패해도 null, trigger 는 어떤 경우에도 reject 하지 않는다.
  triggerWithContractText(params: {
    kind: ContractTextAnalysisKind;
    contract: ContractResponse;
    tenantId: string;
    triggeredByUserId: string;
  }): void {
    const { kind, contract, tenantId, triggeredByUserId } = params;
    // 스캔 PDF 는 분석을 요청한 사람의 AI 연동으로 읽는다(그 연동으로 비용 청구).
    void this.contractText
      .extract(contract.files, { ocrUserId: triggeredByUserId })
      .catch(() => null)
      .then((fileText) =>
        this.aiAnalysis.trigger({
          targetType: "contract",
          targetId: contract.id,
          kind,
          tenantId,
          triggeredByUserId,
          payload: CONTRACT_TEXT_PAYLOAD_BUILDERS[kind](contract, fileText),
        }),
      );
  }

  // reviewDone 진입: 상신 전 결재자용 요약(submitBriefing).
  triggerSubmitBriefing(contract: ContractResponse, tenantId: string, triggeredByUserId: string): void {
    void this.aiAnalysis.trigger({
      targetType: "contract",
      targetId: contract.id,
      kind: "submitBriefing",
      tenantId,
      triggeredByUserId,
      payload: buildSubmitBriefingPayload(contract),
    });
  }

  // 상신 성공 후 결재자용 브리핑(approvalBriefing).
  triggerApprovalBriefing(
    contract: ContractResponse,
    line: ApprovalLineDto | null,
    tenantId: string,
    triggeredByUserId: string,
  ): void {
    void this.aiAnalysis.trigger({
      targetType: "contract",
      targetId: contract.id,
      kind: "approvalBriefing",
      tenantId,
      triggeredByUserId,
      payload: buildApprovalBriefingPayload(contract, line),
    });
  }

  /** 만료 관리 "AI로 읽기" — 체결 완료·계약 이행 계약의 자동갱신·해지 통지 조항을 누른 사람의 AI 연동으로 추출한다. */
  async analyzeRenewalTerms(req: AnalyzeRenewalTermsRequest): Promise<{ ok: true }> {
    const ctx = req.tenantContext!;
    const row = await ensureContractExists(this.prisma, req.contractId, ctx);
    const viewer = await loadViewer(this.prisma, req.viewerId, ctx);
    // 볼 수 없는 계약은 있는지도 알리지 않는다(get 과 같은 규칙).
    if (!evaluate(viewer, toAuthzContract(row)).canView) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    if (!TERMINABLE_STATUSES.includes(row.status as ContractStatus)) {
      throw new RpcException({ status: 400, message: "체결 완료·계약 이행 중인 계약만 읽을 수 있습니다" });
    }
    this.triggerWithContractText({
      kind: "renewalTerms",
      contract: toResponse(row),
      tenantId: row.tenantId,
      triggeredByUserId: req.viewerId,
    });
    return { ok: true };
  }
}
