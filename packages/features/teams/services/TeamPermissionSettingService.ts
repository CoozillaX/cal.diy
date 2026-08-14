import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { ErrorWithCode } from "@calcom/lib/errors";
import { MembershipRole } from "@calcom/prisma/enums";
import {
  meetsMinimumRole,
  TEAM_PERMISSION_CATALOG,
  TEAM_PERMISSION_DEFAULTS,
  type TeamPermissionKey,
} from "../lib/teamPermissions";
import type { TeamPermissionSettingRepository } from "../repositories/TeamPermissionSettingRepository";

interface ITeamPermissionSettingServiceDeps {
  settingRepository: TeamPermissionSettingRepository;
  membershipRepository: MembershipRepository;
}

export interface TeamPermissionSettingDisplay {
  permissionKey: TeamPermissionKey;
  minimumRole: MembershipRole;
}

export class TeamPermissionSettingService {
  constructor(private deps: ITeamPermissionSettingServiceDeps) {}

  /** Full permission catalog for teamId, with stored overrides layered over the built-in defaults. */
  async getEffectiveSettings({ teamId }: { teamId: number }): Promise<TeamPermissionSettingDisplay[]> {
    const stored = await this.deps.settingRepository.findByTeamId({ teamId });
    const overrides = new Map(stored.map((row) => [row.permissionKey, row.minimumRole]));

    return TEAM_PERMISSION_CATALOG.map(({ key }) => ({
      permissionKey: key,
      minimumRole: overrides.get(key) ?? TEAM_PERMISSION_DEFAULTS[key],
    }));
  }

  /**
   * The check every enforcement call site (event type create/update/duplicate, booking
   * confirm/editLocation/etc.) delegates to: does userId's role on teamId meet the configured
   * (or default) minimum role for permissionKey?
   */
  async hasPermission({
    teamId,
    userId,
    permissionKey,
  }: {
    teamId: number;
    userId: number;
    permissionKey: TeamPermissionKey;
  }): Promise<boolean> {
    const membership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({ teamId, userId });
    if (!membership?.accepted) {
      return false;
    }

    const stored = await this.deps.settingRepository.findByTeamId({ teamId });
    const minimumRole =
      stored.find((row) => row.permissionKey === permissionKey)?.minimumRole ??
      TEAM_PERMISSION_DEFAULTS[permissionKey];

    return meetsMinimumRole(membership.role, minimumRole);
  }

  async updateSettings({
    teamId,
    userId,
    settings,
  }: {
    teamId: number;
    userId: number;
    settings: { permissionKey: TeamPermissionKey; minimumRole: MembershipRole }[];
  }): Promise<void> {
    await this.assertIsTeamOwner({ teamId, userId });
    await this.deps.settingRepository.upsertMany({ teamId, settings });
  }

  /** Platform-admin bypass of the owner-only check above - the tRPC router gates this with
   * authedAdminProcedure instead (see agents/rules/architecture-page-level-auth.md). */
  async adminUpdateSettings({
    teamId,
    settings,
  }: {
    teamId: number;
    settings: { permissionKey: TeamPermissionKey; minimumRole: MembershipRole }[];
  }): Promise<void> {
    await this.deps.settingRepository.upsertMany({ teamId, settings });
  }

  private async assertIsTeamOwner({ teamId, userId }: { teamId: number; userId: number }) {
    const membership = await this.deps.membershipRepository.findUniqueByUserIdAndTeamId({ teamId, userId });
    if (!membership?.accepted || membership.role !== MembershipRole.OWNER) {
      throw ErrorWithCode.Factory.Forbidden(
        `User ${userId} is not the owner of team ${teamId} - only the team owner can edit permission settings`
      );
    }
  }
}
