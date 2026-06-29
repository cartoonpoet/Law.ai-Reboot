import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { tenantScope, resolveTenantId } from "../common/tenant-scope";
import type {
  SearchCompaniesRequest,
  CreateCompanyRequest,
  Company,
} from "@lawai/contracts";

type CompanyRow = {
  id: string;
  type: Company["type"];
  name: string;
  bizNo: string;
  ceo: string | null;
  phone: string | null;
  address: string | null;
  addressDetail: string | null;
  managerName: string | null;
  managerPhone: string | null;
  managerEmail: string | null;
  createdAt: Date;
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(req: SearchCompaniesRequest): Promise<Company[]> {
    const q = req.q.trim();
    if (!q) return [];
    const ctx = req.tenantContext;
    if (!ctx) {
      throw new RpcException({ status: 400, message: "테넌트 컨텍스트가 없습니다" });
    }
    const tScope = tenantScope(ctx);
    const rows = (await this.prisma.company.findMany({
      where: {
        ...tScope,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { bizNo: { contains: q, mode: "insensitive" } },
          { ceo: { contains: q, mode: "insensitive" } },
        ],
      },
      take: req.limit ?? 10,
      orderBy: { name: "asc" },
    })) as CompanyRow[];
    return rows.map((r) => this.toPublic(r));
  }

  async create(req: CreateCompanyRequest): Promise<Company> {
    const ctx = req.tenantContext!;
    // 사업자번호: 입력 시 그대로, 미입력 시 개인(individual)만 임시번호 자동생성. 회사는 필수.
    const trimmed = req.bizNo?.trim();
    let bizNo: string;
    if (trimmed) {
      bizNo = trimmed;
    } else if (req.type === "individual") {
      bizNo = `TEMP-${randomUUID().slice(0, 8).toUpperCase()}`;
    } else {
      throw new RpcException({
        status: 400,
        message: "사업자등록번호를 입력하세요",
      });
    }
    try {
      const row = (await this.prisma.company.create({
        data: {
          type: req.type,
          name: req.name,
          bizNo,
          tenantId: resolveTenantId(ctx),
          ceo: req.ceo ?? null,
          phone: req.phone ?? null,
          address: req.address ?? null,
          addressDetail: req.addressDetail ?? null,
          managerName: req.managerName ?? null,
          managerPhone: req.managerPhone ?? null,
          managerEmail: req.managerEmail ?? null,
        },
      })) as CompanyRow;
      return this.toPublic(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new RpcException({
          status: 409,
          message: "이미 등록된 사업자등록번호입니다",
        });
      }
      throw error;
    }
  }

  private toPublic(r: CompanyRow): Company {
    return {
      id: r.id,
      type: r.type,
      name: r.name,
      bizNo: r.bizNo,
      ceo: r.ceo,
      phone: r.phone,
      address: r.address,
      addressDetail: r.addressDetail,
      managerName: r.managerName,
      managerPhone: r.managerPhone,
      managerEmail: r.managerEmail,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
