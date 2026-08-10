import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";

type ListHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
};

export const listHandler = async ({ ctx }: ListHandlerOptions) => {
  const teamService = getTeamService();

  return teamService.listTeamsForUser({ userId: ctx.user.id });
};
