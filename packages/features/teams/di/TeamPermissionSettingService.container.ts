import { createContainer } from "@calcom/features/di/di";
import {
  type TeamPermissionSettingService,
  moduleLoader as teamPermissionSettingServiceModuleLoader,
} from "./TeamPermissionSettingService.module";

const teamPermissionSettingServiceContainer = createContainer();

export function getTeamPermissionSettingService(): TeamPermissionSettingService {
  teamPermissionSettingServiceModuleLoader.loadModule(teamPermissionSettingServiceContainer);
  return teamPermissionSettingServiceContainer.get<TeamPermissionSettingService>(
    teamPermissionSettingServiceModuleLoader.token
  );
}
