import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TAdminAddMemberInputSchema } from "./addMember.schema";

type AddMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminAddMemberInputSchema;
};

export const adminAddMemberHandler = async ({ input }: AddMemberOptions) => {
  const teamService = getTeamService();
  return teamService.adminAddMember(input);
};
