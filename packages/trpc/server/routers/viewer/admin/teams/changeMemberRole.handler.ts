import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TAdminChangeMemberRoleInputSchema } from "./changeMemberRole.schema";

type ChangeMemberRoleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminChangeMemberRoleInputSchema;
};

export const adminChangeMemberRoleHandler = async ({ input }: ChangeMemberRoleOptions) => {
  const teamService = getTeamService();
  return teamService.adminChangeMemberRole({
    teamId: input.teamId,
    targetUserId: input.memberId,
    role: input.role,
  });
};
