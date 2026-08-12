import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import { meetsMinimumRole, TEAM_PERMISSIONS } from "@calcom/features/teams/lib/teamPermissions";
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
 * index and the fork's own removal commit). canCreate/canEdit read the team's configured
 * minimum role for eventType.create/eventType.update (TeamPermissionSettingService - see
 * packages/features/teams/lib/teamPermissions.ts), defaulting to ADMIN/OWNER same as before if
 * settings haven't loaded for some reason. canDelete stays hardcoded ADMIN/OWNER - "delete" isn't
 * part of the configurable catalog. `_userId` is unused: `effectiveRole` already resolved the
 * org-cascade for this (userId, teamId) pair, so we compare it directly against the configured
 * role rather than re-querying membership from scratch.
 */
export async function getTeamPermissions(
  _userId: number,
  teamId: number,
  effectiveRole: MembershipRole
): Promise<TeamPermissions> {
  const isAdminOrOwner = effectiveRole === MembershipRole.ADMIN || effectiveRole === MembershipRole.OWNER;
  const isMember = effectiveRole === MembershipRole.MEMBER;

  const settings = await getTeamPermissionSettingService().getEffectiveSettings({ teamId });
  const createMinimumRole = settings.find(
    (setting) => setting.permissionKey === TEAM_PERMISSIONS.EVENT_TYPE_CREATE
  )?.minimumRole;
  const editMinimumRole = settings.find(
    (setting) => setting.permissionKey === TEAM_PERMISSIONS.EVENT_TYPE_UPDATE
  )?.minimumRole;

  return {
    canRead: isAdminOrOwner || isMember,
    canCreate: createMinimumRole ? meetsMinimumRole(effectiveRole, createMinimumRole) : isAdminOrOwner,
    canEdit: editMinimumRole ? meetsMinimumRole(effectiveRole, editMinimumRole) : isAdminOrOwner,
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
