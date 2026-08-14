import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../../types";
import type { TAdminCreateTeamInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminCreateTeamInputSchema;
};

export const adminCreateTeamHandler = async ({ input }: CreateOptions) => {
  const teamService = getTeamService();

  return teamService.createTeam({
    name: input.name,
    slug: input.slug,
    logoUrl: input.logoUrl,
    ownerUserId: input.ownerUserId,
  });
};
