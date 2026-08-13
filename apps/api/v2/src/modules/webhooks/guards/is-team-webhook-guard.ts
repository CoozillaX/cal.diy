import type { Webhook } from "@calcom/prisma/client";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";

@Injectable()
export class IsTeamWebhookGuard implements CanActivate {
  constructor(private readonly webhooksService: WebhooksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { webhook: Webhook }>();
    const teamId = request.params.teamId;
    const webhookId = request.params.webhookId;

    if (!webhookId) {
      throw new ForbiddenException("IsTeamWebhookGuard - No webhook id found in request params.");
    }

    // Throws NotFoundException itself if the webhook doesn't exist at all.
    const webhook = await this.webhooksService.getWebhookById(webhookId);

    if (webhook.teamId !== Number(teamId)) {
      throw new ForbiddenException(
        `IsTeamWebhookGuard - webhook with id=(${webhookId}) does not belong to team with id=(${teamId})`
      );
    }

    request.webhook = webhook;
    return true;
  }
}
