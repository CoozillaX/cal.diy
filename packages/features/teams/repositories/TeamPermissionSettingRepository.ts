import { prisma } from "@calcom/prisma";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
import type { TeamPermissionKey } from "../lib/teamPermissions";

const teamPermissionSettingSelect = {
  permissionKey: true,
  minimumRole: true,
} satisfies Prisma.TeamPermissionSettingSelect;

export type TeamPermissionSettingDTO = Prisma.TeamPermissionSettingGetPayload<{
  select: typeof teamPermissionSettingSelect;
}>;

export class TeamPermissionSettingRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async findByTeamId({ teamId }: { teamId: number }): Promise<TeamPermissionSettingDTO[]> {
    return this.prismaClient.teamPermissionSetting.findMany({
      where: { teamId },
      select: teamPermissionSettingSelect,
    });
  }

  /** Upserts each (teamId, permissionKey) row independently inside one transaction. */
  async upsertMany({
    teamId,
    settings,
  }: {
    teamId: number;
    settings: { permissionKey: TeamPermissionKey; minimumRole: MembershipRole }[];
  }): Promise<void> {
    await this.prismaClient.$transaction(
      settings.map(({ permissionKey, minimumRole }) =>
        this.prismaClient.teamPermissionSetting.upsert({
          where: { teamId_permissionKey: { teamId, permissionKey } },
          create: { teamId, permissionKey, minimumRole },
          update: { minimumRole },
        })
      )
    );
  }
}
