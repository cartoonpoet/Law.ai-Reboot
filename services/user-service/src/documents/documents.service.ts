import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import * as mammoth from "mammoth";
import type {
  ExportDocumentRequest,
  ExportDocumentResponse,
  ImportDocumentRequest,
  ImportDocumentResponse,
  TenantContext,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { tiptapJsonToDocx } from "./tiptap-to-docx";

const MAX_IMPORT_SIZE_BYTES = 20 * 1024 * 1024; // 20MB — 업로드 훨씬 넘는 이상 파일 방지.

/** 문서 편집기 — Tiptap JSON을 진짜 .docx 로 내보내고(stateless), .docx 를 HTML로 들여온다. */
@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async export(req: ExportDocumentRequest): Promise<ExportDocumentResponse> {
    await this.requireMember(req.viewerId, req.tenantContext);
    const fileName = (req.fileName?.trim() || "문서").slice(0, 100);
    const buffer = await tiptapJsonToDocx(req.content);
    return {
      base64: buffer.toString("base64"),
      fileName: `${fileName}.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  async import(req: ImportDocumentRequest): Promise<ImportDocumentResponse> {
    await this.requireMember(req.viewerId, req.tenantContext);
    const buffer = Buffer.from(req.base64, "base64");
    if (buffer.byteLength === 0) throw new RpcException({ status: 400, message: "빈 파일입니다" });
    if (buffer.byteLength > MAX_IMPORT_SIZE_BYTES) throw new RpcException({ status: 400, message: "파일이 너무 큽니다(20MB 이하)" });

    try {
      const result = await mammoth.convertToHtml({ buffer });
      return { html: result.value, warnings: result.messages.map((message) => message.message) };
    } catch (error) {
      throw new RpcException({
        status: 400,
        message: `워드 파일을 읽지 못했어요: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      });
    }
  }

  protected async requireMember(viewerId: string, ctx: TenantContext): Promise<void> {
    if (ctx.isSystemAdmin) return;
    const membership = await this.prisma.userTenant.findFirst({ where: { userId: viewerId, tenantId: ctx.tenantId } });
    if (!membership) throw new RpcException({ status: 403, message: "회사 구성원만 이용할 수 있습니다" });
  }
}
