import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { isAllowedOrigin } from "./cors";

async function bootstrap() {
  // Nest가 자동으로 붙이는 기본 body-parser(json/urlencoded, express 기본 100kb 제한)는
  // NestFactory.create() 시점에 가장 먼저(동기적으로) 등록돼, 모듈 단위 미들웨어
  // (NestModule.configure())보다 항상 먼저 실행된다. 그래서 DocumentsModule에만 30mb
  // json 파서를 forRoutes로 걸어도 소용없다 — 그보다 먼저 도는 전역 기본 파서가 100kb 초과
  // 요청을 이미 막아버린다(경로 무관, 인증 가드보다도 먼저 실행됨).
  // 따라서 자동 기본 파서를 끄고(bodyParser: false), 아래에서 순서를 직접 통제한다:
  //  1) "/documents" 경로에만 30mb json 파서를 먼저 걸어 문서 편집기 DOCX 업로드
  //     (원본 20MB → base64 약 27MB)를 허용하고,
  //  2) 그 다음 나머지 모든 라우트에는 원래와 동일한 express 기본 제한(100kb)의
  //     json/urlencoded 파서를 건다. body-parser는 이미 파싱된 요청을 건너뛰므로
  //     (req._body) documents 라우트에서 두 번째 파서가 다시 파싱을 시도하지 않는다.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use("/documents", json({ limit: "30mb" }));
  app.use(json());
  app.use(urlencoded({ extended: true }));
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
