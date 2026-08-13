import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { WebhookRepositoryFixture } from "test/fixtures/repository/webhooks.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";

describe("TeamWebhooksController (e2e)", () => {
  let app: INestApplication;

  const ownerEmail = `team-webhooks-owner-${randomString()}@api.com`;
  let owner: UserWithProfile;
  let team: Team;
  let otherTeam: Team;
  let webhookId: string;
  let otherTeamWebhookId: string;

  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;
  let webhookRepositoryFixture: WebhookRepositoryFixture;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      ownerEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    ).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    webhookRepositoryFixture = new WebhookRepositoryFixture(moduleRef);

    owner = await userRepositoryFixture.create({ email: ownerEmail, username: ownerEmail });
    team = await teamRepositoryFixture.create({
      name: `team-webhooks-team-${randomString()}`,
      isOrganization: false,
    });
    otherTeam = await teamRepositoryFixture.create({
      name: `team-webhooks-other-team-${randomString()}`,
      isOrganization: false,
    });
    await membershipRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: owner.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    // `owner` is deliberately not a member of `otherTeam`; this webhook exists purely so
    // IsTeamWebhookGuard's "does this webhookId actually belong to this :teamId" check has something
    // real (not just missing) to reject.
    const otherTeamWebhook = await webhookRepositoryFixture.create({
      id: `team-webhooks-other-${randomString()}`,
      subscriberUrl: "https://example.com/other-team-webhook",
      eventTriggers: ["BOOKING_CREATED"],
      active: true,
      team: { connect: { id: otherTeam.id } },
    });
    otherTeamWebhookId = otherTeamWebhook.id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await webhookRepositoryFixture.delete(otherTeamWebhookId);
    await teamRepositoryFixture.delete(team.id);
    await teamRepositoryFixture.delete(otherTeam.id);
    await userRepositoryFixture.deleteByEmail(owner.email);
    await app.close();
  });

  it("creates a team webhook", () => {
    return request(app.getHttpServer())
      .post(`/v2/teams/${team.id}/webhooks`)
      .send({
        subscriberUrl: "https://example.com/team-webhook",
        triggers: ["BOOKING_CREATED", "BOOKING_CANCELLED"],
        active: true,
      } satisfies CreateWebhookInputDto)
      .expect(201)
      .then((res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.teamId).toEqual(team.id);
        expect(res.body.data.subscriberUrl).toEqual("https://example.com/team-webhook");
        webhookId = res.body.data.id;
      });
  });

  it("returns 409 creating a second webhook with the same subscriberUrl on the same team", () => {
    return request(app.getHttpServer())
      .post(`/v2/teams/${team.id}/webhooks`)
      .send({
        subscriberUrl: "https://example.com/team-webhook",
        triggers: ["BOOKING_CREATED"],
        active: true,
      } satisfies CreateWebhookInputDto)
      .expect(409);
  });

  it("lists team webhooks", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/webhooks`)
      .expect(200)
      .then((res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.some((w: { id: string }) => w.id === webhookId)).toBe(true);
      });
  });

  it("gets a team webhook", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/webhooks/${webhookId}`)
      .expect(200)
      .then((res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.id).toEqual(webhookId);
      });
  });

  it("returns 403 getting a webhook that belongs to a different team", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/webhooks/${otherTeamWebhookId}`)
      .expect(403);
  });

  it("updates a team webhook", () => {
    return request(app.getHttpServer())
      .patch(`/v2/teams/${team.id}/webhooks/${webhookId}`)
      .send({ active: false } satisfies UpdateWebhookInputDto)
      .expect(200)
      .then((res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.active).toBe(false);
      });
  });

  it("deletes a team webhook", () => {
    return request(app.getHttpServer())
      .delete(`/v2/teams/${team.id}/webhooks/${webhookId}`)
      .expect(200)
      .then(async (res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);

        await request(app.getHttpServer()).get(`/v2/teams/${team.id}/webhooks/${webhookId}`).expect(404);
      });
  });
});
