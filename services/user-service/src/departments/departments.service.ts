import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { DepartmentDto } from "@lawai/contracts";

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<DepartmentDto[]> {
    const rows = await this.prisma.department.findMany({
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }
}
