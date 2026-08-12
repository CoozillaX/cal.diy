import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TGetPermissionSettingsInputSchema } from "./getPermissionSettings.schema";
import { assertTeamMember } from "./teamPermission.utils";

type GetPermissionSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetPermissionSettingsInputSchema;
};

// Read-open to any accepted member (mirrors holidaySettings) so a non-owner admin can still see
// the permission matrix read-only; edit access is enforced by updatePermissionSettingsHandler.
export const getPermissionSettingsHandler = async ({ ctx, input }: GetPermissionSettingsOptions) => {
  await assertTeamMember(ctx.user.id, input.teamId);

  const teamPermissionSettingService = getTeamPermissionSettingService();
  return teamPermissionSettingService.getEffectiveSettings({ teamId: input.teamId });
};

export default getPermissionSettingsHandler;
