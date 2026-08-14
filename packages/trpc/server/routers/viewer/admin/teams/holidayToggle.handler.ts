import { getHolidayService } from "@calcom/lib/holidays";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../../types";
import type { THolidayToggleInputSchema } from "../../teams/holidayToggle.schema";

type HolidayToggleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THolidayToggleInputSchema;
};

export const adminHolidayToggleHandler = async ({ input }: HolidayToggleOptions) => {
  const holidayService = getHolidayService();
  try {
    return await holidayService.toggleTeamHoliday(input.teamId, input.holidayId, input.enabled);
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to toggle holiday",
    });
  }
};
