import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAcceptInviteInputSchema } from "./acceptInvite.schema";
import { ZChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetPermissionSettingsInputSchema } from "./getPermissionSettings.schema";
import { ZGetRoundRobinHostsToReassignInputSchema } from "./getRoundRobinHostsToReassign.schema";
import { ZHolidaySettingsInputSchema } from "./holidaySettings.schema";
import { ZHolidayToggleInputSchema } from "./holidayToggle.schema";
import { ZHolidayUpdateSettingsInputSchema } from "./holidayUpdateSettings.schema";
import { ZInviteInputSchema } from "./invite.schema";
import { ZLeaveTeamInputSchema } from "./leaveTeam.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { ZListPaginatedInputSchema } from "./listPaginated.schema";
import { ZOOOCreateInputSchema } from "./oooCreate.schema";
import { ZOOODeleteInputSchema } from "./oooDelete.schema";
import { ZOOOListInputSchema } from "./oooList.schema";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { ZRoundRobinManualReassignInputSchema } from "./roundRobinManualReassign.schema";
import { ZRoundRobinReassignInputSchema } from "./roundRobinReassign.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdatePermissionSettingsInputSchema } from "./updatePermissionSettings.schema";

export const teamsRouter = router({
  // Create a new team
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({ ctx, input });
  }),

  // Get a team the user is a member of
  get: authedProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
    const { getHandler } = await import("./get.handler");

    return getHandler({ ctx, input });
  }),

  // List teams the user is a member of
  list: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({ ctx });
  }),

  // List teams the user is a member of, paginated + searchable (used by the teams list UI)
  listPaginated: authedProcedure.input(ZListPaginatedInputSchema).query(async ({ ctx, input }) => {
    const { listPaginatedHandler } = await import("./listPaginated.handler");

    return listPaginatedHandler({ ctx, input });
  }),

  // List the current user's own pending (not yet accepted) invites, across all teams
  listMyPendingInvites: authedProcedure.query(async ({ ctx }) => {
    const { listMyPendingInvitesHandler } = await import("./listMyPendingInvites.handler");

    return listMyPendingInvitesHandler({ ctx });
  }),

  // Update a team's own settings (name, slug, branding)
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({ ctx, input });
  }),

  // Delete a team (owner only)
  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("./delete.handler");

    return deleteHandler({ ctx, input });
  }),

  // Invite a member by email (team admin/owner only)
  invite: authedProcedure.input(ZInviteInputSchema).mutation(async ({ ctx, input }) => {
    const { inviteHandler } = await import("./invite.handler");

    return inviteHandler({ ctx, input });
  }),

  // Accept a pending invite as the currently logged-in invitee
  acceptInvite: authedProcedure.input(ZAcceptInviteInputSchema).mutation(async ({ ctx, input }) => {
    const { acceptInviteHandler } = await import("./acceptInvite.handler");

    return acceptInviteHandler({ ctx, input });
  }),

  // List members (and pending invites) of a team
  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async ({ ctx, input }) => {
    const { listMembersHandler } = await import("./listMembers.handler");

    return listMembersHandler({ ctx, input });
  }),

  // Change a member's role (team admin/owner only)
  changeMemberRole: authedProcedure.input(ZChangeMemberRoleInputSchema).mutation(async ({ ctx, input }) => {
    const { changeMemberRoleHandler } = await import("./changeMemberRole.handler");

    return changeMemberRoleHandler({ ctx, input });
  }),

  // Remove a member from a team (team admin/owner only)
  removeMember: authedProcedure.input(ZRemoveMemberInputSchema).mutation(async ({ ctx, input }) => {
    const { removeMemberHandler } = await import("./removeMember.handler");

    return removeMemberHandler({ ctx, input });
  }),

  // Leave a team as the currently logged-in member (owners must delete the team instead)
  leaveTeam: authedProcedure.input(ZLeaveTeamInputSchema).mutation(async ({ ctx, input }) => {
    const { leaveTeamHandler } = await import("./leaveTeam.handler");

    return leaveTeamHandler({ ctx, input });
  }),

  // List a team's own closures/time-off entries (any accepted member can view)
  oooList: authedProcedure.input(ZOOOListInputSchema).query(async ({ ctx, input }) => {
    const { oooListHandler } = await import("./oooList.handler");

    return oooListHandler({ ctx, input });
  }),

  // Add a team-wide closure/time-off entry (team admin/owner only)
  oooCreate: authedProcedure.input(ZOOOCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { oooCreateHandler } = await import("./oooCreate.handler");

    return oooCreateHandler({ ctx, input });
  }),

  // Remove a team-wide closure/time-off entry (team admin/owner only)
  oooDelete: authedProcedure.input(ZOOODeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { oooDeleteHandler } = await import("./oooDelete.handler");

    return oooDeleteHandler({ ctx, input });
  }),

  // Get a team's public-holiday country + which holidays are enabled (any accepted member can view)
  holidaySettings: authedProcedure.input(ZHolidaySettingsInputSchema).query(async ({ ctx, input }) => {
    const { holidaySettingsHandler } = await import("./holidaySettings.handler");

    return holidaySettingsHandler({ ctx, input });
  }),

  // Set a team's public-holiday country (team admin/owner only)
  holidayUpdateSettings: authedProcedure
    .input(ZHolidayUpdateSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { holidayUpdateSettingsHandler } = await import("./holidayUpdateSettings.handler");

      return holidayUpdateSettingsHandler({ ctx, input });
    }),

  // Enable/disable one of the team's country's public holidays (team admin/owner only)
  holidayToggle: authedProcedure.input(ZHolidayToggleInputSchema).mutation(async ({ ctx, input }) => {
    const { holidayToggleHandler } = await import("./holidayToggle.handler");

    return holidayToggleHandler({ ctx, input });
  }),

  // Get the team's per-action minimum-role permission matrix (any accepted member can view)
  getPermissionSettings: authedProcedure
    .input(ZGetPermissionSettingsInputSchema)
    .query(async ({ ctx, input }) => {
      const { getPermissionSettingsHandler } = await import("./getPermissionSettings.handler");

      return getPermissionSettingsHandler({ ctx, input });
    }),

  // Update the team's per-action minimum-role permission matrix (team owner only)
  updatePermissionSettings: authedProcedure
    .input(ZUpdatePermissionSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { updatePermissionSettingsHandler } = await import("./updatePermissionSettings.handler");

      return updatePermissionSettingsHandler({ ctx, input });
    }),

  // Reassign dialog's candidate picker - round-robin hosts of the booking's event type eligible
  // per the team's configured booking.reassign minimum role
  getRoundRobinHostsToReassign: authedProcedure
    .input(ZGetRoundRobinHostsToReassignInputSchema)
    .query(async ({ ctx, input }) => {
      const { getRoundRobinHostsToReassignHandler } = await import("./getRoundRobinHostsToReassign.handler");

      return getRoundRobinHostsToReassignHandler({ ctx, input });
    }),

  // Automatically pick a new host for a round-robin booking
  roundRobinReassign: authedProcedure
    .input(ZRoundRobinReassignInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { roundRobinReassignHandler } = await import("./roundRobinReassign.handler");

      return roundRobinReassignHandler({ ctx, input });
    }),

  // Reassign a round-robin booking to a specific, caller-chosen host
  roundRobinManualReassign: authedProcedure
    .input(ZRoundRobinManualReassignInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { roundRobinManualReassignHandler } = await import("./roundRobinManualReassign.handler");

      return roundRobinManualReassignHandler({ ctx, input });
    }),
});
