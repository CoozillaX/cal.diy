import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiParam, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateTeamInputDto } from "@/modules/teams/inputs/create-team.input";
import {
  TeamOutputDto,
  TeamOutputResponseDto,
  TeamsOutputResponseDto,
} from "@/modules/teams/outputs/team.output";
import { TeamsManagementService } from "@/modules/teams/services/teams-management.service";
import { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/teams",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard)
@DocsTags("Teams")
@ApiHeader(API_KEY_HEADER)
export class TeamsController {
  constructor(private readonly teamsManagementService: TeamsManagementService) {}

  @Post("/")
  @ApiOperation({
    summary: "Create a team",
    description: "The authenticated user (e.g. a store-management API key's owner) becomes the team owner.",
  })
  async createTeam(
    @Body() body: CreateTeamInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<TeamOutputResponseDto> {
    const team = await this.teamsManagementService.createTeam(user, body);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }

  @Get("/")
  @ApiOperation({ summary: "List teams the authenticated user belongs to" })
  async getTeams(@GetUser("id") userId: number): Promise<TeamsOutputResponseDto> {
    const teams = await this.teamsManagementService.getTeamsForUser(userId);

    return {
      status: SUCCESS_STATUS,
      data: teams.map((team) => plainToClass(TeamOutputDto, team, { strategy: "excludeAll" })),
    };
  }

  @Get("/:teamId")
  @UseGuards(RolesGuard)
  @Roles("TEAM_MEMBER")
  @ApiParam({ name: "teamId", type: Number, required: true })
  @ApiOperation({ summary: "Get a team by id" })
  async getTeam(@Param("teamId", ParseIntPipe) teamId: number): Promise<TeamOutputResponseDto> {
    const team = await this.teamsManagementService.getTeam(teamId);

    if (!team) {
      throw new NotFoundException(`Team with id ${teamId} not found`);
    }

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamOutputDto, team, { strategy: "excludeAll" }),
    };
  }
}
