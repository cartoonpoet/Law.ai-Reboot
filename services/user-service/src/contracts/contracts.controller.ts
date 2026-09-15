import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CONTRACT_PATTERNS, NOTIFICATION_PATTERNS } from "@lawai/contracts";
import type {
  CreateContractRequest,
  GetContractRequest,
  ListContractsRequest,
  SubmitContractApprovalRequest,
  UpdateContractRequest,
  UpdateContractStatusRequest,
  CompleteSigningRequest,
  FinalizeRegistrationRequest,
  ReplaceSignedFileRequest,
  DeleteContractRequest,
  TerminateContractRequest,
  AnalyzeRenewalTermsRequest,
  RunContractExpiryAlertsResult,
} from "@lawai/contracts";
import { ContractsService } from "./contracts.service";
import { PublicStatsService } from "./public-stats.service";
import { ContractExpiryNotifier } from "./contract-expiry.notifier";

@Controller()
export class ContractsController {
  constructor(
    private readonly contracts: ContractsService,
    private readonly publicStats: PublicStatsService,
    private readonly expiryNotifier: ContractExpiryNotifier,
  ) {}

  // 게이트웨이 스케줄러가 매일(+기동 시) 부른다 — 만든 알림을 돌려주면 게이트웨이가 실시간으로 밀어준다.
  @MessagePattern(NOTIFICATION_PATTERNS.RUN_CONTRACT_EXPIRY_ALERTS)
  async runContractExpiryAlerts(): Promise<RunContractExpiryAlertsResult> {
    return { notifications: await this.expiryNotifier.notifyExpiring(new Date()) };
  }

  @MessagePattern(CONTRACT_PATTERNS.PUBLIC_STATS)
  getPublicStats() {
    return this.publicStats.get();
  }

  @MessagePattern(CONTRACT_PATTERNS.CREATE)
  create(@Payload() req: CreateContractRequest) {
    return this.contracts.create(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.GET)
  get(@Payload() req: GetContractRequest) {
    return this.contracts.get(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.LIST)
  list(@Payload() req: ListContractsRequest) {
    return this.contracts.list(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.UPDATE)
  update(@Payload() req: UpdateContractRequest) {
    return this.contracts.update(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.SUBMIT_APPROVAL)
  submitApproval(@Payload() req: SubmitContractApprovalRequest) {
    return this.contracts.submitApproval(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.UPDATE_STATUS)
  updateStatus(@Payload() req: UpdateContractStatusRequest) {
    return this.contracts.updateStatus(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.COMPLETE_SIGNING)
  completeSigning(@Payload() req: CompleteSigningRequest) {
    return this.contracts.completeSigning(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.FINALIZE_REGISTRATION)
  finalizeRegistration(@Payload() req: FinalizeRegistrationRequest) {
    return this.contracts.finalizeRegistration(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.REPLACE_SIGNED_FILE)
  replaceSignedFile(@Payload() req: ReplaceSignedFileRequest) {
    return this.contracts.replaceSignedFile(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.ANALYZE_RENEWAL_TERMS)
  analyzeRenewalTerms(@Payload() req: AnalyzeRenewalTermsRequest) {
    return this.contracts.analyzeRenewalTerms(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.TERMINATE)
  terminate(@Payload() req: TerminateContractRequest) {
    return this.contracts.terminate(req);
  }

  @MessagePattern(CONTRACT_PATTERNS.DELETE)
  remove(@Payload() req: DeleteContractRequest) {
    return this.contracts.remove(req);
  }
}
