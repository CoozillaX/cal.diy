import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { ErrorWithCode } from "@calcom/lib/errors";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { applyReassignment } from "./applyReassignment";

/**
 * Manually reassigns a round-robin booking to a specific, caller-chosen host. Mirrors the
 * frontend's isReassignableRoundRobin gate (bookingActions.ts) server-side: only single
 * host-group round-robin event types are reassignable this way.
 */
const _manualReassignRoundRobinHost = async ({
  bookingId,
  newUserId,
  reassignedById,
  reassignReason,
}: {
  bookingId: number;
  newUserId: number;
  reassignedById: number;
  reassignReason?: string | null;
}) => {
  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findByIdWithAttendeesPaymentAndReferences(bookingId);
  if (!booking) {
    throw ErrorWithCode.Factory.NotFound(`Booking ${bookingId} not found`);
  }
  if (!booking.eventTypeId || booking.eventType?.schedulingType !== SchedulingType.ROUND_ROBIN) {
    throw ErrorWithCode.Factory.BadRequest("Only round-robin bookings can be reassigned this way");
  }
  if ((booking.eventType.hostGroups?.length ?? 0) > 1) {
    throw ErrorWithCode.Factory.BadRequest(
      "Bookings for event types with multiple host groups cannot be manually reassigned"
    );
  }
  if (booking.userId === newUserId) {
    throw ErrorWithCode.Factory.BadRequest("Booking is already assigned to this host");
  }

  const hostRepository = new HostRepository(prisma);
  const isEligibleHost = await hostRepository.findHostsPaginatedIncludeUserForAssignment({
    eventTypeId: booking.eventTypeId,
    memberUserIds: [newUserId],
    limit: 1,
  });
  const newHostAsHost = isEligibleHost.items.find((item) => item.userId === newUserId && !item.isFixed);
  if (!newHostAsHost) {
    throw ErrorWithCode.Factory.BadRequest("The selected user is not a round-robin host of this event type");
  }

  const userRepository = new UserRepository(prisma);
  const newHost = await userRepository.findById({ id: newUserId });
  if (!newHost) {
    throw ErrorWithCode.Factory.NotFound(`User ${newUserId} not found`);
  }

  return applyReassignment({
    bookingId,
    newHost: {
      id: newHost.id,
      name: newHost.name,
      email: newHost.email,
      timeZone: newHost.timeZone,
      locale: newHost.locale,
    },
    reassignedById,
    reassignReason,
    reassignmentType: "manual",
  });
};

export const manualReassignRoundRobinHost = withReporting(
  _manualReassignRoundRobinHost,
  "manualReassignRoundRobinHost"
);
