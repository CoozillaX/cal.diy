import dayjs from "@calcom/dayjs";
import { buildDateRanges } from "@calcom/features/schedules/lib/date-ranges";
import { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";
import { getDateTimeInUtc, hasDateRangeForBooking } from "./ensureAvailableUsers";
import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { IsFixedAwareUser } from "./types";

const log = logger.getSubLogger({ prefix: ["resolveFallbackHost"] });

/**
 * Resolves the event type's designated last-resort assignee (EventType.fallbackHostUserId) into
 * a bookable user, or null if none is configured or they're outside their own working hours at
 * this time.
 *
 * Deliberately computed from their raw schedule via buildDateRanges rather than the full
 * getUsersAvailability pipeline: that pipeline subtracts busy times (both external calendar and
 * existing Cal.com bookings) from the returned date ranges before you ever see them, which would
 * reject the fallback host in exactly the "everyone including them is already busy" scenario
 * they exist to cover. Skipping the busy-time-aware pipeline entirely - not just passing a
 * bypass flag - is what actually gets "always bookable regardless of conflicts, bounded only by
 * their configured working hours."
 */
const _resolveFallbackHost = async (
  eventType: Pick<getEventTypeResponse, "fallbackHostUserId">,
  input: { dateFrom: string; dateTo: string; timeZone: string }
): Promise<IsFixedAwareUser | null> => {
  if (!eventType.fallbackHostUserId) {
    return null;
  }

  const scheduleRepo = new ScheduleRepository(prisma);
  let scheduleId: number;
  try {
    scheduleId = await scheduleRepo.getDefaultScheduleId(eventType.fallbackHostUserId);
  } catch {
    log.warn(`Fallback host ${eventType.fallbackHostUserId} has no schedule configured`);
    return null;
  }

  const schedule = await scheduleRepo.findScheduleByIdForBuildDateRanges({ scheduleId });
  if (!schedule) {
    return null;
  }

  const startDateTimeUtc = getDateTimeInUtc(input.dateFrom, input.timeZone);
  const endDateTimeUtc = getDateTimeInUtc(input.dateTo, input.timeZone);

  const isDefaultSchedule = schedule.user.defaultScheduleId === schedule.id;
  const travelSchedules = isDefaultSchedule
    ? schedule.user.travelSchedules.map((travelSchedule) => ({
        startDate: dayjs(travelSchedule.startDate),
        endDate: travelSchedule.endDate ? dayjs(travelSchedule.endDate) : undefined,
        timeZone: travelSchedule.timeZone,
      }))
    : [];

  // No `outOfOffice` passed - buildDateRanges then returns oooExcludedDateRanges identical to
  // dateRanges, i.e. purely schedule-derived with no OOO (or busy-time) subtraction at all.
  const { dateRanges } = buildDateRanges({
    availability: schedule.availability,
    timeZone: schedule.timeZone ?? input.timeZone,
    dateFrom: startDateTimeUtc,
    dateTo: endDateTimeUtc,
    travelSchedules,
  });

  if (!hasDateRangeForBooking(dateRanges, startDateTimeUtc, endDateTimeUtc)) {
    return null;
  }

  const userRepo = new UserRepository(prisma);
  const [fallbackUser] = await userRepo.findManyByIdsWithCredentialsAndSelectedCalendars({
    userIds: [eventType.fallbackHostUserId],
  });
  if (!fallbackUser) {
    return null;
  }

  return {
    ...fallbackUser,
    isFixed: true,
    groupId: null,
  } as IsFixedAwareUser;
};

export const resolveFallbackHost = withReporting(_resolveFallbackHost, "resolveFallbackHost");
