import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { TeamPermissionSettingRepository } from "@calcom/features/teams/repositories/TeamPermissionSettingRepository";
import { TEAM_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = TEAM_DI_TOKENS.TEAM_PERMISSION_SETTING_REPOSITORY;
const moduleToken = TEAM_DI_TOKENS.TEAM_PERMISSION_SETTING_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: TeamPermissionSettingRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { TeamPermissionSettingRepository };
