import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";
import type { Webhook } from "@calcom/prisma/client";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiParam, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { GetWebhook } from "@/modules/webhooks/decorators/get-webhook-decorator";
import { IsTeamWebhookGuard } from "@/modules/webhooks/guards/is-team-webhook-guard";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  TeamWebhookOutputDto,
  TeamWebhookOutputResponseDto,
  TeamWebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/team-webhook.output";
import { PartialWebhookInputPipe, WebhookInputPipe } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhookOutputPipe } from "@/modules/webhooks/pipes/WebhookOutputPipe";
import { TeamWebhooksService } from "@/modules/webhooks/services/team-webhooks.service";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";

@Controller({
  path: "/v2/teams/:teamId/webhooks",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams Webhooks")
@ApiHeader(API_KEY_HEADER)
@ApiParam({ name: "teamId", type: Number, required: true })
export class TeamWebhooksController {
  constructor(
    private readonly teamWebhooksService: TeamWebhooksService,
    private readonly webhooksService: WebhooksService
  ) {}

  // note: RolesGuard reads @Roles() off context.getHandler() only, not the class, so this has to be
  // repeated per method rather than declared once at the controller level. Every route here requires
  // TEAM_ADMIN (stricter than the TEAM_MEMBER used for other team reads) because webhook payloads expose
  // `secret`, matching the same field the user-scoped WebhooksController already exposes to its caller -
  // team webhooks are shared team-wide, so the read side is admin-gated too, not just the write side.
  @Post("/")
  @Roles("TEAM_ADMIN")
  @ApiOperation({
    summary: "Create a team webhook",
    description: "Fires for every booking on every event type belonging to this team.",
  })
  async createTeamWebhook(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: CreateWebhookInputDto
  ): Promise<TeamWebhookOutputResponseDto> {
    const webhook = await this.teamWebhooksService.createTeamWebhook(
      teamId,
      new WebhookInputPipe().transform(body)
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Get("/")
  @Roles("TEAM_ADMIN")
  @ApiOperation({
    summary: "Get team webhooks",
    description: "Gets a paginated list of webhooks belonging to this team.",
  })
  async getTeamWebhooks(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() query: SkipTakePagination
  ): Promise<TeamWebhooksOutputResponseDto> {
    const webhooks = await this.teamWebhooksService.getTeamWebhooksPaginated(
      teamId,
      query.skip ?? 0,
      query.take ?? 250
    );

    return {
      status: SUCCESS_STATUS,
      data: webhooks.map((webhook) =>
        plainToClass(TeamWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
          strategy: "excludeAll",
        })
      ),
    };
  }

  @Get("/:webhookId")
  @Roles("TEAM_ADMIN")
  @ApiParam({ name: "webhookId", type: String, required: true })
  @UseGuards(IsTeamWebhookGuard)
  @ApiOperation({ summary: "Get a team webhook" })
  async getTeamWebhook(@GetWebhook() webhook: Webhook): Promise<TeamWebhookOutputResponseDto> {
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Patch("/:webhookId")
  @Roles("TEAM_ADMIN")
  @ApiParam({ name: "webhookId", type: String, required: true })
  @UseGuards(IsTeamWebhookGuard)
  @ApiOperation({ summary: "Update a team webhook" })
  async updateTeamWebhook(
    @Param("webhookId") webhookId: string,
    @Body() body: UpdateWebhookInputDto
  ): Promise<TeamWebhookOutputResponseDto> {
    const webhook = await this.webhooksService.updateWebhook(
      webhookId,
      new PartialWebhookInputPipe().transform(body)
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Delete("/:webhookId")
  @Roles("TEAM_ADMIN")
  @ApiParam({ name: "webhookId", type: String, required: true })
  @UseGuards(IsTeamWebhookGuard)
  @ApiOperation({ summary: "Delete a team webhook" })
  async deleteTeamWebhook(@Param("webhookId") webhookId: string): Promise<TeamWebhookOutputResponseDto> {
    const webhook = await this.webhooksService.deleteWebhook(webhookId);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }
}
