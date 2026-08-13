import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiParam, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateMembershipInputDto } from "@/modules/teams/inputs/create-membership.input";
import { UpdateMembershipInputDto } from "@/modules/teams/inputs/update-membership.input";
import {
  MembershipOutputDto,
  MembershipOutputResponseDto,
  MembershipsOutputResponseDto,
} from "@/modules/teams/outputs/membership.output";
import { TeamsManagementService } from "@/modules/teams/services/teams-management.service";

@Controller({
  path: "/v2/teams/:teamId/memberships",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams Memberships")
@ApiHeader(API_KEY_HEADER)
@ApiParam({ name: "teamId", type: Number, required: true })
export class TeamMembershipsController {
  constructor(private readonly teamsManagementService: TeamsManagementService) {}

  // note: RolesGuard reads @Roles() off context.getHandler() only, not the class, so this has to be
  // repeated per method rather than declared once at the controller level.
  @Get("/")
  @Roles("TEAM_MEMBER")
  @ApiOperation({ summary: "List team members" })
  async listMembers(@Param("teamId", ParseIntPipe) teamId: number): Promise<MembershipsOutputResponseDto> {
    const memberships = await this.teamsManagementService.listMembers(teamId);

    return {
      status: SUCCESS_STATUS,
      data: memberships.map((membership) =>
        plainToClass(MembershipOutputDto, membership, { strategy: "excludeAll" })
      ),
    };
  }

  @Post("/")
  @Roles("TEAM_ADMIN")
  @ApiOperation({ summary: "Add a team member" })
  async addMember(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: CreateMembershipInputDto
  ): Promise<MembershipOutputResponseDto> {
    const membership = await this.teamsManagementService.addMember(teamId, body);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(MembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }

  @Patch("/:userId")
  @Roles("TEAM_ADMIN")
  @ApiParam({ name: "userId", type: Number, required: true })
  @ApiOperation({ summary: "Change a team member's role" })
  async updateMemberRole(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Body() body: UpdateMembershipInputDto
  ): Promise<MembershipOutputResponseDto> {
    const membership = await this.teamsManagementService.updateMemberRole(teamId, userId, body);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(MembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }

  @Delete("/:userId")
  @Roles("TEAM_ADMIN")
  @ApiParam({ name: "userId", type: Number, required: true })
  @ApiOperation({ summary: "Remove a team member" })
  async removeMember(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("userId", ParseIntPipe) userId: number
  ): Promise<MembershipOutputResponseDto> {
    const membership = await this.teamsManagementService.removeMember(teamId, userId);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(MembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }
}
