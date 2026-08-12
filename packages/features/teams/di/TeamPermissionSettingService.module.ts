import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { TeamPermissionSettingService } from "@calcom/features/teams/services/TeamPermissionSettingService";
import { moduleLoader as membershipRepositoryModuleLoader } from "@calcom/features/users/di/MembershipRepository.module";
import { moduleLoader as teamPermissionSettingRepositoryModuleLoader } from "./TeamPermissionSettingRepository.module";
import { TEAM_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = TEAM_DI_TOKENS.TEAM_PERMISSION_SETTING_SERVICE;
const moduleToken = TEAM_DI_TOKENS.TEAM_PERMISSION_SETTING_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: TeamPermissionSettingService,
  depsMap: {
    settingRepository: teamPermissionSettingRepositoryModuleLoader,
    membershipRepository: membershipRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { TeamPermissionSettingService };
