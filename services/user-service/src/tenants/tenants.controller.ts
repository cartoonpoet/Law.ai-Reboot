import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_PATTERNS } from "@lawai/contracts";
import type { FindMembershipsRequest } from "@lawai/contracts";
import { TenantsService } from "./tenants.service";

@Controller()
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @MessagePattern(USER_PATTERNS.FIND_MEMBERSHIPS)
  findMemberships(@Payload() req: FindMembershipsRequest) {
    return this.tenants.findMemberships(req);
  }
}
