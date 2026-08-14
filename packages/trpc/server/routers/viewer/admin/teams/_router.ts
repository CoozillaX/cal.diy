import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZAdminAddMemberInputSchema } from "./addMember.schema";
import { ZAdminChangeMemberRoleInputSchema } from "./changeMemberRole.schema";
import { ZAdminCreateTeamInputSchema } from "./create.schema";
import { ZAdminDeleteTeamInputSchema } from "./delete.schema";
import { ZAdminGetTeamInputSchema } from "./get.schema";
import { ZAdminListTeamsInputSchema } from "./list.schema";
import { ZAdminListMembersInputSchema } from "./listMembers.schema";
import { ZAdminRemoveMemberInputSchema } from "./removeMember.schema";
import { ZAdminUpdateTeamInputSchema } from "./update.schema";

/** Platform-admin, unrestricted team management - not gated by membership in the target team. */
export const adminTeamsRouter = router({
  list: authedAdminProcedure.input(ZAdminListTeamsInputSchema).query(async (opts) => {
    const { adminListTeamsHandler } = await import("./list.handler");
    return adminListTeamsHandler(opts);
  }),
  get: authedAdminProcedure.input(ZAdminGetTeamInputSchema).query(async (opts) => {
    const { adminGetTeamHandler } = await import("./get.handler");
    return adminGetTeamHandler(opts);
  }),
  create: authedAdminProcedure.input(ZAdminCreateTeamInputSchema).mutation(async (opts) => {
    const { adminCreateTeamHandler } = await import("./create.handler");
    return adminCreateTeamHandler(opts);
  }),
  update: authedAdminProcedure.input(ZAdminUpdateTeamInputSchema).mutation(async (opts) => {
    const { adminUpdateTeamHandler } = await import("./update.handler");
    return adminUpdateTeamHandler(opts);
  }),
  delete: authedAdminProcedure.input(ZAdminDeleteTeamInputSchema).mutation(async (opts) => {
    const { adminDeleteTeamHandler } = await import("./delete.handler");
    return adminDeleteTeamHandler(opts);
  }),
  addMember: authedAdminProcedure.input(ZAdminAddMemberInputSchema).mutation(async (opts) => {
    const { adminAddMemberHandler } = await import("./addMember.handler");
    return adminAddMemberHandler(opts);
  }),
  removeMember: authedAdminProcedure.input(ZAdminRemoveMemberInputSchema).mutation(async (opts) => {
    const { adminRemoveMemberHandler } = await import("./removeMember.handler");
    return adminRemoveMemberHandler(opts);
  }),
  listMembers: authedAdminProcedure.input(ZAdminListMembersInputSchema).query(async (opts) => {
    const { adminListMembersHandler } = await import("./listMembers.handler");
    return adminListMembersHandler(opts);
  }),
  changeMemberRole: authedAdminProcedure.input(ZAdminChangeMemberRoleInputSchema).mutation(async (opts) => {
    const { adminChangeMemberRoleHandler } = await import("./changeMemberRole.handler");
    return adminChangeMemberRoleHandler(opts);
  }),
});
