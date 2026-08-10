import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";
import type { TRemoveMemberInputSchema } from "./removeMember.schema";

type RemoveMemberHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberHandlerOptions) => {
  const teamService = getTeamService();

  return teamService.removeMember({
    teamId: input.teamId,
    actingUserId: ctx.user.id,
    targetUserId: input.memberId,
  });
};
