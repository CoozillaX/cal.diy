import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetHandlerOptions) => {
  const teamService = getTeamService();

  return teamService.getTeamForUser({
    teamId: input.teamId,
    userId: ctx.user.id,
  });
};
