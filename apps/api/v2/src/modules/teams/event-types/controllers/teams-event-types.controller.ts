import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateTeamEventTypeInput_2024_06_14,
  GetTeamEventTypesQuery_2024_06_14,
} from "@calcom/platform-types";
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiParam, ApiTags as DocsTags } from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { GetTeamEventTypesOutput_2024_06_14 } from "@/modules/teams/event-types/outputs/get-team-event-types.output";
import { OutputTeamEventTypesResponsePipe } from "@/modules/teams/event-types/pipes/output-team-event-types-response.pipe";
import { TeamsEventTypesService } from "@/modules/teams/event-types/services/teams-event-types.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { GetEventTypeOutput_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/outputs/get-event-type.output";
import { InputEventTypesService_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/services/input-event-types.service";

@Controller({
  path: "/v2/teams/:teamId/event-types",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams Event Types")
@ApiHeader(API_KEY_HEADER)
@ApiParam({ name: "teamId", type: Number, required: true })
export class TeamsEventTypesController {
  constructor(
    private readonly teamsEventTypesService: TeamsEventTypesService,
    private readonly inputEventTypesService: InputEventTypesService_2024_06_14,
    private readonly outputTeamEventTypesResponsePipe: OutputTeamEventTypesResponsePipe
  ) {}

  @Get("/")
  @Roles("TEAM_MEMBER")
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

  @Post("/")
  @Roles("TEAM_ADMIN")
  @ApiOperation({
    summary: "Create a team event type",
    description:
      "Locations are optional and default to a Cal Video link, same as the individual-user create " +
      "endpoint - team-only location kinds (attendeeDefined, organizersDefaultApp) go through the same " +
      "transform as the individual endpoint but haven't been exercised against those specific kinds yet.",
  })
  async createTeamEventType(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: CreateTeamEventTypeInput_2024_06_14,
    @GetUser() user: UserWithProfile
  ): Promise<GetEventTypeOutput_2024_06_14> {
    const transformedBody = await this.inputEventTypesService.transformAndValidateCreateTeamEventTypeInput(
      user,
      body
    );
    const created = await this.teamsEventTypesService.createTeamEventType(user, teamId, transformedBody);
    const eventType = Array.isArray(created) ? created[0] : created;

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventType),
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
