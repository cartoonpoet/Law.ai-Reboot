import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { isAllowedOrigin } from "./cors";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // 문서 편집기 DOCX 업로드(원본 20MB → base64 약 27MB)를 express 기본 body 제한(100kb)이 막지 않도록 늘린다.
  app.useBodyParser("json", { limit: "30mb" });
  app.use(
    helmet({
      // Swagger UI(인라인 스타일/스크립트)가 동작하도록 dev에서는 CSP를 끈다.
      contentSecurityPolicy: false,
    }),
  );
  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin ?? "<none>"}`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Law.ai API")
    .setDescription("법무 워크스페이스 API 게이트웨이")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.GATEWAY_PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`api-gateway listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
