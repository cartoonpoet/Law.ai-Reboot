import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantMembersController } from "./tenant-members.controller";

@Module({
  controllers: [TenantMembersController],
  providers: [JwtAuthGuard],
})
export class TenantsGatewayModule {}
