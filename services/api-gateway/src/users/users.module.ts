import { Module } from "@nestjs/common";
import { AvatarController } from "./avatar.controller";
import { UsersController } from "./users.controller";

@Module({ controllers: [UsersController, AvatarController] })
export class UsersModule {}
