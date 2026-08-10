import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import { getTranslation } from "@calcom/i18n/server";
import type { TrpcSessionUser } from "../../../types";
import type { TInviteInputSchema } from "./invite.schema";

type InviteHandlerOptions = {
  ctx: { user: Pick<NonNullable<TrpcSessionUser>, "id" | "name" | "username" | "locale"> };
  input: TInviteInputSchema;
};

export const inviteHandler = async ({ ctx, input }: InviteHandlerOptions) => {
  const teamService = getTeamService();
  const language = await getTranslation(ctx.user.locale ?? "en", "common");

  return teamService.inviteMember({
    teamId: input.teamId,
    invitedByUserId: ctx.user.id,
    inviterName: ctx.user.name ?? ctx.user.username ?? "",
    inviteeEmail: input.email,
    language,
  });
};
