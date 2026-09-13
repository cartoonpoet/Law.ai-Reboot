import { Module, OnModuleInit } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiProviderRegistry } from "./providers/provider";
import { OpenAiProvider } from "./providers/openai.provider";

@Module({
  controllers: [AiController],
  providers: [AiProviderRegistry],
})
export class AiModule implements OnModuleInit {
  constructor(private readonly registry: AiProviderRegistry) {}

  onModuleInit(): void {
    this.registry.register(new OpenAiProvider());
  }
}
