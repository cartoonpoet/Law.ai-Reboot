import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import * as mammoth from "mammoth";
import type {
  AiDraftRequest,
  AiDraftResponse,
  AiRewriteRequest,
  AiRewriteResponse,
  AiReviewRequest,
  AiReviewResponse,
  ExportDocumentRequest,
  ExportDocumentResponse,
  ImportDocumentRequest,
  ImportDocumentResponse,
  TenantContext,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { AiCredentialsService } from "../ai-credentials/ai-credentials.service";
import { AiServiceClient } from "../ai-credentials/ai-service.client";
import { tiptapJsonToDocx } from "./tiptap-to-docx";
import { parseDraftHtml, parseReviewJson, parseRewriteText } from "./document-ai-reply";

const MAX_IMPORT_SIZE_BYTES = 20 * 1024 * 1024; // 20MB — 업로드 훨씬 넘는 이상 파일 방지.

/** 문서 편집기 — Tiptap JSON을 진짜 .docx 로 내보내고(stateless), .docx 를 HTML로 들여오고, 로아이 AI 3종을 제공한다. */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: AiCredentialsService,
    private readonly aiClient: AiServiceClient,
  ) {}

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

  /** 초안 생성 — 빈 문서/새 템플릿에서 한 줄 요청으로 조항 구조를 갖춘 HTML을 만든다. */
  async aiDraft(req: AiDraftRequest): Promise<AiDraftResponse> {
    await this.requireMember(req.viewerId, req.tenantContext);
    const request = req.request?.trim();
    if (!request) throw new RpcException({ status: 400, message: "어떤 계약서를 쓸지 알려 주세요" });

    const credential = await this.credentials.getDecryptedKeyFor(req.viewerId);
    if (!credential) return { html: "", needsSetup: true };

    const system = [
      "당신은 한국 기업 법무팀의 계약서 초안 작성 도우미입니다.",
      "사용자 요청에 맞는 계약서 한 벌을 HTML로 만드세요.",
      "제목(h1), 전문(p), 조항 제목(h2, '제N조 (제목)' 형식), 조항 본문(p)으로 구성하세요.",
      "채워야 할 빈칸은 '[    ]' 형태로 남기세요.",
      "설명이나 코드펜스 없이 HTML 본문만 출력하세요.",
    ].join(" ");

    let content: string;
    try {
      ({ content } = await this.aiClient.chat({
        model: credential.model,
        apiKey: credential.apiKey,
        system,
        messages: [{ role: "user", content: request }],
      }));
    } catch (error) {
      throw new RpcException({ status: 502, message: `AI 응답을 받지 못했어요: ${this.getErrorMessage(error)}` });
    }

    const html = parseDraftHtml(content);
    if (!html) throw new RpcException({ status: 502, message: "AI가 유효한 초안을 만들지 못했어요" });
    return { html, needsSetup: false };
  }

  /** 선택 문장 다듬기/조항 작성 — 고른 구간만 지시문대로 바꾼다. */
  async aiRewrite(req: AiRewriteRequest): Promise<AiRewriteResponse> {
    await this.requireMember(req.viewerId, req.tenantContext);
    const selected = req.selectedText?.trim();
    const instruction = req.instruction?.trim();
    if (!selected || !instruction) throw new RpcException({ status: 400, message: "고친 문장과 지시문이 모두 필요합니다" });

    const credential = await this.credentials.getDecryptedKeyFor(req.viewerId);
    if (!credential) return { rewrittenText: "", needsSetup: true };

    const system = [
      "당신은 한국 기업 법무팀의 계약서 문장 교정 도우미입니다.",
      "사용자가 고른 문장(또는 메모)과 지시문을 받아 그 문장만 고쳐 쓰세요.",
      "다른 설명 없이 고친 문장 하나만, 따옴표나 코드펜스 없이 출력하세요.",
    ].join(" ");

    let content: string;
    try {
      ({ content } = await this.aiClient.chat({
        model: credential.model,
        apiKey: credential.apiKey,
        system,
        messages: [{ role: "user", content: `원문: ${selected}\n지시: ${instruction}` }],
      }));
    } catch (error) {
      throw new RpcException({ status: 502, message: `AI 응답을 받지 못했어요: ${this.getErrorMessage(error)}` });
    }

    const rewrittenText = parseRewriteText(content);
    if (!rewrittenText) throw new RpcException({ status: 502, message: "AI가 문장을 만들지 못했어요" });
    return { rewrittenText, needsSetup: false };
  }

  /** 초안 검토 — 문서 전체에서 위험 조항·빈칸·누락 조항을 찾아 구조화된 목록으로 돌려준다. */
  async aiReview(req: AiReviewRequest): Promise<AiReviewResponse> {
    await this.requireMember(req.viewerId, req.tenantContext);
    const html = req.html?.trim();
    if (!html) throw new RpcException({ status: 400, message: "검토할 문서 내용이 없습니다" });

    const credential = await this.credentials.getDecryptedKeyFor(req.viewerId);
    if (!credential) return { findings: [], needsSetup: true };

    const system = [
      "당신은 한국 기업 법무팀의 계약서 검토 도우미입니다.",
      "받은 계약서 HTML에서 회사에 불리한 위험 조항, 채워지지 않은 빈칸([   ] 형태), 표준 계약서에 흔히 있지만 빠진 조항을 찾으세요.",
      '오직 JSON 하나만 출력하세요: { "findings": [{ "severity": "danger"|"warning"|"info", "kind": "위험 조항"|"빈칸"|"누락 조항", "title": "한 줄 제목", "where": "몇 조인지", "note": "왜 문제고 어떻게 고칠지" }] }',
      "설명이나 코드펜스 없이 JSON만 출력하세요.",
    ].join(" ");

    let content: string;
    try {
      ({ content } = await this.aiClient.chat({
        model: credential.model,
        apiKey: credential.apiKey,
        system,
        messages: [{ role: "user", content: html }],
      }));
    } catch (error) {
      throw new RpcException({ status: 502, message: `AI 응답을 받지 못했어요: ${this.getErrorMessage(error)}` });
    }

    const findings = parseReviewJson(content);
    if (findings === null) throw new RpcException({ status: 502, message: "AI 검토 결과를 읽지 못했어요" });
    return { findings, needsSetup: false };
  }

  protected async requireMember(viewerId: string, ctx: TenantContext): Promise<void> {
    if (ctx.isSystemAdmin) return;
    const membership = await this.prisma.userTenant.findFirst({ where: { userId: viewerId, tenantId: ctx.tenantId } });
    if (!membership) throw new RpcException({ status: 403, message: "회사 구성원만 이용할 수 있습니다" });
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === "object" && err !== null && typeof (err as { message?: unknown }).message === "string") {
      return (err as { message: string }).message;
    }
    return "알 수 없는 오류";
  }
}
