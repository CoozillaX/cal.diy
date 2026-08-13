import { MembershipRole } from "@calcom/platform-libraries";
import { Injectable } from "@nestjs/common";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { CreateMembershipInputDto } from "@/modules/teams/inputs/create-membership.input";
import { CreateTeamInputDto } from "@/modules/teams/inputs/create-team.input";
import { UpdateMembershipInputDto } from "@/modules/teams/inputs/update-membership.input";
import { UpdateTeamInputDto } from "@/modules/teams/inputs/update-team.input";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UserWithProfile } from "@/modules/users/users.repository";

@Injectable()
export class TeamsManagementService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository
  ) {}

  async createTeam(user: UserWithProfile, body: CreateTeamInputDto) {
    const team = await this.teamsRepository.create({
      name: body.name,
      slug: body.slug,
      isOrganization: false,
    });

    // The caller becomes owner immediately: a store-management API key needs to keep managing a team
    // (add members, create event types, ...) after creating it, not just hand it off.
    await this.membershipsRepository.createMembership(team.id, user.id, MembershipRole.OWNER, true);

    return team;
  }

  getTeam(teamId: number) {
    return this.teamsRepository.getById(teamId);
  }

  getTeamsForUser(userId: number) {
    return this.teamsRepository.getTeamsUserIsMemberOf(userId);
  }

  updateTeam(teamId: number, body: UpdateTeamInputDto) {
    return this.teamsRepository.update(teamId, {
      name: body.name,
      slug: body.slug,
    });
  }

  deleteTeam(teamId: number) {
    // Membership / EventType / Webhook rows all cascade-delete on Team in the schema, so nothing else
    // needs cleaning up here.
    return this.teamsRepository.delete(teamId);
  }

  listMembers(teamId: number) {
    return this.membershipsRepository.findByTeamId(teamId);
  }

  addMember(teamId: number, body: CreateMembershipInputDto) {
    return this.membershipsRepository.createMembership(
      teamId,
      body.userId,
      body.role ?? MembershipRole.MEMBER,
      body.accepted ?? true
    );
  }

  updateMemberRole(teamId: number, userId: number, body: UpdateMembershipInputDto) {
    return this.membershipsRepository.updateRole(teamId, userId, body.role);
  }

  async removeMember(teamId: number, userId: number) {
    // A stale Host row would let a removed member keep receiving round-robin bookings on this team's
    // event types even though they're no longer a member.
    await this.teamsEventTypesRepository.removeUserFromTeamEventTypesHosts(userId, teamId);
    return this.membershipsRepository.deleteMembership(teamId, userId);
  }
}
