import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TGetPermissionSettingsInputSchema } from "../../teams/getPermissionSettings.schema";

type GetPermissionSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetPermissionSettingsInputSchema;
};

export const adminGetPermissionSettingsHandler = async ({ input }: GetPermissionSettingsOptions) => {
  const teamPermissionSettingService = getTeamPermissionSettingService();
  return teamPermissionSettingService.getEffectiveSettings({ teamId: input.teamId });
};
