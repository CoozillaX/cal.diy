import { getHolidayService } from "@calcom/lib/holidays";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { THolidayUpdateSettingsInputSchema } from "./holidayUpdateSettings.schema";
import { assertTeamAdminOrOwner } from "./teamPermission.utils";

type HolidayUpdateSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THolidayUpdateSettingsInputSchema;
};

export const holidayUpdateSettingsHandler = async ({ ctx, input }: HolidayUpdateSettingsOptions) => {
  await assertTeamAdminOrOwner(ctx.user.id, input.teamId);

  const holidayService = getHolidayService();
  try {
    return await holidayService.updateTeamSettings(
      input.teamId,
      input.countryCode,
      input.resetDisabledHolidays
    );
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Failed to update settings",
    });
  }
};

export default holidayUpdateSettingsHandler;
