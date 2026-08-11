import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class PrismaHolidayRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findUserSettingsSelect<T extends Prisma.UserHolidaySettingsSelect>({
    userId,
    select,
  }: {
    userId: number;
    select: T;
  }) {
    return this.prismaClient.userHolidaySettings.findUnique({
      where: { userId },
      select,
    });
  }

  async findTeamSettingsSelect<T extends Prisma.TeamHolidaySettingsSelect>({
    teamId,
    select,
  }: {
    teamId: number;
    select: T;
  }) {
    return this.prismaClient.teamHolidaySettings.findUnique({
      where: { teamId },
      select,
    });
  }

  async upsertTeamSettings({
    teamId,
    countryCode,
    resetDisabledHolidays = false,
  }: {
    teamId: number;
    countryCode: string | null;
    resetDisabledHolidays?: boolean;
  }) {
    return this.prismaClient.teamHolidaySettings.upsert({
      where: { teamId },
      create: {
        teamId,
        countryCode,
        disabledIds: [],
      },
      update: {
        countryCode,
        ...(resetDisabledHolidays ? { disabledIds: [] } : {}),
      },
      select: { id: true, teamId: true, countryCode: true, disabledIds: true },
    });
  }

  async updateTeamDisabledIds({ teamId, disabledIds }: { teamId: number; disabledIds: string[] }) {
    return this.prismaClient.teamHolidaySettings.update({
      where: { teamId },
      data: { disabledIds },
      select: { id: true, teamId: true, countryCode: true, disabledIds: true },
    });
  }
}
