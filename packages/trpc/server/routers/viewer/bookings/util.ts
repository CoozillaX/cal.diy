import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import { TEAM_PERMISSIONS } from "@calcom/features/teams/lib/teamPermissions";
import { prisma } from "@calcom/prisma";
import type {
  Attendee,
  Booking,
  BookingReference,
  Credential,
  DestinationCalendar,
  EventType,
  User,
} from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import authedProcedure from "../../../procedures/authedProcedure";
import { commonBookingSchema } from "./types";

export const bookingsProcedure = authedProcedure
  .input(commonBookingSchema)
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    const { bookingId } = input;
    const loggedInUser = ctx.user;
    const bookingInclude = {
      attendees: true,
      eventType: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          },
        },
      },
      destinationCalendar: true,
      references: true,
      user: {
        include: {
          destinationCalendar: true,
          credentials: true,
          profiles: {
            select: {
              organizationId: true,
            },
          },
        },
      },
    };

    // Team members (any role) are candidates here; whether they're actually allowed to edit
    // this booking's location is decided below by the team's configured minimum role for
    // "booking.editLocation", not a hardcoded ADMIN/OWNER check.
    const bookingByTeamMembership = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        eventType: {
          team: {
            members: {
              some: { userId: loggedInUser.id },
            },
          },
        },
      },
      include: bookingInclude,
    });

    const teamId = bookingByTeamMembership?.eventType?.team?.id;
    const hasEditLocationPermission =
      !!teamId &&
      (await getTeamPermissionSettingService().hasPermission({
        teamId,
        userId: loggedInUser.id,
        permissionKey: TEAM_PERMISSIONS.BOOKING_EDIT_LOCATION,
      }));

    if (bookingByTeamMembership && hasEditLocationPermission) {
      return next({ ctx: { booking: bookingByTeamMembership } });
    }

    const bookingByBeingOrganizerOrCollectiveEventMember = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        AND: [
          {
            OR: [
              /* If user is organizer */
              { userId: ctx.user.id },
              /* Or part of a collective booking */
              {
                eventType: {
                  schedulingType: SchedulingType.COLLECTIVE,
                  users: {
                    some: {
                      id: ctx.user.id,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      include: bookingInclude,
    });

    if (!bookingByBeingOrganizerOrCollectiveEventMember) throw new TRPCError({ code: "UNAUTHORIZED" });

    return next({ ctx: { booking: bookingByBeingOrganizerOrCollectiveEventMember } });
  });

export type BookingsProcedureContext = {
  booking: Booking & {
    eventType:
      | (EventType & {
          team?: { id: number; name: string; parentId?: number | null } | null;
        })
      | null;
    destinationCalendar: DestinationCalendar | null;
    user:
      | (User & {
          destinationCalendar: DestinationCalendar | null;
          credentials: Credential[];
          profiles: { organizationId: number }[];
        })
      | null;
    references: BookingReference[];
    attendees: Attendee[];
  };
};
