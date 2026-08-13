import { manualReassignRoundRobinHost } from "@calcom/features/bookings/lib/roundRobinReassignment/manualReassignRoundRobinHost";
import { getBookingAccessService } from "@calcom/features/di/containers/BookingAccessService";
import { TEAM_PERMISSIONS } from "@calcom/features/teams/lib/teamPermissions";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TRoundRobinManualReassignInputSchema } from "./roundRobinManualReassign.schema";

type RoundRobinManualReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRoundRobinManualReassignInputSchema;
};

export const roundRobinManualReassignHandler = async ({ ctx, input }: RoundRobinManualReassignOptions) => {
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

  await manualReassignRoundRobinHost({
    bookingId: input.bookingId,
    newUserId: input.teamMemberId,
    reassignedById: ctx.user.id,
    reassignReason: input.reassignReason,
  });

  return { success: true };
};

export default roundRobinManualReassignHandler;
