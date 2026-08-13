import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiParam, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  TeamWebhookOutputDto,
  TeamWebhookOutputResponseDto,
} from "@/modules/webhooks/outputs/team-webhook.output";
import { WebhookInputPipe } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhookOutputPipe } from "@/modules/webhooks/pipes/WebhookOutputPipe";
import { TeamWebhooksService } from "@/modules/webhooks/services/team-webhooks.service";

@Controller({
  path: "/v2/teams/:teamId/webhooks",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams Webhooks")
@ApiHeader(API_KEY_HEADER)
@ApiParam({ name: "teamId", type: Number, required: true })
export class TeamWebhooksController {
  constructor(private readonly teamWebhooksService: TeamWebhooksService) {}

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
}
