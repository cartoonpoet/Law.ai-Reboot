import { Module } from "@nestjs/common";
import { SupportController } from "./support.controller";
import { SupportAdminController } from "./support-admin.controller";

// NotificationHubService(SSE)는 전역 NotificationHubModule 이 제공한다.
@Module({ controllers: [SupportController, SupportAdminController] })
export class SupportModule {}
