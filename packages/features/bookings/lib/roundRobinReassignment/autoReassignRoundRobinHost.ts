import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getLuckyUserService } from "@calcom/features/di/containers/LuckyUser";
import { groupHostsByGroupId } from "@calcom/lib/bookings/hostGroupUtils";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { applyReassignment } from "./applyReassignment";

const log = logger.getSubLogger({ prefix: ["autoReassignRoundRobinHost"] });

/**
 * Automatically picks a new host for a round-robin booking - excludes the current organizer,
 * filters by real availability at the booking's own time slot (same ensureAvailableUsers used at
 * booking-creation time), then defers to the same live LuckyUserService used for fresh bookings.
 */
const _autoReassignRoundRobinHost = async ({
  bookingId,
  reassignedById,
  reassignReason,
}: {
  bookingId: number;
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
      "Bookings for event types with multiple host groups cannot be automatically reassigned"
    );
  }

  const eventType = await getEventTypesFromDB(booking.eventTypeId);
  // eventType.users is the legacy, largely-unpopulated user_eventtype relation - team round-robin
  // event types record their real host list on eventType.hosts (Host join rows), same source
  // loadUsersByEventType() uses at booking-creation time.
  const candidateUsers = eventType.hosts
    .filter((host) => host.user.id !== booking.userId)
    .map((host) => ({
      ...host.user,
      isFixed: host.isFixed,
      priority: host.priority,
      weight: host.weight,
      groupId: host.groupId,
    })) as IsFixedAwareUser[];
  if (candidateUsers.length === 0) {
    throw ErrorWithCode.Factory.BadRequest("No other host is configured on this event type");
  }

  const availableUsers = await ensureAvailableUsers(
    { ...eventType, users: candidateUsers },
    {
      dateFrom: dayjs(booking.startTime).format(),
      dateTo: dayjs(booking.endTime).format(),
      timeZone: candidateUsers[0].timeZone,
    },
    log
  ).catch(() => []);

  const nonFixedAvailableUsers = availableUsers.filter((user) => !user.isFixed);
  if (nonFixedAvailableUsers.length === 0) {
    throw ErrorWithCode.Factory.BadRequest("No other host is currently available for this booking's time");
  }

  const nonFixedHosts = eventType.hosts.filter((host) => !host.isFixed && host.user.id !== booking.userId);
  const luckyUserPools = groupHostsByGroupId({
    hosts: nonFixedAvailableUsers,
    hostGroups: eventType.hostGroups,
  });
  const [groupId, luckyUserPool] = Object.entries(luckyUserPools)[0] ?? [];
  if (!groupId || !luckyUserPool?.length) {
    throw ErrorWithCode.Factory.BadRequest("No other host is currently available for this booking's time");
  }

  const [firstCandidate, ...restCandidates] = luckyUserPool;
  const newHost = await getLuckyUserService().getLuckyUser({
    availableUsers: [firstCandidate, ...restCandidates],
    allRRHosts: nonFixedHosts,
    eventType,
    meetingStartTime: booking.startTime,
  });

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
    reassignmentType: "roundRobin",
  });
};

export const autoReassignRoundRobinHost = withReporting(
  _autoReassignRoundRobinHost,
  "autoReassignRoundRobinHost"
);
