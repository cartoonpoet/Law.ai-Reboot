import type { PublicUser } from "@lawai/contracts";
import { apiFetch } from "./client";

export const getMe = (): Promise<PublicUser> => apiFetch<PublicUser>("/users/me");
