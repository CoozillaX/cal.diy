import type { PrismaTeamOOORepository } from "@calcom/features/ooo/repositories/PrismaTeamOOORepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { prismaModule } from "@calcom/features/di/modules/Prisma";

import { createContainer } from "../di";
import { teamOooRepositoryModule } from "../modules/TeamOoo";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.TEAM_OOO_REPOSITORY_MODULE, teamOooRepositoryModule);

export function getTeamOOORepository() {
  return container.get<PrismaTeamOOORepository>(DI_TOKENS.TEAM_OOO_REPOSITORY);
}
