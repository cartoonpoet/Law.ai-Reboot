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

// Prisma 가 counterparties 를 include 한 Contract 행
type ContractWithParties = Prisma.ContractGetPayload<{
  include: { counterparties: true };
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
        },
        include: { counterparties: true },
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
      include: { counterparties: true },
    });
    if (!row) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    return this.toResponse(row);
  }

  private toResponse(row: ContractWithParties): ContractResponse {
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
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
