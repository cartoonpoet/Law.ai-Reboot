import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";

const clients = ClientsModule.register([
  {
    name: "AUTH_CLIENT",
    transport: Transport.TCP,
    options: {
      host: process.env.AUTH_SERVICE_HOST ?? "localhost",
      port: Number(process.env.AUTH_SERVICE_PORT ?? 4001),
    },
  },
  {
    name: "USER_CLIENT",
    transport: Transport.TCP,
    options: {
      host: process.env.USER_SERVICE_HOST ?? "localhost",
      port: Number(process.env.USER_SERVICE_PORT ?? 4002),
    },
  },
]);

@Global()
@Module({
  imports: [clients],
  exports: [clients],
})
export class GatewayClientsModule {}
