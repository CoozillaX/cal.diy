import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
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

// This is the first real exercise of RolesGuard (apps/api/v2/src/modules/auth/guards/roles/roles.guard.ts):
// at the time this test was written it had zero call sites anywhere in the repo, so both the "granted"
// and "denied" branches of its team-membership check are asserted here rather than assumed to work.
//
// The denied branch is exercised via `otherTeam`, a second team the authenticated user has no membership
// row for, rather than via a second user identity: `ApiAuthStrategy` is process-globally registered under
// a fixed passport strategy name, so compiling a second Nest test app with a different `withApiAuth`
// override in the same test file silently clobbers the first app's auth (both end up authenticating as
// whichever app was compiled last). One authenticated identity + two teams sidesteps that entirely.
describe("TeamsEventTypesController (e2e)", () => {
  let app: INestApplication;

  const userEmail = `teams-event-types-user-${randomString()}@api.com`;
  let user: UserWithProfile;

  let team: Team;
  let otherTeam: Team;
  let eventTypeId: number;
  const eventSlug = `teams-event-types-${randomString()}`;

  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      userEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    ).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({ email: userEmail, username: userEmail });

    team = await teamRepositoryFixture.create({
      name: `teams-event-types-team-${randomString()}`,
      isOrganization: false,
    });
    otherTeam = await teamRepositoryFixture.create({
      name: `teams-event-types-other-team-${randomString()}`,
      isOrganization: false,
    });

    // `user` is only added to `team`, not `otherTeam` - that gap is what exercises RolesGuard's denial path.
    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: user.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    const eventType = await eventTypesRepositoryFixture.createTeamEventType({
      title: `teams-event-types-${randomString()}`,
      slug: eventSlug,
      length: 30,
      locations: [],
      schedulingType: "COLLECTIVE",
      team: { connect: { id: team.id } },
    });
    eventTypeId = eventType.id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await eventTypesRepositoryFixture.delete(eventTypeId);
    await teamRepositoryFixture.delete(team.id);
    await teamRepositoryFixture.delete(otherTeam.id);
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });

  it("resolves an event type id from team id + eventSlug", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/event-types`)
      .query({ eventSlug })
      .expect(200)
      .then((res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.id).toEqual(eventTypeId);
        expect(res.body.data.slug).toEqual(eventSlug);
        expect(res.body.data.teamId).toEqual(team.id);
      });
  });

  it("returns 404 for an eventSlug that doesn't exist on the team", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/event-types`)
      .query({ eventSlug: `does-not-exist-${randomString()}` })
      .expect(404);
  });

  it("lists all team event types when eventSlug is omitted", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/event-types`)
      .expect(200)
      .then((res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.some((eventType: { id: number }) => eventType.id === eventTypeId)).toBe(true);
      });
  });

  it("returns 403 for a team the authenticated user is not a member of", () => {
    return request(app.getHttpServer()).get(`/v2/teams/${otherTeam.id}/event-types`).expect(403);
  });
});
