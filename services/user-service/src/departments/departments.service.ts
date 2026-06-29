import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "../prisma/prisma.service";
import { tenantScope } from "../common/tenant-scope";
import type { DepartmentDto, ListDepartmentsRequest } from "@lawai/contracts";

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(req: ListDepartmentsRequest = {}): Promise<DepartmentDto[]> {
    const ctx = req.tenantContext;
    if (!ctx) {
      throw new RpcException({ status: 400, message: "테넌트 컨텍스트가 없습니다" });
    }
    const tScope = tenantScope(ctx);
    const rows = await this.prisma.department.findMany({
      where: Object.keys(tScope).length > 0 ? tScope : undefined,
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }
}
