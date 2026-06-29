import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { tenantScope } from "../common/tenant-scope";
import type { DepartmentDto, ListDepartmentsRequest } from "@lawai/contracts";

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(req: ListDepartmentsRequest = {}): Promise<DepartmentDto[]> {
    const ctx = req.tenantContext;
    const tScope = ctx ? tenantScope(ctx) : {};
    const rows = await this.prisma.department.findMany({
      where: Object.keys(tScope).length > 0 ? tScope : undefined,
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }
}
