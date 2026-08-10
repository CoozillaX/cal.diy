import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ErrorWithCode } from "@calcom/lib/errors";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TeamRepository, TeamUpdateData } from "../repositories/TeamRepository";

interface ITeamServiceDeps {
  teamRepository: TeamRepository;
  membershipRepository: MembershipRepository;
}

const TEAM_ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

export type { ITeamServiceDeps };

export class TeamService {
  constructor(private deps: ITeamServiceDeps) {}

  async createTeam({ name, slug, ownerUserId }: { name: string; slug: string; ownerUserId: number }) {
    const isAvailable = await this.deps.teamRepository.isSlugAvailable({ slug });
    if (!isAvailable) {
      throw ErrorWithCode.Factory.TeamSlugTaken(`Unable to create team: slug "${slug}" is already taken`);
    }

    return this.deps.teamRepository.createWithOwner({ name, slug, ownerUserId });
  }

  async getTeamForUser({ teamId, userId }: { teamId: number; userId: number }) {
    await this.assertIsTeamMember({ teamId, userId });

    const team = await this.deps.teamRepository.findById({ id: teamId });
    if (!team) {
      throw ErrorWithCode.Factory.TeamNotFound(`Team ${teamId} not found`);
    }

    return team;
  }

  async listTeamsForUser({ userId }: { userId: number }) {
    const teams = await MembershipRepository.findAllAcceptedTeamMemberships(userId, {
      team: { isOrganization: false },
    });

    return teams.map(({ id, name, slug, logoUrl }) => ({ id, name, slug, logoUrl }));
  }

  async updateTeam({ teamId, userId, data }: { teamId: number; userId: number; data: TeamUpdateData }) {
    await this.assertIsTeamAdmin({ teamId, userId });

    if (typeof data.slug === "string") {
      const isAvailable = await this.deps.teamRepository.isSlugAvailable({
        slug: data.slug,
        excludeTeamId: teamId,
      });
      if (!isAvailable) {
        throw ErrorWithCode.Factory.TeamSlugTaken(
          `Unable to update team: slug "${data.slug}" is already taken`
        );
      }
    }

    return this.deps.teamRepository.update({ id: teamId, data });
  }

  async deleteTeam({ teamId, userId }: { teamId: number; userId: number }) {
    const membership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({
      teamId,
      userId,
    });
    if (!membership?.accepted || membership.role !== MembershipRole.OWNER) {
      throw ErrorWithCode.Factory.Forbidden(`User ${userId} is not the owner of team ${teamId}`);
    }

    return this.deps.teamRepository.delete({ id: teamId });
  }

  private async assertIsTeamMember({ teamId, userId }: { teamId: number; userId: number }) {
    const isMember = await this.deps.membershipRepository.hasMembership({ teamId, userId });
    if (!isMember) {
      throw ErrorWithCode.Factory.Forbidden(`User ${userId} is not a member of team ${teamId}`);
    }
  }

  private async assertIsTeamAdmin({ teamId, userId }: { teamId: number; userId: number }) {
    const membership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({
      teamId,
      userId,
    });
    if (!membership?.accepted || !TEAM_ADMIN_ROLES.includes(membership.role)) {
      throw ErrorWithCode.Factory.Forbidden(
        `User ${userId} does not have admin permission on team ${teamId}`
      );
    }
  }
}
