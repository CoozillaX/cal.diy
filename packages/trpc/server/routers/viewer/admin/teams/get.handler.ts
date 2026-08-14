import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TAdminGetTeamInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetTeamInputSchema;
};

export const adminGetTeamHandler = async ({ input }: GetOptions) => {
  const teamService = getTeamService();
  return teamService.adminGetTeam({ teamId: input.teamId });
};
