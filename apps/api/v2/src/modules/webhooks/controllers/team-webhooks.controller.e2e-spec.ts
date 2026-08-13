import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";
import { CreateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";

describe("TeamWebhooksController (e2e)", () => {
  let app: INestApplication;

  const ownerEmail = `team-webhooks-owner-${randomString()}@api.com`;
  let owner: UserWithProfile;
  let team: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;

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

    owner = await userRepositoryFixture.create({ email: ownerEmail, username: ownerEmail });
    team = await teamRepositoryFixture.create({
      name: `team-webhooks-team-${randomString()}`,
      isOrganization: false,
    });
    await membershipRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: owner.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await teamRepositoryFixture.delete(team.id);
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
});
