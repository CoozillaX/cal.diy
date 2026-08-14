import { getTeamOOORepository } from "@calcom/features/di/containers/TeamOoo";
import type { TrpcSessionUser } from "../../../../types";
import type { TOOOListInputSchema } from "../../teams/oooList.schema";

type OOOListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOOOListInputSchema;
};

export const adminOooListHandler = async ({ input }: OOOListOptions) => {
  return getTeamOOORepository().findByTeamId({ teamId: input.teamId });
};
