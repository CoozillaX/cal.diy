import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaTeamOOORepository } from "@calcom/features/ooo/repositories/PrismaTeamOOORepository";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const teamOooRepositoryModule = createModule();
const token = DI_TOKENS.TEAM_OOO_REPOSITORY;
const moduleToken = DI_TOKENS.TEAM_OOO_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: teamOooRepositoryModule,
  moduleToken,
  token,
  classs: PrismaTeamOOORepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
