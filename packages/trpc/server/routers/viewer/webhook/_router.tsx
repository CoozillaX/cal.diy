import type { Webhook } from "@calcom/features/webhooks/lib/dto/types";
import { MembershipRole } from "@calcom/prisma/enums";
import { router } from "../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZEditInputSchema } from "./edit.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZListInputSchema } from "./list.schema";
import { ZTestTriggerInputSchema } from "./testTrigger.schema";
import { createWebhookProcedure } from "./util";

// Team members can view webhooks; only team admins/owners may create, edit, delete, or test them.
const MODIFY_ACCESS = {
  permission: "webhook.update" as const,
  fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
};
const DELETE_ACCESS = {
  permission: "webhook.delete" as const,
  fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
};

type WebhookRouterHandlerCache = {
  list?: typeof import("./list.handler").listHandler;
  get?: typeof import("./get.handler").getHandler;
  create?: typeof import("./create.handler").createHandler;
  edit?: typeof import("./edit.handler").editHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
  testTrigger?: typeof import("./testTrigger.handler").testTriggerHandler;
  getByViewer?: typeof import("./getByViewer.handler").getByViewerHandler;
};

const UNSTABLE_HANDLER_CACHE: WebhookRouterHandlerCache = {};

export const webhookRouter = router({
  list: createWebhookProcedure()
    .input(ZListInputSchema)
    .query(async ({ ctx, input }): Promise<Webhook[]> => {
      if (!UNSTABLE_HANDLER_CACHE.list) {
        UNSTABLE_HANDLER_CACHE.list = await import("./list.handler").then((mod) => mod.listHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.list) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.list({
        ctx,
        input,
      });
    }),

  get: createWebhookProcedure()
    .input(ZGetInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.get) {
        UNSTABLE_HANDLER_CACHE.get = await import("./get.handler").then((mod) => mod.getHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.get) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.get({
        ctx,
        input,
      });
    }),

  create: createWebhookProcedure(MODIFY_ACCESS)
    .input(ZCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.create) {
        UNSTABLE_HANDLER_CACHE.create = await import("./create.handler").then((mod) => mod.createHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.create) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.create({
        ctx,
        input,
      });
    }),

  edit: createWebhookProcedure(MODIFY_ACCESS)
    .input(ZEditInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.edit) {
        UNSTABLE_HANDLER_CACHE.edit = await import("./edit.handler").then((mod) => mod.editHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.edit) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.edit({
        ctx,
        input,
      });
    }),

  delete: createWebhookProcedure(DELETE_ACCESS)
    .input(ZDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.delete) {
        UNSTABLE_HANDLER_CACHE.delete = await import("./delete.handler").then((mod) => mod.deleteHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.delete) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.delete({
        ctx,
        input,
      });
    }),

  testTrigger: createWebhookProcedure(MODIFY_ACCESS)
    .input(ZTestTriggerInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.testTrigger) {
        UNSTABLE_HANDLER_CACHE.testTrigger = await import("./testTrigger.handler").then(
          (mod) => mod.testTriggerHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.testTrigger) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.testTrigger({
        ctx,
        input,
      });
    }),

  getByViewer: createWebhookProcedure().query(
    async ({ ctx }): Promise<import("./getByViewer.handler").WebhooksByViewer> => {
      if (!UNSTABLE_HANDLER_CACHE.getByViewer) {
        UNSTABLE_HANDLER_CACHE.getByViewer = await import("./getByViewer.handler").then(
          (mod) => mod.getByViewerHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.getByViewer) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getByViewer({
        ctx,
      });
    }
  ),
});
