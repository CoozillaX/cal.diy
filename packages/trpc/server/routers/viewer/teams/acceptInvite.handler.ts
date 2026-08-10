import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";
import type { TAcceptInviteInputSchema } from "./acceptInvite.schema";

type AcceptInviteHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: TAcceptInviteInputSchema;
};

export const acceptInviteHandler = async ({ ctx, input }: AcceptInviteHandlerOptions) => {
  const teamService = getTeamService();

  return teamService.acceptInvite({
    teamId: input.teamId,
    userId: ctx.user.id,
  });
};
