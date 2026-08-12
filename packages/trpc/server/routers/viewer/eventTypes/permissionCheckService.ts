import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import { TEAM_PERMISSIONS, type TeamPermissionKey } from "@calcom/features/teams/lib/teamPermissions";
import type { MembershipRole } from "@calcom/prisma/enums";

type PermissionCheckArgs = {
  userId: number;
  teamId: number;
  /** Kept for call-site compatibility with the removed PBAC system; unused now that every check is role-based. */
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
 * Cal.diy removed packages/features/pbac (see agents/rules/README.md's rule index and the
 * fork's own removal commit), which used to back this service. Every call site already passed
 * a `fallbackRoles` param for "PBAC disabled" - so team permissions here are decided purely by
 * the caller's Membership.role, same as the rest of the team/booking permission checks in this repo.
 *
 * This replaces several call sites that had each temporarily stubbed this class to unconditionally
 * return true/[] to keep the build compiling after the PBAC removal - which silently disabled
 * authorization for team event type create/update/delete.
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
    // the team owner's configured minimum role (or its built-in default) supersedes the caller's
    // fallbackRoles - e.g. event type creation defaults to OWNER-only here even though callers
    // still pass [ADMIN, OWNER] for backward compatibility with permission strings outside the
    // catalog (like "eventType.read"/"eventType.delete"), which keep using fallbackRoles as-is.
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
