import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";

const clients = ClientsModule.register([
  {
    name: "AI_CLIENT",
    transport: Transport.TCP,
    options: {
      host: process.env.AI_SERVICE_HOST ?? "localhost",
      port: Number(process.env.AI_SERVICE_PORT ?? 4003),
    },
  },
]);

@Global()
@Module({
  imports: [clients],
  exports: [clients],
})
export class AiClientModule {}
