import { Module } from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { AuditService } from "./contracts.audit";
import { FilesModule } from "../files/files.module";

@Module({
  controllers: [ContractsController],
  // authz(contracts.authz)는 순수 함수 모듈이라 provider 불필요(import 만).
  // FilesModule 은 R2Client(파일 GC) 사용을 위해 import.
  imports: [FilesModule],
  providers: [ContractsService, AuditService],
})
export class ContractsModule {}
