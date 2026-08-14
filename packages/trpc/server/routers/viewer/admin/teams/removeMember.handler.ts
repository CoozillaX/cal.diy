import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TAdminRemoveMemberInputSchema } from "./removeMember.schema";

type RemoveMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminRemoveMemberInputSchema;
};

export const adminRemoveMemberHandler = async ({ input }: RemoveMemberOptions) => {
  const teamService = getTeamService();
  return teamService.adminRemoveMember(input);
};
