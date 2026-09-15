import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  ADMIN_PATTERNS,
  type AdminAuditListRequest,
  type AdminAuditListResponse,
  type AdminStatsResponse,
  type AdminTenantDetailRequest,
  type AdminTenantDetailResponse,
  type AdminTenantListItem,
  type AdminTenantListResponse,
  type AdminTenantUpdateRequest,
  type AdminDeletedContractListResponse,
  type AdminRestoreContractRequest,
  type AdminRestoreContractResult,
} from "@lawai/contracts";
import { AdminService } from "./admin.service";

@Controller()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @MessagePattern(ADMIN_PATTERNS.GET_STATS)
  getStats(): Promise<AdminStatsResponse> {
    return this.admin.getStats();
  }

  @MessagePattern(ADMIN_PATTERNS.GET_AUDIT)
  getAudit(
    @Payload() req: AdminAuditListRequest,
  ): Promise<AdminAuditListResponse> {
    return this.admin.getRecentAudit(req.limit);
  }

  @MessagePattern(ADMIN_PATTERNS.LIST_TENANTS)
  listTenants(): Promise<AdminTenantListResponse> {
    return this.admin.listTenants();
  }

  @MessagePattern(ADMIN_PATTERNS.GET_TENANT)
  getTenant(
    @Payload() req: AdminTenantDetailRequest,
  ): Promise<AdminTenantDetailResponse> {
    return this.admin.getTenant(req.tenantId);
  }

  @MessagePattern(ADMIN_PATTERNS.UPDATE_TENANT)
  updateTenant(
    @Payload() req: AdminTenantUpdateRequest & { actorId: string },
  ): Promise<AdminTenantListItem> {
    return this.admin.updateTenant(req);
  }

  @MessagePattern(ADMIN_PATTERNS.LIST_DELETED_CONTRACTS)
  listDeletedContracts(): Promise<AdminDeletedContractListResponse> {
    return this.admin.listDeletedContracts();
  }

  @MessagePattern(ADMIN_PATTERNS.RESTORE_CONTRACT)
  restoreContract(
    @Payload() req: AdminRestoreContractRequest,
  ): Promise<AdminRestoreContractResult> {
    return this.admin.restoreContract(req);
  }
}
