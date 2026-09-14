import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AssistantController } from "./assistant.controller";

@Module({ controllers: [AiController, AssistantController] })
export class AiModule {}
