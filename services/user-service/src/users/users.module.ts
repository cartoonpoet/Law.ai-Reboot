import { Module } from "@nestjs/common";
import { FilesModule } from "../files/files.module";
import { ProfileService } from "./profile.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  // 프로필 사진 저장에 R2Client(FilesModule export)를 쓴다.
  imports: [FilesModule],
  controllers: [UsersController],
  providers: [UsersService, ProfileService],
})
export class UsersModule {}
