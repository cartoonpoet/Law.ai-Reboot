import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { AdminController } from "./admin.controller";

@Module({
  controllers: [AdminController],
  // 가드는 라우트 데코레이터에서 사용 — DI 위해 provide.
  providers: [JwtAuthGuard, AdminRoleGuard],
})
export class AdminModule {}
