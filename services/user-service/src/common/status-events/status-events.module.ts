import { Global, Module } from "@nestjs/common";
import { StatusEventsService } from "./status-events.service";

/**
 * 상태 기록은 계약·자문 등 여러 도메인에서 쓰므로 전역으로 둔다.
 * (도메인마다 import 를 늘리지 않으려는 목적 — NotificationsModule 처럼 도메인 로직이 있는 모듈이 아니라
 *  write 헬퍼 하나뿐이라 전역이 적절하다.)
 */
@Global()
@Module({
  providers: [StatusEventsService],
  exports: [StatusEventsService],
})
export class StatusEventsModule {}
