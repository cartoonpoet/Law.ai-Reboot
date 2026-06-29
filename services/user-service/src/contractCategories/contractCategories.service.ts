import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { tenantScope } from "../common/tenant-scope";
import type {
  ContractCategoryDto,
  ListContractCategoriesRequest,
} from "@lawai/contracts";

@Injectable()
export class ContractCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(req: ListContractCategoriesRequest = {}): Promise<ContractCategoryDto[]> {
    const ctx = req.tenantContext;
    if (!ctx) {
      throw new RpcException({ status: 400, message: "테넌트 컨텍스트가 없습니다" });
    }
    const tScope = tenantScope(ctx);
    const rows = await this.prisma.contractCategory.findMany({
      where: Object.keys(tScope).length > 0 ? tScope : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      parentId: r.parentId,
      sortOrder: r.sortOrder,
    }));
  }
}
