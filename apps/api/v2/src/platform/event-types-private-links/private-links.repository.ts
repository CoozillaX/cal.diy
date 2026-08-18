import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PrivateLinksRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  // The booking page route is /d/[link]/[slug] (two required segments) - the
  // slug is needed to build a working bookingUrl, which none of the queries
  // below otherwise select.
  async getEventTypeSlug(eventTypeId: number): Promise<string | null> {
    const eventType = await this.dbRead.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { slug: true },
    });
    return eventType?.slug ?? null;
  }

  async listByEventTypeId(eventTypeId: number) {
    return this.dbRead.prisma.hashedLink.findMany({
      where: { eventTypeId },
      select: {
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
        eventType: { select: { slug: true } },
      },
    });
  }

  async findWithEventTypeDetails(linkId: string) {
    return this.dbRead.prisma.hashedLink.findUnique({
      where: { link: linkId },
      select: {
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
        eventType: { select: { slug: true } },
      },
    });
  }

  async create(
    eventTypeId: number,
    link: { link: string; expiresAt: Date | null; maxUsageCount?: number | null }
  ) {
    return this.dbWrite.prisma.hashedLink.create({
      data: {
        eventTypeId,
        link: link.link,
        expiresAt: link.expiresAt,
        ...(typeof link.maxUsageCount === "number" ? { maxUsageCount: link.maxUsageCount } : {}),
      },
      select: {
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
        eventType: { select: { slug: true } },
      },
    });
  }

  async update(
    eventTypeId: number,
    link: { link: string; expiresAt: Date | null; maxUsageCount?: number | null }
  ) {
    return this.dbWrite.prisma.hashedLink.updateMany({
      where: { eventTypeId, link: link.link },
      data: {
        expiresAt: link.expiresAt,
        ...(typeof link.maxUsageCount === "number" ? { maxUsageCount: link.maxUsageCount } : {}),
      },
    });
  }

  async delete(eventTypeId: number, linkId: string) {
    return this.dbWrite.prisma.hashedLink.deleteMany({ where: { eventTypeId, link: linkId } });
  }
}
