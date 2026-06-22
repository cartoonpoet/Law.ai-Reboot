import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { ContractCategoryDto } from "@lawai/contracts";

@Injectable()
export class ContractCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ContractCategoryDto[]> {
    const rows = await this.prisma.contractCategory.findMany({
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
