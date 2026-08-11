import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAcceptInviteInputSchema } from "./acceptInvite.schema";
import { ZChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZInviteInputSchema } from "./invite.schema";
import { ZLeaveTeamInputSchema } from "./leaveTeam.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { ZListPaginatedInputSchema } from "./listPaginated.schema";
import { ZRemoveMemberInputSchema } from "./removeMember.schema";
import { ZUpdateInputSchema } from "./update.schema";

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
});
