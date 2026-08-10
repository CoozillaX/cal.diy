import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteHandlerOptions) => {
  const teamService = getTeamService();

  return teamService.deleteTeam({
    teamId: input.teamId,
    userId: ctx.user.id,
  });
};
