import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetTeamEventTypesQuery_2024_06_14 } from "@calcom/platform-types";
import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiParam, ApiTags as DocsTags } from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { GetTeamEventTypesOutput_2024_06_14 } from "@/modules/teams/event-types/outputs/get-team-event-types.output";
import { OutputTeamEventTypesResponsePipe } from "@/modules/teams/event-types/pipes/output-team-event-types-response.pipe";
import { TeamsEventTypesService } from "@/modules/teams/event-types/services/teams-event-types.service";
import { GetEventTypeOutput_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/outputs/get-event-type.output";

@Controller({
  path: "/v2/teams/:teamId/event-types",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams Event Types")
@ApiHeader(API_KEY_HEADER)
export class TeamsEventTypesController {
  constructor(
    private readonly teamsEventTypesService: TeamsEventTypesService,
    private readonly outputTeamEventTypesResponsePipe: OutputTeamEventTypesResponsePipe
  ) {}

  @Get("/")
  @Roles("TEAM_MEMBER")
  @ApiParam({ name: "teamId", type: Number, required: true })
  @ApiOperation({
    summary: "Get team event types",
    description:
      "Looks up team event types by team id. Pass `eventSlug` to resolve a single event type's id " +
      "from a semantic slug (e.g. for a staff backend that only knows the slug it configured, not the " +
      "numeric event type id) instead of hardcoding the id. Omit it to list every event type on the team.",
  })
  async getTeamEventTypes(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() query: GetTeamEventTypesQuery_2024_06_14
  ): Promise<GetEventTypeOutput_2024_06_14 | GetTeamEventTypesOutput_2024_06_14> {
    if (query.eventSlug) {
      return this.getTeamEventTypeBySlug(teamId, query.eventSlug, query.hostsLimit);
    }

    const eventTypes = await this.teamsEventTypesService.getTeamEventTypes(teamId, query.sortCreatedAt);

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventTypes),
    };
  }

  private async getTeamEventTypeBySlug(
    teamId: number,
    eventSlug: string,
    hostsLimit?: number
  ): Promise<GetEventTypeOutput_2024_06_14> {
    const eventType = await this.teamsEventTypesService.getTeamEventTypeBySlug(teamId, eventSlug, hostsLimit);

    if (!eventType) {
      throw new NotFoundException(`Event type with slug "${eventSlug}" not found for team with id ${teamId}`);
    }

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventType),
    };
  }
}
