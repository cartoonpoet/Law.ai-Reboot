import { Injectable } from "@nestjs/common";
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
    const tScope = ctx ? tenantScope(ctx) : {};
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
