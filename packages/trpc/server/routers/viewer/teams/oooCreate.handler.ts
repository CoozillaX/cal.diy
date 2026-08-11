import { getTeamOOORepository } from "@calcom/features/di/containers/TeamOoo";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TOOOCreateInputSchema } from "./oooCreate.schema";
import { assertTeamAdminOrOwner } from "./teamPermission.utils";

type OOOCreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOOOCreateInputSchema;
};

export const oooCreateHandler = async ({ ctx, input }: OOOCreateOptions) => {
  await assertTeamAdminOrOwner(ctx.user.id, input.teamId);

  if (input.start > input.end) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "start_date_must_be_before_end_date" });
  }

  return getTeamOOORepository().create({
    teamId: input.teamId,
    start: input.start,
    end: input.end,
    notes: input.notes,
    reasonId: input.reasonId,
    createdById: ctx.user.id,
  });
};

export default oooCreateHandler;
