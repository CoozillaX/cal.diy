import { getHolidayService } from "@calcom/lib/holidays";
import type { TrpcSessionUser } from "../../../../types";
import type { THolidaySettingsInputSchema } from "../../teams/holidaySettings.schema";

type HolidaySettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THolidaySettingsInputSchema;
};

export const adminHolidaySettingsHandler = async ({ input }: HolidaySettingsOptions) => {
  const holidayService = getHolidayService();
  return holidayService.getTeamSettings(input.teamId);
};
