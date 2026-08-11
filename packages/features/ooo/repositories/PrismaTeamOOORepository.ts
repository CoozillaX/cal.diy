import { v4 as uuidv4 } from "uuid";

import type { PrismaClient } from "@calcom/prisma";

export class PrismaTeamOOORepository {
  constructor(private prismaClient: PrismaClient) {}

  async findTeamOOODays({ teamId, dateFrom, dateTo }: { teamId: number; dateFrom: string; dateTo: string }) {
    return this.prismaClient.teamOutOfOfficeEntry.findMany({
      where: {
        teamId,
        OR: [
          // outside of range
          // (start <= 'dateTo' AND end >= 'dateFrom')
          {
            start: {
              lte: dateTo,
            },
            end: {
              gte: dateFrom,
            },
          },
          // start is between dateFrom and dateTo but end is outside of range
          // (start <= 'dateTo' AND end >= 'dateTo')
          {
            start: {
              lte: dateTo,
            },

            end: {
              gte: dateTo,
            },
          },
          // end is between dateFrom and dateTo but start is outside of range
          // (start <= 'dateFrom' OR end <= 'dateTo')
          {
            start: {
              lte: dateFrom,
            },

            end: {
              lte: dateTo,
            },
          },
        ],
      },
      select: {
        id: true,
        start: true,
        end: true,
        notes: true,
        reason: {
          select: {
            id: true,
            emoji: true,
            reason: true,
          },
        },
      },
    });
  }

  async findByTeamId({ teamId }: { teamId: number }) {
    return this.prismaClient.teamOutOfOfficeEntry.findMany({
      where: { teamId },
      select: {
        id: true,
        uuid: true,
        start: true,
        end: true,
        notes: true,
        reason: {
          select: {
            id: true,
            emoji: true,
            reason: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { start: "asc" },
    });
  }

  async create({
    teamId,
    start,
    end,
    notes,
    reasonId,
    createdById,
  }: {
    teamId: number;
    start: Date;
    end: Date;
    notes?: string | null;
    reasonId?: number | null;
    createdById: number;
  }) {
    return this.prismaClient.teamOutOfOfficeEntry.create({
      data: {
        uuid: uuidv4(),
        teamId,
        start,
        end,
        notes,
        reasonId,
        createdById,
      },
      select: {
        id: true,
        uuid: true,
        start: true,
        end: true,
        notes: true,
        reason: {
          select: {
            id: true,
            emoji: true,
            reason: true,
          },
        },
      },
    });
  }

  async delete({ id, teamId }: { id: number; teamId: number }) {
    // Scoping the delete by teamId (not just id) means a member of one team can never
    // delete another team's entry, even if they somehow guessed a valid id.
    return this.prismaClient.teamOutOfOfficeEntry.deleteMany({
      where: { id, teamId },
    });
  }
}
