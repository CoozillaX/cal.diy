import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TAdminDeleteTeamInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminDeleteTeamInputSchema;
};

export const adminDeleteTeamHandler = async ({ input }: DeleteOptions) => {
  const teamService = getTeamService();
  return teamService.adminDeleteTeam({ teamId: input.teamId });
};
