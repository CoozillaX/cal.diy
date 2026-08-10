import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";
import type { TChangeMemberRoleInputSchema } from "./changeMemberRole.schema";

type ChangeMemberRoleHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: TChangeMemberRoleInputSchema;
};

export const changeMemberRoleHandler = async ({ ctx, input }: ChangeMemberRoleHandlerOptions) => {
  const teamService = getTeamService();

  return teamService.changeMemberRole({
    teamId: input.teamId,
    actingUserId: ctx.user.id,
    targetUserId: input.memberId,
    role: input.role,
  });
};
