import { getHolidayService } from "@calcom/lib/holidays";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../../types";
import type { THolidayUpdateSettingsInputSchema } from "../../teams/holidayUpdateSettings.schema";

type HolidayUpdateSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THolidayUpdateSettingsInputSchema;
};

export const adminHolidayUpdateSettingsHandler = async ({ input }: HolidayUpdateSettingsOptions) => {
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
