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
  SearchUsersRequest,
  AvatarSourceRequest,
  AvatarUploadTargetRequest,
  ConfirmAvatarRequest,
  GetProfileRequest,
  RemoveAvatarRequest,
  UpdateProfileRequest,
} from "@lawai/contracts";
import { ProfileService } from "./profile.service";
import { UsersService } from "./users.service";

@Controller()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly profile: ProfileService,
  ) {}

  @MessagePattern(USER_PATTERNS.GET_PROFILE)
  getProfile(@Payload() req: GetProfileRequest) {
    return this.profile.get(req);
  }

  @MessagePattern(USER_PATTERNS.UPDATE_PROFILE)
  updateProfile(@Payload() req: UpdateProfileRequest) {
    return this.profile.update(req);
  }

  @MessagePattern(USER_PATTERNS.AVATAR_UPLOAD_TARGET)
  avatarUploadTarget(@Payload() req: AvatarUploadTargetRequest) {
    return this.profile.avatarUploadTarget(req);
  }

  @MessagePattern(USER_PATTERNS.AVATAR_CONFIRM)
  confirmAvatar(@Payload() req: ConfirmAvatarRequest) {
    return this.profile.confirmAvatar(req);
  }

  @MessagePattern(USER_PATTERNS.AVATAR_REMOVE)
  removeAvatar(@Payload() req: RemoveAvatarRequest) {
    return this.profile.removeAvatar(req);
  }

  @MessagePattern(USER_PATTERNS.AVATAR_SOURCE)
  avatarSource(@Payload() req: AvatarSourceRequest) {
    return this.profile.avatarSource(req);
  }

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

  @MessagePattern(USER_PATTERNS.SEARCH)
  search(@Payload() req: SearchUsersRequest) {
    return this.users.search(req);
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
