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
  ListContractsRequest,
  ListContractsResponse,
  ContractSummary,
} from "@lawai/contracts";

// Prisma 가 counterparties + 결재선(단계 포함)을 include 한 Contract 행
const contractInclude = {
  counterparties: true,
  approvalLines: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
  files: { orderBy: [{ role: "asc" }, { sortOrder: "asc" }] },
  references: { orderBy: [{ ccType: "asc" }, { isSecret: "asc" }] },
} satisfies Prisma.ContractInclude;

type ContractWithRelations = Prisma.ContractGetPayload<{
  include: typeof contractInclude;
}>;

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// 관리번호: C{YYYYMMDD}-{4자리}. 충돌 시 호출부에서 재시도(unique 제약).
const generateCode = (): string => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `C${ymd}-${seq}`;
};

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(req: CreateContractRequest): Promise<ContractResponse> {
    try {
      const row = await this.prisma.contract.create({
        data: {
          code: generateCode(),
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
          // 참조수신자(cc).
          references: {
            create: req.references.map((r) => ({
              ccType: r.ccType,
              isSecret: r.isSecret,
              refId: r.refId,
              name: r.name,
            })),
          },
        },
        include: contractInclude,
      });
      return this.toResponse(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new RpcException({
            status: 400,
            message: "존재하지 않는 사용자 또는 회사가 참조되었습니다",
          });
        }
        // 관리번호(code) 충돌 — 드물게 발생, 한 번 재시도.
        if (error.code === "P2002") {
          return this.create(req);
        }
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

  async list(req: ListContractsRequest): Promise<ListContractsResponse> {
    const page = Math.max(1, req.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, req.pageSize ?? 20));
    const q = req.q?.trim();

    const where: Prisma.ContractWhereInput = {
      deletedAt: null,
      ...(req.status ? { status: req.status } : {}),
      ...(req.party ? { party: req.party } : {}),
      ...(req.mineOf ? { createdById: req.mineOf } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              {
                counterparties: {
                  some: {
                    company: { name: { contains: q, mode: "insensitive" } },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        include: { counterparties: { take: 1, orderBy: { createdAt: "asc" } } },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contract.count({ where }),
    ]);

    const items: ContractSummary[] = rows.map((r) => {
      const first = r.counterparties[0];
      const snapshot = first
        ? (first.snapshot as unknown as Company)
        : null;
      return {
        id: r.id,
        code: r.code,
        title: r.title,
        status: r.status,
        securityLevel: r.securityLevel,
        party: r.party,
        catSub: r.catSub,
        counterpartyName: snapshot?.name ?? null,
        requesterId: r.requesterId,
        ownerId: r.ownerId,
        dueDate: r.dueDate?.toISOString() ?? null,
        createdById: r.createdById,
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return { items, total, page, pageSize };
  }

  private toResponse(row: ContractWithRelations): ContractResponse {
    const line = row.approvalLines[0] ?? null;
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      status: row.status,
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
      references: row.references.map((r) => ({
        id: r.id,
        ccType: r.ccType,
        isSecret: r.isSecret,
        refId: r.refId,
        name: r.name,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
