import { Module } from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { AuditService } from "./contracts.audit";

@Module({
  controllers: [ContractsController],
  // authz(contracts.authz)는 순수 함수 모듈이라 provider 불필요(import 만).
  providers: [ContractsService, AuditService],
})
export class ContractsModule {}
