import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { TrpcSessionUser } from "../../../types";

type ListMyPendingInvitesHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id"> };
};

export const listMyPendingInvitesHandler = async ({ ctx }: ListMyPendingInvitesHandlerOptions) => {
  const teamService = getTeamService();

  return teamService.listMyPendingInvites({ userId: ctx.user.id });
};
