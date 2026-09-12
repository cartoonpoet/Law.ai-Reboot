import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AiAnalysisDto } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { AiCredentialsService } from "../ai-credentials/ai-credentials.service";
import { AiServiceClient } from "../ai-credentials/ai-service.client";

export interface TriggerAiAnalysisInput {
  targetType: string;
  targetId: string;
  kind: string;
  tenantId: string;
  triggeredByUserId: string;
  payload: unknown;
}

type AiAnalysisRow = {
  id: string;
  targetType: string;
  targetId: string;
  kind: string;
  tenantId: string;
  status: string;
  result: unknown;
  errorMessage: string | null;
  triggeredByUserId: string;
  input: unknown;
  updatedAt: Date;
};

@Injectable()
export class AiAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: AiCredentialsService,
    private readonly aiClient: AiServiceClient,
  ) {}

  async trigger(input: TriggerAiAnalysisInput): Promise<void> {
    // 공통 식별 필드(payload 는 Prisma 필드명이 아니라 input 이므로 스프레드하지 않고 명시적으로 구성).
    const base = {
      targetType: input.targetType,
      targetId: input.targetId,
      kind: input.kind,
      tenantId: input.tenantId,
      triggeredByUserId: input.triggeredByUserId,
      input: input.payload as Prisma.InputJsonValue,
    };
    const where = {
      targetType_targetId_kind: {
        targetType: input.targetType,
        targetId: input.targetId,
        kind: input.kind,
      },
    };
    const cred = await this.credentials.getDecryptedKeyFor(input.triggeredByUserId);
    if (!cred) {
      await this.prisma.aiAnalysis.upsert({
        where,
        create: { ...base, model: null, status: "skipped", attempts: 0 },
        update: { status: "skipped", triggeredByUserId: base.triggeredByUserId, input: base.input },
      });
      return;
    }
    const row: AiAnalysisRow | undefined = await this.prisma.aiAnalysis.upsert({
      where,
      create: { ...base, model: cred.model, status: "pending", attempts: 0 },
      update: {
        status: "pending",
        model: cred.model,
        triggeredByUserId: base.triggeredByUserId,
        input: base.input,
        attempts: { increment: 1 },
      },
    });
    try {
      const { result } = await this.aiClient.analyze({
        kind: input.kind,
        model: cred.model,
        apiKey: cred.apiKey,
        payload: input.payload,
      });
      await this.prisma.aiAnalysis.update({
        where: { id: row?.id },
        data: { status: "succeeded", result: result as Prisma.InputJsonValue, errorMessage: null },
      });
    } catch (err) {
      await this.prisma.aiAnalysis.update({
        where: { id: row?.id },
        data: { status: "failed", errorMessage: String(err) },
      });
    }
  }

  async get(targetType: string, targetId: string, kind: string): Promise<AiAnalysisDto | null> {
    const row: AiAnalysisRow | null = await this.prisma.aiAnalysis.findUnique({
      where: { targetType_targetId_kind: { targetType, targetId, kind } },
    });
    if (!row) return null;
    return this.toDto(row);
  }

  async retry(targetType: string, targetId: string, kind: string): Promise<void> {
    const row: AiAnalysisRow | null = await this.prisma.aiAnalysis.findUnique({
      where: { targetType_targetId_kind: { targetType, targetId, kind } },
    });
    if (!row) return;
    await this.trigger({
      targetType: row.targetType,
      targetId: row.targetId,
      kind: row.kind,
      tenantId: row.tenantId,
      triggeredByUserId: row.triggeredByUserId,
      payload: row.input,
    });
  }

  private toDto(row: AiAnalysisRow): AiAnalysisDto {
    return {
      kind: row.kind,
      status: row.status as AiAnalysisDto["status"],
      result: row.result,
      errorMessage: row.errorMessage,
      triggeredByUserId: row.triggeredByUserId,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
