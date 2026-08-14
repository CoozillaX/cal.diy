import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZGetPermissionSettingsInputSchema } from "../../teams/getPermissionSettings.schema";
import { ZHolidaySettingsInputSchema } from "../../teams/holidaySettings.schema";
import { ZHolidayToggleInputSchema } from "../../teams/holidayToggle.schema";
import { ZHolidayUpdateSettingsInputSchema } from "../../teams/holidayUpdateSettings.schema";
import { ZOOOCreateInputSchema } from "../../teams/oooCreate.schema";
import { ZOOODeleteInputSchema } from "../../teams/oooDelete.schema";
import { ZOOOListInputSchema } from "../../teams/oooList.schema";
import { ZUpdatePermissionSettingsInputSchema } from "../../teams/updatePermissionSettings.schema";
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
  getPermissionSettings: authedAdminProcedure.input(ZGetPermissionSettingsInputSchema).query(async (opts) => {
    const { adminGetPermissionSettingsHandler } = await import("./getPermissionSettings.handler");
    return adminGetPermissionSettingsHandler(opts);
  }),
  updatePermissionSettings: authedAdminProcedure
    .input(ZUpdatePermissionSettingsInputSchema)
    .mutation(async (opts) => {
      const { adminUpdatePermissionSettingsHandler } = await import("./updatePermissionSettings.handler");
      return adminUpdatePermissionSettingsHandler(opts);
    }),
  oooList: authedAdminProcedure.input(ZOOOListInputSchema).query(async (opts) => {
    const { adminOooListHandler } = await import("./oooList.handler");
    return adminOooListHandler(opts);
  }),
  oooCreate: authedAdminProcedure.input(ZOOOCreateInputSchema).mutation(async (opts) => {
    const { adminOooCreateHandler } = await import("./oooCreate.handler");
    return adminOooCreateHandler(opts);
  }),
  oooDelete: authedAdminProcedure.input(ZOOODeleteInputSchema).mutation(async (opts) => {
    const { adminOooDeleteHandler } = await import("./oooDelete.handler");
    return adminOooDeleteHandler(opts);
  }),
  holidaySettings: authedAdminProcedure.input(ZHolidaySettingsInputSchema).query(async (opts) => {
    const { adminHolidaySettingsHandler } = await import("./holidaySettings.handler");
    return adminHolidaySettingsHandler(opts);
  }),
  holidayUpdateSettings: authedAdminProcedure
    .input(ZHolidayUpdateSettingsInputSchema)
    .mutation(async (opts) => {
      const { adminHolidayUpdateSettingsHandler } = await import("./holidayUpdateSettings.handler");
      return adminHolidayUpdateSettingsHandler(opts);
    }),
  holidayToggle: authedAdminProcedure.input(ZHolidayToggleInputSchema).mutation(async (opts) => {
    const { adminHolidayToggleHandler } = await import("./holidayToggle.handler");
    return adminHolidayToggleHandler(opts);
  }),
});
