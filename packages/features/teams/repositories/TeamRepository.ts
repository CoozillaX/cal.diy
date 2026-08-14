import { randomBytes } from "node:crypto";
import { prisma } from "@calcom/prisma";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

const INVITE_TOKEN_EXPIRY_DAYS = 7;

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
    logoUrl,
    ownerUserId,
  }: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    ownerUserId: number;
  }): Promise<TeamDTO> {
    return this.prismaClient.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { name, slug, logoUrl },
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

  /**
   * Used to invite an email address with no existing User account. The token is consumed by
   * the signup flow (see apps/web/app/api/auth/signup/handlers/selfHostedHandler.ts), which
   * creates the User and the accepted Membership together, then deletes the token.
   */
  async createInviteToken({ teamId, email }: { teamId: number; email: string }): Promise<{ token: string }> {
    const token = randomBytes(32).toString("hex");
    await this.prismaClient.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        teamId,
        expires: new Date(Date.now() + INVITE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return { token };
  }

  /**
   * Platform-admin-wide listing across every team, regardless of the caller's own memberships.
   * Callers must gate access with authedAdminProcedure - this method does no authorization.
   * Organizations are excluded; they have their own dedicated admin management UI.
   */
  async listAllPaginated({
    searchTerm,
    cursor,
    limit,
  }: {
    searchTerm?: string | null;
    cursor?: number | null;
    limit: number;
  }) {
    const trimmedSearchTerm = searchTerm?.trim();
    const where: Prisma.TeamWhereInput = {
      isOrganization: false,
      ...(trimmedSearchTerm
        ? {
            OR: [
              { name: { contains: trimmedSearchTerm, mode: "insensitive" } },
              { slug: { contains: trimmedSearchTerm, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const teams = await this.prismaClient.team.findMany({
      where,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1, // +1 lets us detect "has more" for the cursor
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        createdAt: true,
        _count: { select: { members: { where: { accepted: true } } } },
        members: {
          where: { role: MembershipRole.OWNER },
          take: 1,
          select: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    const total = await this.prismaClient.team.count({ where });
    const hasMore = teams.length > limit;
    const items = hasMore ? teams.slice(0, limit) : teams;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return {
      teams: items.map(({ members, _count, ...team }) => ({
        ...team,
        memberCount: _count.members,
        owner: members[0]?.user ?? null,
      })),
      nextCursor,
      total,
    };
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
