import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_PATTERNS } from "@lawai/contracts";
import type {
  CreateUserRequest,
  FindUserByEmailRequest,
  FindUserByIdRequest,
  CreateResetTokenRequest,
  ConsumeResetTokenRequest,
  UpdatePasswordRequest,
} from "@lawai/contracts";
import { UsersService } from "./users.service";

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @MessagePattern(USER_PATTERNS.CREATE)
  create(@Payload() req: CreateUserRequest) {
    return this.users.create(req);
  }

  @MessagePattern(USER_PATTERNS.FIND_BY_EMAIL)
  findByEmail(@Payload() req: FindUserByEmailRequest) {
    return this.users.findByEmail(req);
  }

  @MessagePattern(USER_PATTERNS.FIND_BY_ID)
  findById(@Payload() req: FindUserByIdRequest) {
    return this.users.findById(req);
  }

  @MessagePattern(USER_PATTERNS.CREATE_RESET_TOKEN)
  createResetToken(@Payload() req: CreateResetTokenRequest) {
    return this.users.createResetToken(req);
  }

  @MessagePattern(USER_PATTERNS.CONSUME_RESET_TOKEN)
  consumeResetToken(@Payload() req: ConsumeResetTokenRequest) {
    return this.users.consumeResetToken(req);
  }

  @MessagePattern(USER_PATTERNS.UPDATE_PASSWORD)
  updatePassword(@Payload() req: UpdatePasswordRequest) {
    return this.users.updatePassword(req);
  }
}
