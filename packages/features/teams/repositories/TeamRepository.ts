import { prisma } from "@calcom/prisma";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

const teamSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  bio: true,
  theme: true,
  brandColor: true,
  darkBrandColor: true,
  createdAt: true,
} satisfies Prisma.TeamSelect;

export type TeamDTO = Prisma.TeamGetPayload<{ select: typeof teamSelect }>;

export type TeamUpdateData = Pick<
  Prisma.TeamUpdateInput,
  "name" | "slug" | "bio" | "logoUrl" | "theme" | "brandColor" | "darkBrandColor"
>;

export class TeamRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async findById({ id }: { id: number }): Promise<TeamDTO | null> {
    return this.prismaClient.team.findUnique({
      where: { id },
      select: teamSelect,
    });
  }

  async findBySlug({ slug }: { slug: string }): Promise<TeamDTO | null> {
    // Slugs are only guaranteed unique among top-level teams (see @@unique([slug, parentId]) on Team);
    // sub-teams within an organization are out of scope until org support is restored.
    return this.prismaClient.team.findFirst({
      where: { slug, parentId: null },
      select: teamSelect,
    });
  }

  async isSlugAvailable({ slug, excludeTeamId }: { slug: string; excludeTeamId?: number }): Promise<boolean> {
    const existing = await this.prismaClient.team.findFirst({
      where: {
        slug,
        parentId: null,
        ...(excludeTeamId ? { NOT: { id: excludeTeamId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  /**
   * Every team must have an owner from the moment it exists, so team creation
   * and the owner membership are inserted together in one transaction.
   */
  async createWithOwner({
    name,
    slug,
    ownerUserId,
  }: {
    name: string;
    slug: string;
    ownerUserId: number;
  }): Promise<TeamDTO> {
    return this.prismaClient.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { name, slug },
        select: teamSelect,
      });

      await tx.membership.create({
        data: {
          teamId: team.id,
          userId: ownerUserId,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      });

      return team;
    });
  }

  async update({ id, data }: { id: number; data: TeamUpdateData }): Promise<TeamDTO> {
    return this.prismaClient.team.update({
      where: { id },
      data,
      select: teamSelect,
    });
  }

  async delete({ id }: { id: number }): Promise<TeamDTO> {
    // Membership and EventType both have onDelete: Cascade on their teamId relation,
    // so deleting the Team row is sufficient to clean up members and team-owned event types.
    return this.prismaClient.team.delete({
      where: { id },
      select: teamSelect,
    });
  }
}
