import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TUpdatePermissionSettingsInputSchema } from "./updatePermissionSettings.schema";

type UpdatePermissionSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdatePermissionSettingsInputSchema;
};

// Owner-only: TeamPermissionSettingService.updateSettings asserts this itself and throws
// ErrorWithCode.Factory.Forbidden (auto-converted to a TRPCError) for anyone else, including admins.
export const updatePermissionSettingsHandler = async ({ ctx, input }: UpdatePermissionSettingsOptions) => {
  const teamPermissionSettingService = getTeamPermissionSettingService();

  await teamPermissionSettingService.updateSettings({
    teamId: input.teamId,
    userId: ctx.user.id,
    settings: input.settings,
  });

  return teamPermissionSettingService.getEffectiveSettings({ teamId: input.teamId });
};

export default updatePermissionSettingsHandler;
