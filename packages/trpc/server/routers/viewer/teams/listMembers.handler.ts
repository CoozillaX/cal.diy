import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";
import type { TListMembersInputSchema } from "./listMembers.schema";

type ListMembersHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
  input: TListMembersInputSchema;
};

export const listMembersHandler = async ({ ctx, input }: ListMembersHandlerOptions) => {
  const teamService = getTeamService();

  return teamService.listMembers({
    teamId: input.teamId,
    userId: ctx.user.id,
  });
};
