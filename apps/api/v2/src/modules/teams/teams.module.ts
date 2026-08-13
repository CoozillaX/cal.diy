import { Module } from "@nestjs/common";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TeamsEventTypesController } from "@/modules/teams/event-types/controllers/teams-event-types.controller";
import { OutputTeamEventTypesResponsePipe } from "@/modules/teams/event-types/pipes/output-team-event-types-response.pipe";
import { OutputTeamEventTypesService } from "@/modules/teams/event-types/services/output-team-event-types.service";
import { TeamsEventTypesService } from "@/modules/teams/event-types/services/teams-event-types.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersModule } from "@/modules/users/users.module";
import { UsersRepository } from "@/modules/users/users.repository";
import { EventTypesModule_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.module";

// note: TeamsRepository / TeamsEventTypesRepository are also re-declared as providers in a few other
// modules (event-types, webhooks, slots) rather than imported from here, matching the existing pattern
// in this codebase. Not consolidating that as part of this change to keep the diff scoped.
@Module({
  imports: [PrismaModule, RedisModule, MembershipsModule, EventTypesModule_2024_06_14, UsersModule],
  controllers: [TeamsEventTypesController],
  providers: [
    TeamsRepository,
    TeamsEventTypesRepository,
    TeamsEventTypesService,
    OutputTeamEventTypesService,
    OutputTeamEventTypesResponsePipe,
    UsersRepository,
  ],
  exports: [TeamsRepository, TeamsEventTypesRepository, TeamsEventTypesService],
})
export class TeamsModule {}
