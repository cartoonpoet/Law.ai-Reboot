import { Module } from "@nestjs/common";
import { AdvicesController } from "./advices.controller";
import { AdvicesService } from "./advices.service";

@Module({
  controllers: [AdvicesController],
  providers: [AdvicesService],
})
export class AdvicesModule {}
