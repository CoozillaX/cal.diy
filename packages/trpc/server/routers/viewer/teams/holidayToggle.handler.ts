import { getHolidayService } from "@calcom/lib/holidays";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { THolidayToggleInputSchema } from "./holidayToggle.schema";
import { assertTeamAdminOrOwner } from "./teamPermission.utils";

type HolidayToggleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THolidayToggleInputSchema;
};

export const holidayToggleHandler = async ({ ctx, input }: HolidayToggleOptions) => {
  await assertTeamAdminOrOwner(ctx.user.id, input.teamId);

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

export default holidayToggleHandler;
