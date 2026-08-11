import { getTeamOOORepository } from "@calcom/features/di/containers/TeamOoo";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TOOODeleteInputSchema } from "./oooDelete.schema";
import { assertTeamAdminOrOwner } from "./teamPermission.utils";

type OOODeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOOODeleteInputSchema;
};

export const oooDeleteHandler = async ({ ctx, input }: OOODeleteOptions) => {
  await assertTeamAdminOrOwner(ctx.user.id, input.teamId);

  const { count } = await getTeamOOORepository().delete({ id: input.id, teamId: input.teamId });
  if (count === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Time off entry not found" });
  }

  return { success: true };
};

export default oooDeleteHandler;
