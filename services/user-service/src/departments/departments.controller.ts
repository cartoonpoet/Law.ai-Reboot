import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  DEPARTMENT_PATTERNS,
  type ListDepartmentsRequest,
} from "@lawai/contracts";
import { DepartmentsService } from "./departments.service";

@Controller()
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @MessagePattern(DEPARTMENT_PATTERNS.LIST)
  list(@Payload() req: ListDepartmentsRequest = {}) {
    return this.departments.list(req);
  }
}
