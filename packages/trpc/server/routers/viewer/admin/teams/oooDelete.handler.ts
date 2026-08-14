import { getTeamOOORepository } from "@calcom/features/di/containers/TeamOoo";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../../types";
import type { TOOODeleteInputSchema } from "../../teams/oooDelete.schema";

type OOODeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOOODeleteInputSchema;
};

export const adminOooDeleteHandler = async ({ input }: OOODeleteOptions) => {
  const { count } = await getTeamOOORepository().delete({ id: input.id, teamId: input.teamId });
  if (count === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Time off entry not found" });
  }

  return { success: true };
};
