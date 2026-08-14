import { getTeamOOORepository } from "@calcom/features/di/containers/TeamOoo";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../../types";
import type { TOOOCreateInputSchema } from "../../teams/oooCreate.schema";

type OOOCreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOOOCreateInputSchema;
};

export const adminOooCreateHandler = async ({ ctx, input }: OOOCreateOptions) => {
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
