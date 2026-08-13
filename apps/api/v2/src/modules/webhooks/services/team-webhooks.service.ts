import { ConflictException, Injectable } from "@nestjs/common";
import type { PipedInputWebhookType } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { validateWebhookUrl } from "@/modules/webhooks/utils/validate-webhook-url";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";

// Team-scoped webhooks (this file) fire for every event type on the team; TeamEventTypeWebhooksService
// fires for one specific event type. Both live on the same Webhook.teamId / Webhook.eventTypeId columns
// but are deliberately kept as separate services since they answer different questions ("give me every
// booking on this team" vs "give me bookings for this one event type").
@Injectable()
export class TeamWebhooksService {
  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async createTeamWebhook(teamId: number, body: PipedInputWebhookType) {
    validateWebhookUrl(body.subscriberUrl);

    const existingWebhook = await this.webhooksRepository.getTeamWebhookByUrl(teamId, body.subscriberUrl);
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this team");
    }

    return this.webhooksRepository.createTeamWebhook(teamId, {
      ...body,
      payloadTemplate: body.payloadTemplate ?? null,
      secret: body.secret ?? null,
    });
  }
}
