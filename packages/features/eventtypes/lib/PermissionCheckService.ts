import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import { TEAM_PERMISSIONS, type TeamPermissionKey } from "@calcom/features/teams/lib/teamPermissions";
import type { MembershipRole } from "@calcom/prisma/enums";

type PermissionCheckArgs = {
  userId: number;
  teamId: number;
  permission?: string;
  fallbackRoles: MembershipRole[];
};

type TeamIdsWithPermissionArgs = {
  userId: number;
  permission?: string;
  fallbackRoles: MembershipRole[];
};

const TEAM_PERMISSION_KEYS = new Set<string>(Object.values(TEAM_PERMISSIONS));

function isTeamPermissionKey(permission: string | undefined): permission is TeamPermissionKey {
  return !!permission && TEAM_PERMISSION_KEYS.has(permission);
}

/**
 * Resolves permissions from the caller's Membership.role, since the PBAC catalog that used to
 * back this was removed - every call site already passes a fallbackRoles param for that.
 * Mirrors packages/trpc/server/routers/viewer/eventTypes/permissionCheckService.ts, duplicated
 * here (rather than imported) because packages/features must not import from @calcom/trpc
 * (see agents/rules/architecture-circular-dependencies.md).
 */
export class PermissionCheckService {
  constructor(private readonly membershipRepository: MembershipRepository = new MembershipRepository()) {}

  async checkPermission({
    userId,
    teamId,
    permission,
    fallbackRoles,
  }: PermissionCheckArgs): Promise<boolean> {
    // For the curated team-permission catalog (packages/features/teams/lib/teamPermissions.ts),
    // the team's configured minimum role supersedes fallbackRoles - see
    // packages/trpc/server/routers/viewer/eventTypes/permissionCheckService.ts for the same rule.
    if (isTeamPermissionKey(permission)) {
      return getTeamPermissionSettingService().hasPermission({ teamId, userId, permissionKey: permission });
    }

    const membership = await this.membershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId });
    return !!membership?.accepted && fallbackRoles.includes(membership.role);
  }

  async hasPermission(args: PermissionCheckArgs): Promise<boolean> {
    return this.checkPermission(args);
  }

  async getTeamIdsWithPermission({ userId, fallbackRoles }: TeamIdsWithPermissionArgs): Promise<number[]> {
    const memberships = await this.membershipRepository.findAllByUserId({
      userId,
      filters: { accepted: true, roles: fallbackRoles },
    });
    return memberships.map((membership) => membership.teamId);
  }
}
