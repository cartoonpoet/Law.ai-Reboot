import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import type { AiAnalysisDto, TenantContext } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { tenantScope } from "../common/tenant-scope";
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

  // fire-and-forget 로만 호출된다(호출부는 void 로 await 하지 않음) — 이 메서드는
  // 어떤 이유로도 reject 해서는 안 된다(getDecryptedKeyFor/두 upsert/analyze 중 하나라도
  // throw 하면 catch 되지 않은 rejection 이 프로세스 전체를 죽일 수 있음). 따라서 본문
  // 전체를 하나의 try/catch 로 감싸고, catch 에서는 이미 생성된 행이 있으면 best-effort 로
  // failed 상태만 기록한 뒤 반드시 정상 반환한다.
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
    let row: AiAnalysisRow | undefined;
    try {
      const cred = await this.credentials.getDecryptedKeyFor(input.triggeredByUserId);
      if (!cred) {
        await this.prisma.aiAnalysis.upsert({
          where,
          create: { ...base, model: null, status: "skipped", attempts: 0 },
          update: { status: "skipped", triggeredByUserId: base.triggeredByUserId, input: base.input },
        });
        return;
      }
      row = await this.prisma.aiAnalysis.upsert({
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
      // row 가 아직 없다면(자격증명 조회 자체가 실패한 경우 등) 기록할 대상이 없으므로 조용히 종료.
      if (!row?.id) return;
      try {
        await this.prisma.aiAnalysis.update({
          where: { id: row.id },
          data: { status: "failed", errorMessage: String(err) },
        });
      } catch {
        // best-effort — 실패 상태 기록조차 실패해도 trigger()는 절대 reject 하지 않는다.
      }
    }
  }

  // (targetType, targetId, kind) 는 복합 유니크지만 findUnique 로는 tenantId 를 where 에
  // 합칠 수 없다 — 타 테넌트 targetId 위조를 막기 위해 findFirst + tenantScope 로 조회한다.
  private findScoped(
    targetType: string,
    targetId: string,
    kind: string,
    ctx: TenantContext,
  ): Promise<AiAnalysisRow | null> {
    return this.prisma.aiAnalysis.findFirst({
      where: { targetType, targetId, kind, ...tenantScope(ctx) },
    });
  }

  async get(
    targetType: string,
    targetId: string,
    kind: string,
    ctx: TenantContext,
  ): Promise<AiAnalysisDto | null> {
    const row = await this.findScoped(targetType, targetId, kind, ctx);
    if (!row) return null;
    return this.toDto(row);
  }

  async retry(
    targetType: string,
    targetId: string,
    kind: string,
    viewerId: string | undefined,
    ctx: TenantContext,
  ): Promise<void> {
    const row = await this.findScoped(targetType, targetId, kind, ctx);
    if (!row) return;
    // 재시도는 row.triggeredByUserId 의 복호화된 API 키(= 타인의 유료 계정)로 실행된다.
    // 따라서 최초 트리거 주체 본인 또는 시스템 관리자만 허용한다.
    // (대상 도메인의 세부 권한 판정은 ai-analysis 가 도메인 비의존이어야 하므로 여기서 하지 않는다.)
    if (!ctx.isSystemAdmin && viewerId !== row.triggeredByUserId) {
      throw new RpcException({ status: 403, message: "이 분석을 재시도할 권한이 없습니다" });
    }
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
