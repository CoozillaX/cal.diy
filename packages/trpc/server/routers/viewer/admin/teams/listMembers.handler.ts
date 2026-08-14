import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TAdminListMembersInputSchema } from "./listMembers.schema";

type ListMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminListMembersInputSchema;
};

export const adminListMembersHandler = async ({ input }: ListMembersOptions) => {
  const teamService = getTeamService();
  return teamService.adminListMembers({ teamId: input.teamId });
};
