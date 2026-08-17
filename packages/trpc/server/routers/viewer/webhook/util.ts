import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import authedProcedure from "../../../procedures/authedProcedure";
import { PermissionCheckService } from "../eventTypes/permissionCheckService";
import { webhookIdAndEventTypeIdSchema } from "./types";

type WebhookAccessLevel = {
  permission: "webhook.read" | "webhook.update" | "webhook.delete";
  fallbackRoles: MembershipRole[];
};

const READ_ACCESS: WebhookAccessLevel = {
  permission: "webhook.read",
  fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
};

const checkEventTypeAccess = async ({
  eventTypeId,
  userId,
  permission,
  fallbackRoles,
}: WebhookAccessLevel & { eventTypeId: number; userId: number }) => {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: { id: true, userId: true, teamId: true },
  });

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  // Personal event types keep the simple ownership check.
  if (eventType.userId) {
    if (eventType.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return;
  }

  // Team event types have no userId, so ownership must be resolved via team membership instead.
  if (!eventType.teamId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  const permissionCheckService = new PermissionCheckService();
  const hasAccess = await permissionCheckService.checkPermission({
    userId,
    teamId: eventType.teamId,
    permission,
    fallbackRoles,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
};

export const createWebhookProcedure = (accessLevel: WebhookAccessLevel = READ_ACCESS) => {
  return authedProcedure.input(webhookIdAndEventTypeIdSchema.optional()).use(async ({ ctx, input, next }) => {
    if (!input) return next();

    const { id, webhookId, eventTypeId } = input;
    const lookupId = id || webhookId;

    if (lookupId) {
      // Check if user is authorized to edit webhook
      const webhook = await prisma.webhook.findUnique({
        where: { id: lookupId },
        select: {
          id: true,
          userId: true,
          eventTypeId: true,
        },
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (eventTypeId && eventTypeId !== webhook.eventTypeId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (webhook.eventTypeId) {
        await checkEventTypeAccess({ eventTypeId: webhook.eventTypeId, userId: ctx.user.id, ...accessLevel });
      } else if (webhook.userId && webhook.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
    } else if (eventTypeId) {
      await checkEventTypeAccess({ eventTypeId, userId: ctx.user.id, ...accessLevel });
    }

    return next();
  });
};

export const webhookProcedure = createWebhookProcedure();
