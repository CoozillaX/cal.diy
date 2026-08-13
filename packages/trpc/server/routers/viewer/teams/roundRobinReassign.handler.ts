import { autoReassignRoundRobinHost } from "@calcom/features/bookings/lib/roundRobinReassignment/autoReassignRoundRobinHost";
import { getBookingAccessService } from "@calcom/features/di/containers/BookingAccessService";
import { TEAM_PERMISSIONS } from "@calcom/features/teams/lib/teamPermissions";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TRoundRobinReassignInputSchema } from "./roundRobinReassign.schema";

type RoundRobinReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRoundRobinReassignInputSchema;
};

export const roundRobinReassignHandler = async ({ ctx, input }: RoundRobinReassignOptions) => {
  const bookingAccessService = getBookingAccessService();
  const isAllowed = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: ctx.user.id,
    bookingId: input.bookingId,
    permission: TEAM_PERMISSIONS.BOOKING_REASSIGN,
  });
  if (!isAllowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to reassign this booking",
    });
  }

  return autoReassignRoundRobinHost({
    bookingId: input.bookingId,
    reassignedById: ctx.user.id,
    reassignReason: input.reassignReason,
  });
};

export default roundRobinReassignHandler;
