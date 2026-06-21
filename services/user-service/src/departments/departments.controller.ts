import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { DEPARTMENT_PATTERNS } from "@lawai/contracts";
import { DepartmentsService } from "./departments.service";

@Controller()
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @MessagePattern(DEPARTMENT_PATTERNS.LIST)
  list() {
    return this.departments.list();
  }
}
