import { v5 as uuidv5 } from "uuid";

import { Prisma } from "../client";
import { BookingStatus } from "../enums";

function generateIdempotencyKey({
  startTime,
  endTime,
  userId,
  reassignedById,
  attendeeEmails,
}: {
  startTime: Date | string;
  endTime: Date | string;
  userId?: number;
  reassignedById?: number | null;
  attendeeEmails?: string[];
}) {
  // Attendee emails are folded in so that two *different* attendees can each get their own
  // accepted booking at the identical (organizer, startTime, endTime) tuple - needed for a host
  // marked Host.ignoreTimeConflicts, who can legitimately hold more than one booking at once.
  // A resubmission by the same attendee (double-click, retry) still hashes to the same key since
  // their email doesn't change, so that dedup guarantee is unaffected.
  const attendeeSuffix = attendeeEmails?.length
    ? `.${[...attendeeEmails].sort().join(",").toLowerCase()}`
    : "";
  return uuidv5(
    `${startTime.valueOf()}.${endTime.valueOf()}.${userId}${reassignedById ? `.${reassignedById}` : ""}${attendeeSuffix}`,
    uuidv5.URL
  );
}

function getAttendeeEmailsFromCreateInput(
  attendees: Prisma.BookingCreateInput["attendees"]
): string[] | undefined {
  const data = attendees && "createMany" in attendees ? attendees.createMany?.data : undefined;
  if (!data) return undefined;
  return (Array.isArray(data) ? data : [data]).map((attendee) => attendee.email);
}

export function bookingIdempotencyKeyExtension() {
  return Prisma.defineExtension({
    query: {
      booking: {
        async create({ args, query }) {
          if (args.data.status === BookingStatus.ACCEPTED) {
            const idempotencyKey = generateIdempotencyKey({
              startTime: args.data.startTime,
              endTime: args.data.endTime,
              userId: args.data.user?.connect?.id,
              reassignedById: args.data.reassignById,
              attendeeEmails: getAttendeeEmailsFromCreateInput(args.data.attendees),
            });
            args.data.idempotencyKey = idempotencyKey;
          }
          return query(args);
        },
        async update({ args, query }) {
          if (args.data.status === BookingStatus.CANCELLED || args.data.status === BookingStatus.REJECTED) {
            args.data.idempotencyKey = null;
          }
          return query(args);
        },
        async updateMany({ args, query }) {
          if (args.data.status === BookingStatus.CANCELLED || args.data.status === BookingStatus.REJECTED) {
            args.data.idempotencyKey = null;
          }
          return query(args);
        },
      },
    },
  });
}
