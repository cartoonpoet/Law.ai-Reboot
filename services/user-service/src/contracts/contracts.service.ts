// 계약 도메인 공개 진입점(facade). 컨트롤러가 쓰는 12개 메서드를 그대로 두고, 실제 일은
// 변경 이유별로 나뉜 서비스에 위임한다.
//  - ContractQueryService     : get, list (읽기)
//  - ContractCommandService   : create, update, remove (작성·수정·삭제)
//  - ContractLifecycleService : updateStatus, submitApproval, completeSigning, finalizeRegistration,
//                               replaceSignedFile, terminate (상태·체결 흐름)
//  - ContractAiTriggers       : analyzeRenewalTerms (AI 백그라운드 분석)
import { Injectable } from "@nestjs/common";
import type {
  AnalyzeRenewalTermsRequest,
  CompleteSigningRequest,
  CompleteSigningResult,
  ContractResponse,
  CreateContractRequest,
  DeleteContractRequest,
  DeleteContractResult,
  FinalizeRegistrationRequest,
  FinalizeRegistrationResult,
  GetContractRequest,
  ListContractsRequest,
  ListContractsResponse,
  ReplaceSignedFileRequest,
  ReplaceSignedFileResult,
  SubmitContractApprovalRequest,
  SubmitContractApprovalResult,
  TerminateContractRequest,
  TerminateContractResult,
  UpdateContractRequest,
  UpdateContractStatusRequest,
} from "@lawai/contracts";
import { ContractAiTriggers } from "./contract-ai-triggers";
import { ContractCommandService } from "./contract-command.service";
import { ContractLifecycleService } from "./contract-lifecycle.service";
import { ContractQueryService } from "./contract-query.service";

@Injectable()
export class ContractsService {
  constructor(
    private readonly query: ContractQueryService,
    private readonly command: ContractCommandService,
    private readonly lifecycle: ContractLifecycleService,
    private readonly aiTriggers: ContractAiTriggers,
  ) {}

  create(req: CreateContractRequest): Promise<ContractResponse> {
    return this.command.create(req);
  }

  get(req: GetContractRequest): Promise<ContractResponse> {
    return this.query.get(req);
  }

  list(req: ListContractsRequest): Promise<ListContractsResponse> {
    return this.query.list(req);
  }

  update(req: UpdateContractRequest): Promise<ContractResponse> {
    return this.command.update(req);
  }

  /** 체결 품의 상신 — 결재 라인 생성 후 signing 으로 전이. */
  submitApproval(req: SubmitContractApprovalRequest): Promise<SubmitContractApprovalResult> {
    return this.lifecycle.submitApproval(req);
  }

  /** 체결 처리 — 결재 전원 승인된 signing 계약을 signed 로 확정. */
  completeSigning(req: CompleteSigningRequest): Promise<CompleteSigningResult> {
    return this.lifecycle.completeSigning(req);
  }

  /** 계약 삭제(소프트 삭제). */
  remove(req: DeleteContractRequest): Promise<DeleteContractResult> {
    return this.command.remove(req);
  }

  /** 서명본 교체 — 체결된 계약의 서명본을 새 파일로 바꾼다. */
  replaceSignedFile(req: ReplaceSignedFileRequest): Promise<ReplaceSignedFileResult> {
    return this.lifecycle.replaceSignedFile(req);
  }

  /** 만료 관리 "AI로 읽기". */
  analyzeRenewalTerms(req: AnalyzeRenewalTermsRequest): Promise<{ ok: true }> {
    return this.aiTriggers.analyzeRenewalTerms(req);
  }

  /** 중도 해지. */
  terminate(req: TerminateContractRequest): Promise<TerminateContractResult> {
    return this.lifecycle.terminate(req);
  }

  /** 체결 완료 등록(registerAs=signed) 확정. */
  finalizeRegistration(req: FinalizeRegistrationRequest): Promise<FinalizeRegistrationResult> {
    return this.lifecycle.finalizeRegistration(req);
  }

  updateStatus(req: UpdateContractStatusRequest): Promise<ContractResponse> {
    return this.lifecycle.updateStatus(req);
  }
}
