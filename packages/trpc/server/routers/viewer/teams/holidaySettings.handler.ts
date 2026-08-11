import { getHolidayService } from "@calcom/lib/holidays";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { THolidaySettingsInputSchema } from "./holidaySettings.schema";
import { assertTeamMember } from "./teamPermission.utils";

type HolidaySettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THolidaySettingsInputSchema;
};

export const holidaySettingsHandler = async ({ ctx, input }: HolidaySettingsOptions) => {
  await assertTeamMember(ctx.user.id, input.teamId);

  const holidayService = getHolidayService();
  return holidayService.getTeamSettings(input.teamId);
};

export default holidaySettingsHandler;
