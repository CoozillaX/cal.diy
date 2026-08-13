import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { EventTypeHostService } from "@calcom/features/host/services/EventTypeHostService";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import { meetsMinimumRole, TEAM_PERMISSIONS } from "@calcom/features/teams/lib/teamPermissions";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["getReassignmentCandidates"] });

/**
 * Candidate list for the reassign dialog's picker: this event type's round-robin hosts, minus
 * the current organizer, filtered to whoever meets the team's configured booking.reassign
 * minimum role (mirrored server-side check, not just a client-side filter), annotated with
 * whether they're actually free at the booking's own time slot.
 */
const _getReassignmentCandidates = async ({
  bookingId,
  cursor,
  limit = 20,
  search,
}: {
  bookingId: number;
  cursor?: number;
  limit?: number;
  search?: string;
}) => {
  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findByIdWithAttendeesPaymentAndReferences(bookingId);
  if (!booking || !booking.eventTypeId) {
    throw ErrorWithCode.Factory.NotFound(`Booking ${bookingId} not found`);
  }
  const teamId = booking.eventType?.teamId;
  if (!teamId) {
    throw ErrorWithCode.Factory.BadRequest("This booking's event type does not belong to a team");
  }

  const membershipRepository = new MembershipRepository(prisma);
  const teamMembers = await membershipRepository.findMembershipsWithUserByTeamId({ teamId });
  const effectiveSettings = await getTeamPermissionSettingService().getEffectiveSettings({ teamId });
  const reassignMinimumRole =
    effectiveSettings.find((setting) => setting.permissionKey === TEAM_PERMISSIONS.BOOKING_REASSIGN)
      ?.minimumRole ?? MembershipRole.ADMIN;
  const eligibleUserIds = teamMembers
    .filter(
      (member) =>
        member.accepted &&
        member.user.id !== booking.userId &&
        meetsMinimumRole(member.role, reassignMinimumRole)
    )
    .map((member) => member.user.id);

  if (eligibleUserIds.length === 0) {
    return { items: [], nextCursor: undefined, hasMore: false };
  }

  const hostService = new EventTypeHostService(prisma);
  const { hosts, nextCursor, hasMore } = await hostService.getHostsForAssignment({
    eventTypeId: booking.eventTypeId,
    cursor,
    limit,
    search,
    memberUserIds: eligibleUserIds,
  });
  const nonFixedHosts = hosts.filter((host) => !host.isFixed);

  let unavailableUserIds = new Set<number>();
  try {
    const eventType = await getEventTypesFromDB(booking.eventTypeId);
    // eventType.users is the legacy, largely-unpopulated user_eventtype relation - team round-robin
    // event types record their real host list on eventType.hosts (Host join rows), same source
    // loadUsersByEventType() uses at booking-creation time.
    const candidateUsers = eventType.hosts
      .filter((host) => nonFixedHosts.some((h) => h.userId === host.user.id))
      .map((host) => ({
        ...host.user,
        isFixed: host.isFixed,
        priority: host.priority,
        weight: host.weight,
        groupId: host.groupId,
      })) as IsFixedAwareUser[];
    if (candidateUsers.length > 0) {
      const availableUsers = await ensureAvailableUsers(
        { ...eventType, users: candidateUsers },
        {
          dateFrom: dayjs(booking.startTime).format(),
          dateTo: dayjs(booking.endTime).format(),
          timeZone: candidateUsers[0].timeZone,
        },
        log
      ).catch(() => []);
      const availableUserIds = new Set(availableUsers.map((user) => user.id));
      unavailableUserIds = new Set(
        candidateUsers.filter((user) => !availableUserIds.has(user.id)).map((user) => user.id)
      );
    }
  } catch (error) {
    log.warn("Unable to compute candidate availability, defaulting all to available", { error });
  }

  const items = nonFixedHosts.map((host) => ({
    id: host.userId,
    name: host.name,
    email: host.email,
    status: unavailableUserIds.has(host.userId) ? "unavailable" : "available",
  }));

  return { items, nextCursor, hasMore };
};

export const getReassignmentCandidates = withReporting(
  _getReassignmentCandidates,
  "getReassignmentCandidates"
);
