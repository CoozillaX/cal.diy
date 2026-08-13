import { getReassignmentCandidates } from "@calcom/features/bookings/lib/roundRobinReassignment/getReassignmentCandidates";
import { getBookingAccessService } from "@calcom/features/di/containers/BookingAccessService";
import { TEAM_PERMISSIONS } from "@calcom/features/teams/lib/teamPermissions";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TGetRoundRobinHostsToReassignInputSchema } from "./getRoundRobinHostsToReassign.schema";

type GetRoundRobinHostsToReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetRoundRobinHostsToReassignInputSchema;
};

export const getRoundRobinHostsToReassignHandler = async ({
  ctx,
  input,
}: GetRoundRobinHostsToReassignOptions) => {
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

  return getReassignmentCandidates({
    bookingId: input.bookingId,
    cursor: input.cursor ?? undefined,
    limit: input.limit,
    search: input.search,
  });
};

export default getRoundRobinHostsToReassignHandler;
