import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";
import type { TLeaveTeamInputSchema } from "./leaveTeam.schema";

type LeaveTeamHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: TLeaveTeamInputSchema;
};

export const leaveTeamHandler = async ({ ctx, input }: LeaveTeamHandlerOptions) => {
  const teamService = getTeamService();

  return teamService.leaveTeam({
    teamId: input.teamId,
    userId: ctx.user.id,
  });
};
