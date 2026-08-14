import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TAdminListTeamsInputSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminListTeamsInputSchema;
};

export const adminListTeamsHandler = async ({ input }: ListOptions) => {
  const teamService = getTeamService();
  const { cursor, limit, searchTerm } = input;

  const { teams, total, nextCursor } = await teamService.adminListTeams({ searchTerm, cursor, limit });

  return {
    rows: teams,
    nextCursor,
    meta: {
      totalRowCount: total,
    },
  };
};
