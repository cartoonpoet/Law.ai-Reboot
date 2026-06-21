import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateContractRequest,
  GetContractRequest,
  ContractResponse,
  ContractDetailsV1,
  Company,
} from "@lawai/contracts";

// Prisma 가 counterparties + 결재선(단계 포함)을 include 한 Contract 행
const contractInclude = {
  counterparties: true,
  approvalLines: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
  files: { orderBy: [{ role: "asc" }, { sortOrder: "asc" }] },
} satisfies Prisma.ContractInclude;

type ContractWithRelations = Prisma.ContractGetPayload<{
  include: typeof contractInclude;
}>;

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(req: CreateContractRequest): Promise<ContractResponse> {
    try {
      const row = await this.prisma.contract.create({
        data: {
          title: req.title,
          securityLevel: req.securityLevel,
          reviewType: req.reviewType,
          party: req.party ?? null,
          catMajor: req.catMajor ?? null,
          catMinor: req.catMinor ?? null,
          catSub: req.catSub ?? null,
          requesterId: req.requesterId ?? null,
          ownerId: req.ownerId ?? null,
          createdById: req.createdById,
          periodStart: parseDate(req.periodStart),
          periodEnd: parseDate(req.periodEnd),
          dueDate: parseDate(req.dueDate),
          schemaVersion: req.schemaVersion,
          details: req.details as unknown as Prisma.InputJsonValue,
          counterparties: {
            create: req.counterparties.map((cp) => ({
              companyId: cp.companyId,
              partyType: cp.partyType ?? null,
              snapshot: cp.snapshot as unknown as Prisma.InputJsonValue,
            })),
          },
          // 결재선: approvers 가 있을 때만 1개 생성하고 배열 순서대로 단계화.
          approvalLines:
            req.approvers.length > 0
              ? {
                  create: {
                    steps: {
                      create: req.approvers.map((a, index) => ({
                        stepOrder: index,
                        name: a.name,
                        dept: a.dept,
                        type: a.type,
                      })),
                    },
                  },
                }
              : undefined,
          // 첨부 파일 메타데이터(계약서/첨부/참고).
          files: {
            create: req.files.map((f) => ({
              role: f.role,
              name: f.name,
              meta: f.meta,
              sortOrder: f.sortOrder,
            })),
          },
        },
        include: contractInclude,
      });
      return this.toResponse(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new RpcException({
          status: 400,
          message: "존재하지 않는 사용자 또는 회사가 참조되었습니다",
        });
      }
      throw error;
    }
  }

  async get(req: GetContractRequest): Promise<ContractResponse> {
    const row = await this.prisma.contract.findFirst({
      where: { id: req.id, deletedAt: null },
      include: contractInclude,
    });
    if (!row) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    return this.toResponse(row);
  }

  private toResponse(row: ContractWithRelations): ContractResponse {
    const line = row.approvalLines[0] ?? null;
    return {
      id: row.id,
      title: row.title,
      securityLevel: row.securityLevel,
      reviewType: row.reviewType,
      party: row.party,
      catMajor: row.catMajor,
      catMinor: row.catMinor,
      catSub: row.catSub,
      requesterId: row.requesterId,
      ownerId: row.ownerId,
      createdById: row.createdById,
      periodStart: row.periodStart?.toISOString() ?? null,
      periodEnd: row.periodEnd?.toISOString() ?? null,
      dueDate: row.dueDate?.toISOString() ?? null,
      schemaVersion: row.schemaVersion,
      details: row.details as unknown as ContractDetailsV1,
      counterparties: row.counterparties.map((cp) => ({
        id: cp.id,
        companyId: cp.companyId,
        partyType: cp.partyType,
        snapshot: cp.snapshot as unknown as Company,
      })),
      approvalLine: line
        ? {
            id: line.id,
            status: line.status,
            steps: line.steps.map((s) => ({
              id: s.id,
              stepOrder: s.stepOrder,
              name: s.name,
              dept: s.dept,
              type: s.type,
              status: s.status,
            })),
          }
        : null,
      files: row.files.map((f) => ({
        id: f.id,
        role: f.role,
        name: f.name,
        meta: f.meta,
        size: f.size,
        mimeType: f.mimeType,
        storageKey: f.storageKey,
        sortOrder: f.sortOrder,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
