import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";

// 문서 업로드(DOCX 들여오기, 원본 20MB → base64 약 27MB) 전용 body 크기 제한(30mb)은
// 이 컨트롤러의 "documents" 경로에만 적용되도록 main.ts의 bootstrap()에서 순서를 통제해
// 등록한다. Nest의 자동 기본 body-parser가 NestModule.configure() 기반 미들웨어보다
// 항상 먼저 실행돼 이 모듈에서 직접 forRoutes로 걸어도 소용없기 때문이다(main.ts 주석 참고).
@Module({ controllers: [DocumentsController] })
export class DocumentsModule {}
