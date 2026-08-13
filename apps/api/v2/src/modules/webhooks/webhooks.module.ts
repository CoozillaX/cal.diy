import { Module } from "@nestjs/common";
import { MembershipsModule } from "../memberships/memberships.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { TeamWebhooksController } from "./controllers/team-webhooks.controller";
import { WebhooksController } from "./controllers/webhooks.controller";
import { EventTypeWebhooksService } from "./services/event-type-webhooks.service";
import { OAuthClientWebhooksService } from "./services/oauth-clients-webhooks.service";
import { TeamEventTypeWebhooksService } from "./services/team-event-type-webhooks.service";
import { TeamWebhooksService } from "./services/team-webhooks.service";
import { UserWebhooksService } from "./services/user-webhooks.service";
import { WebhooksService } from "./services/webhooks.service";
import { WebhooksRepository } from "./webhooks.repository";
import { EventTypeWebhooksController } from "@/modules/event-types/controllers/event-types-webhooks.controller";
import { OAuthClientWebhooksController } from "@/modules/oauth-clients/controllers/oauth-client-webhooks/oauth-client-webhooks.controller";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { EventTypesModule_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    UsersModule,
    EventTypesModule_2024_06_14,
    OAuthClientModule,
    MembershipsModule,
    OAuthClientModule,
  ],
  controllers: [
    WebhooksController,
    EventTypeWebhooksController,
    OAuthClientWebhooksController,
    TeamWebhooksController,
  ],
  providers: [
    TeamsEventTypesRepository,
    WebhooksService,
    WebhooksRepository,
    UserWebhooksService,
    EventTypeWebhooksService,
    OAuthClientWebhooksService,
    TeamEventTypeWebhooksService,
    TeamWebhooksService,
  ],
  exports: [
    WebhooksService,
    WebhooksRepository,
    UserWebhooksService,
    EventTypeWebhooksService,
    OAuthClientWebhooksService,
    TeamEventTypeWebhooksService,
    TeamWebhooksService,
  ],
})
export class WebhooksModule {}
