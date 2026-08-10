import { MembershipRole } from "@calcom/prisma/enums";

export interface TeamPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canRead: boolean;
}

export interface MembershipWithRole {
  teamId: number;
  membershipRole: MembershipRole;
}

const MEMBERSHIP_HIERARCHY: Record<MembershipRole, number> = {
  [MembershipRole.MEMBER]: 1,
  [MembershipRole.ADMIN]: 2,
  [MembershipRole.OWNER]: 3,
};

export function hasHigherPrivilege(role1: MembershipRole, role2: MembershipRole): boolean {
  return MEMBERSHIP_HIERARCHY[role1] > MEMBERSHIP_HIERARCHY[role2];
}

export function getEffectiveRole(
  orgMembership: MembershipRole | undefined,
  membershipRole: MembershipRole
): MembershipRole {
  return orgMembership && hasHigherPrivilege(orgMembership, membershipRole) ? orgMembership : membershipRole;
}

/**
 * Cal.diy has no PBAC (packages/features/pbac was removed - see agents/rules/README.md's rule
 * index and the fork's own removal commit), so team permissions are decided purely by
 * `effectiveRole`. `userId`/`teamId` are kept in the signature since callers already resolved
 * `effectiveRole` from a real Membership row for this exact (userId, teamId) pair.
 */
export async function getTeamPermissions(
  _userId: number,
  _teamId: number,
  effectiveRole: MembershipRole
): Promise<TeamPermissions> {
  return getFallbackPermissions(effectiveRole);
}

function getFallbackPermissions(role: MembershipRole): TeamPermissions {
  const isAdminOrOwner = role === MembershipRole.ADMIN || role === MembershipRole.OWNER;
  const isMember = role === MembershipRole.MEMBER;

  return {
    canRead: isAdminOrOwner || isMember,
    canCreate: isAdminOrOwner,
    canEdit: isAdminOrOwner,
    canDelete: isAdminOrOwner,
  };
}

export async function buildTeamPermissionsMap(
  memberships: Array<{ team: { id: number; parentId?: number | null }; role: MembershipRole }>,
  teamMemberships: MembershipWithRole[],
  userId: number
): Promise<Map<number, TeamPermissions>> {
  const permissionPromises = memberships.map(async (membership) => {
    const orgMembership = teamMemberships.find(
      (teamM) => teamM.teamId === membership.team.parentId
    )?.membershipRole;

    const effectiveRole = getEffectiveRole(orgMembership, membership.role);
    const permissions = await getTeamPermissions(userId, membership.team.id, effectiveRole);

    return [membership.team.id, permissions] as const;
  });

  const results = await Promise.all(permissionPromises);
  return new Map(results);
}
