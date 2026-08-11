import { getTeamOOORepository } from "@calcom/features/di/containers/TeamOoo";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TOOOListInputSchema } from "./oooList.schema";
import { assertTeamMember } from "./teamPermission.utils";

type OOOListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOOOListInputSchema;
};

export const oooListHandler = async ({ ctx, input }: OOOListOptions) => {
  await assertTeamMember(ctx.user.id, input.teamId);

  return getTeamOOORepository().findByTeamId({ teamId: input.teamId });
};

export default oooListHandler;
