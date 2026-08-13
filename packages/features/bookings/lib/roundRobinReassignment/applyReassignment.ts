import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { buildCalEventFromBooking } from "@calcom/lib/buildCalEventFromBooking";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";
import { AssignmentReasonEnum, BookingStatus } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["applyReassignment"] });

export type ReassignmentType = "manual" | "roundRobin";

export type ReassignmentTargetHost = {
  id: number;
  name: string | null;
  email: string;
  timeZone: string;
  locale: string | null;
};

/**
 * Shared core for both manual and automatic round-robin reassignment - the only difference
 * between the two entry points is how newHost was picked; everything after that (DB update,
 * best-effort calendar sync, audit trail) is identical.
 */
const _applyReassignment = async ({
  bookingId,
  newHost,
  reassignedById,
  reassignReason,
  reassignmentType,
}: {
  bookingId: number;
  newHost: ReassignmentTargetHost;
  reassignedById: number;
  reassignReason?: string | null;
  reassignmentType: ReassignmentType;
}) => {
  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findByIdWithAttendeesPaymentAndReferences(bookingId);
  if (!booking) {
    throw ErrorWithCode.Factory.NotFound(`Booking ${bookingId} not found`);
  }

  const wasAwaitingHost = booking.status === BookingStatus.AWAITING_HOST;

  await bookingRepository.update({
    where: { id: bookingId },
    data: {
      userId: newHost.id,
      userPrimaryEmail: newHost.email,
      reassignById: reassignedById,
      reassignReason: reassignReason ?? null,
      // Clears the Unallocated tab's status - a normal (already-ACCEPTED) round-robin booking
      // being manually reassigned keeps its existing status untouched.
      ...(wasAwaitingHost ? { status: BookingStatus.ACCEPTED } : {}),
    },
  });

  // Best-effort calendar/video sync - deliberately never blocks the reassignment above, which is
  // the part that actually matters for the Unallocated -> Upcoming flow. Moving an existing
  // calendar event to a different person's calendar is a substantially bigger operation
  // (effectively cancel + recreate across two different calendar accounts) than what
  // EventManager.updateCalendarAttendees does - out of scope for this pass; log and move on
  // rather than risk a half-implemented calendar migration.
  try {
    const evt = await buildCalEventFromBooking({
      booking: { ...booking, userPrimaryEmail: newHost.email },
      organizer: {
        email: newHost.email,
        name: newHost.name,
        timeZone: newHost.timeZone,
        locale: newHost.locale,
      },
      location: booking.location ?? "",
      conferenceCredentialId: null,
      organizationId: null,
    });
    const newHostCredentials = await getUsersCredentialsIncludeServiceAccountKey(newHost);
    const eventManager = new EventManager({ credentials: newHostCredentials, destinationCalendar: null });
    await eventManager.updateCalendarAttendees(evt, booking);
  } catch (error) {
    log.error("Best-effort calendar sync failed during reassignment", safeStringify(error));
  }

  const assignmentReasonRepo = new AssignmentReasonRepository(prisma);
  await assignmentReasonRepo.createAssignmentReason({
    bookingId,
    reasonEnum: AssignmentReasonEnum.RR_REASSIGNED,
    reasonString: reassignReason || `Reassigned to ${newHost.name || newHost.email}`,
  });

  log.info(
    "Applied reassignment",
    safeStringify({ bookingId, newHostId: newHost.id, reassignmentType, wasAwaitingHost })
  );

  return { success: true as const };
};

export const applyReassignment = withReporting(_applyReassignment, "applyReassignment");
