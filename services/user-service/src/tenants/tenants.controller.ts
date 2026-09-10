import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_PATTERNS } from "@lawai/contracts";
import type { CreateTenantRpcRequest, FindMembershipsRequest, ListTenantMembersRequest } from "@lawai/contracts";
import { TenantsService } from "./tenants.service";

@Controller()
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @MessagePattern(USER_PATTERNS.FIND_MEMBERSHIPS)
  findMemberships(@Payload() req: FindMembershipsRequest) {
    return this.tenants.findMemberships(req);
  }

  @MessagePattern(USER_PATTERNS.CREATE_TENANT)
  createTenant(@Payload() req: CreateTenantRpcRequest) {
    return this.tenants.createTenant(req);
  }

  @MessagePattern(USER_PATTERNS.LIST_TENANT_MEMBERS)
  listMembers(@Payload() req: ListTenantMembersRequest) {
    return this.tenants.listMembers(req);
  }
}
