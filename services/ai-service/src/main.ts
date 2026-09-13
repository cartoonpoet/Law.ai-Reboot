import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const port = Number(process.env.AI_SERVICE_PORT ?? 4003);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    { transport: Transport.TCP, options: { host: "0.0.0.0", port } },
  );
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen();
  // eslint-disable-next-line no-console
  console.log(`ai-service listening on TCP :${port}`);
}
bootstrap();
