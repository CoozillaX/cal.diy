import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TUpdatePermissionSettingsInputSchema } from "../../teams/updatePermissionSettings.schema";

type UpdatePermissionSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdatePermissionSettingsInputSchema;
};

export const adminUpdatePermissionSettingsHandler = async ({ input }: UpdatePermissionSettingsOptions) => {
  const teamPermissionSettingService = getTeamPermissionSettingService();

  await teamPermissionSettingService.adminUpdateSettings({
    teamId: input.teamId,
    settings: input.settings,
  });

  return teamPermissionSettingService.getEffectiveSettings({ teamId: input.teamId });
};
