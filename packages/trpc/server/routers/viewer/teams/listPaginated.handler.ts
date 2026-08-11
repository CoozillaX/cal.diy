import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";
import type { TListPaginatedInputSchema } from "./listPaginated.schema";

type ListPaginatedHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: TListPaginatedInputSchema;
};

export const listPaginatedHandler = async ({ ctx, input }: ListPaginatedHandlerOptions) => {
  const teamService = getTeamService();
  const { limit, cursor, searchTerm } = input;

  const { teams, nextCursor, total } = await teamService.listTeamsForUserPaginated({
    userId: ctx.user.id,
    searchTerm,
    cursor,
    limit,
  });

  return {
    rows: teams,
    nextCursor,
    meta: {
      totalRowCount: total,
    },
  };
};
