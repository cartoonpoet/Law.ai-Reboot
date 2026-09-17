import { Module } from "@nestjs/common";
import { AdvicesController } from "./advices.controller";

@Module({ controllers: [AdvicesController] })
export class AdvicesModule {}
