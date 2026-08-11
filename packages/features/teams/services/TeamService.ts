import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorWithCode } from "@calcom/lib/errors";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TeamRepository, TeamUpdateData } from "../repositories/TeamRepository";

interface ITeamServiceDeps {
  teamRepository: TeamRepository;
  membershipRepository: MembershipRepository;
  userRepository: UserRepository;
}

type InviteMemberTranslator = Parameters<typeof sendTeamInviteEmail>[0]["language"];

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

    return teams.map(({ id, name, slug, logoUrl, members, _count }) => ({
      id,
      name,
      slug,
      logoUrl,
      role: members[0]?.role ?? null,
      memberCount: _count.members,
    }));
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

  /**
   * Invites a member by email. If the email already belongs to a Cal.diy user, a pending
   * Membership is created for them to accept via `acceptInvite`. Otherwise a signup invite
   * token is created; the signup flow creates the User and accepted Membership together.
   */
  async inviteMember({
    teamId,
    invitedByUserId,
    inviterName,
    inviteeEmail,
    language,
  }: {
    teamId: number;
    invitedByUserId: number;
    inviterName: string;
    inviteeEmail: string;
    language: InviteMemberTranslator;
  }) {
    await this.assertIsTeamAdmin({ teamId, userId: invitedByUserId });

    const team = await this.deps.teamRepository.findById({ id: teamId });
    if (!team) {
      throw ErrorWithCode.Factory.TeamNotFound(`Team ${teamId} not found`);
    }

    const normalizedEmail = inviteeEmail.toLowerCase();
    const existingUser = await this.deps.userRepository.findByEmail({ email: normalizedEmail });

    if (!existingUser) {
      const { token } = await this.deps.teamRepository.createInviteToken({ teamId, email: normalizedEmail });
      await sendTeamInviteEmail({
        language,
        from: inviterName,
        to: normalizedEmail,
        teamName: team.name,
        joinLink: `${WEBAPP_URL}/signup?token=${token}`,
        isCalcomMember: false,
        isAutoJoin: false,
        isOrg: false,
        parentTeamName: undefined,
        isExistingUserMovedToOrg: false,
        prevLink: null,
        newLink: null,
      });
      return { status: "invited_new_user" as const };
    }

    const existingMembership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({
      userId: existingUser.id,
      teamId,
    });
    if (existingMembership) {
      throw ErrorWithCode.Factory.BadRequest(
        existingMembership.accepted
          ? `${normalizedEmail} is already a member of this team`
          : `${normalizedEmail} already has a pending invite to this team`
      );
    }

    await MembershipRepository.create({
      teamId,
      userId: existingUser.id,
      role: MembershipRole.MEMBER,
      accepted: false,
    });

    // No dedicated "pending invites" UI exists yet (see PR description) - the invitee
    // must call `teams.acceptInvite` directly until that follow-up ships.
    await sendTeamInviteEmail({
      language,
      from: inviterName,
      to: normalizedEmail,
      teamName: team.name,
      joinLink: WEBAPP_URL,
      isCalcomMember: true,
      isAutoJoin: false,
      isOrg: false,
      parentTeamName: undefined,
      isExistingUserMovedToOrg: false,
      prevLink: null,
      newLink: null,
    });

    return { status: "invited_existing_user" as const };
  }

  /** Self-service accept for the currently logged-in invitee - not usable by admins on someone else's behalf. */
  async acceptInvite({ teamId, userId }: { teamId: number; userId: number }) {
    const membership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({ teamId, userId });
    if (!membership) {
      throw ErrorWithCode.Factory.NotFound(`No invite found for this team`);
    }
    if (membership.accepted) {
      throw ErrorWithCode.Factory.BadRequest(`Invite for this team was already accepted`);
    }

    return this.deps.membershipRepository.acceptInvite({ userId, teamId });
  }

  /** The logged-in user's own pending invites across all teams, for a "you've been invited" UI. */
  async listMyPendingInvites({ userId }: { userId: number }) {
    return this.deps.membershipRepository.findPendingInvitesForUser({ userId });
  }

  /** Roster for the team settings UI - any member (not just admins) can view it. */
  async listMembers({ teamId, userId }: { teamId: number; userId: number }) {
    await this.assertIsTeamMember({ teamId, userId });

    return this.deps.membershipRepository.findMembershipsWithUserByTeamId({ teamId });
  }

  async changeMemberRole({
    teamId,
    actingUserId,
    targetUserId,
    role,
  }: {
    teamId: number;
    actingUserId: number;
    targetUserId: number;
    role: MembershipRole;
  }) {
    await this.assertIsTeamAdmin({ teamId, userId: actingUserId });

    const targetMembership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({
      teamId,
      userId: targetUserId,
    });
    if (!targetMembership) {
      throw ErrorWithCode.Factory.NotFound(`User ${targetUserId} is not a member of team ${teamId}`);
    }

    if (targetMembership.role === MembershipRole.OWNER && role !== MembershipRole.OWNER) {
      await this.assertNotLastOwner({ teamId });
    }

    return this.deps.membershipRepository.updateRole({ userId: targetUserId, teamId, role });
  }

  async removeMember({
    teamId,
    actingUserId,
    targetUserId,
  }: {
    teamId: number;
    actingUserId: number;
    targetUserId: number;
  }) {
    await this.assertIsTeamAdmin({ teamId, userId: actingUserId });

    if (targetUserId === actingUserId) {
      throw ErrorWithCode.Factory.BadRequest(
        `Use deleteTeam or leaveTeam instead of removeMember to remove yourself`
      );
    }

    const targetMembership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({
      teamId,
      userId: targetUserId,
    });
    if (!targetMembership) {
      throw ErrorWithCode.Factory.NotFound(`User ${targetUserId} is not a member of team ${teamId}`);
    }

    if (targetMembership.role === MembershipRole.OWNER) {
      await this.assertNotLastOwner({ teamId });
    }

    return this.deps.membershipRepository.delete({ userId: targetUserId, teamId });
  }

  /** Self-service - a member removes themselves. Owners must transfer ownership or delete the team instead. */
  async leaveTeam({ teamId, userId }: { teamId: number; userId: number }) {
    const membership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({ teamId, userId });
    if (!membership) {
      throw ErrorWithCode.Factory.NotFound(`User ${userId} is not a member of team ${teamId}`);
    }
    if (membership.role === MembershipRole.OWNER) {
      throw ErrorWithCode.Factory.BadRequest(
        `Owners can't leave a team - delete the team instead (ownership transfer isn't supported yet)`
      );
    }

    return this.deps.membershipRepository.delete({ userId, teamId });
  }

  private async assertNotLastOwner({ teamId }: { teamId: number }) {
    const ownerCount = await this.deps.membershipRepository.countByTeamIdAndRole({
      teamId,
      role: MembershipRole.OWNER,
    });
    if (ownerCount <= 1) {
      throw ErrorWithCode.Factory.BadRequest(`A team must always have at least one owner`);
    }
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
