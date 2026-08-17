import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { MembershipRole } from "@calcom/prisma/enums";

type PermissionCheckArgs = {
  userId: number;
  teamId: number;
  permission?: string;
  fallbackRoles: MembershipRole[];
};

/**
 * Resolves organization-scoped permissions from the caller's Membership.role, since the PBAC
 * catalog that used to back this was removed - every call site already passes a fallbackRoles
 * param for that. Mirrors packages/trpc/server/routers/viewer/eventTypes/permissionCheckService.ts,
 * duplicated here (rather than imported) because packages/features must not import from
 * @calcom/trpc (see agents/rules/architecture-circular-dependencies.md).
 */
export class PermissionCheckService {
  constructor(private readonly membershipRepository: MembershipRepository = new MembershipRepository()) {}

  async checkPermission({ userId, teamId, fallbackRoles }: PermissionCheckArgs): Promise<boolean> {
    const membership = await this.membershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId });
    return !!membership?.accepted && fallbackRoles.includes(membership.role);
  }
}
