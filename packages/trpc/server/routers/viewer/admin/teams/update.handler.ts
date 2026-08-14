import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TAdminUpdateTeamInputSchema } from "./update.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminUpdateTeamInputSchema;
};

export const adminUpdateTeamHandler = async ({ input }: UpdateOptions) => {
  const teamService = getTeamService();
  const { teamId, ...data } = input;

  return teamService.adminUpdateTeam({ teamId, data });
};
