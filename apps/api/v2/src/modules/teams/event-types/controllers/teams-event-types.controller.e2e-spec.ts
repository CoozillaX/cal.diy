import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  CreateTeamEventTypeInput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
} from "@calcom/platform-types";
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
  let createdEventTypeId: number | undefined;
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
    // OWNER (not just ADMIN) so this identity can also exercise POST: RolesGuard itself only requires
    // TEAM_ADMIN, but eventType.create's *default* TeamPermissionSetting minimum role is OWNER
    // (packages/features/teams/lib/teamPermissions.ts) - createEventType() enforces that separately,
    // deeper inside TeamsEventTypesService.createTeamEventType, regardless of what RolesGuard already
    // allowed through.
    await membershipRepositoryFixture.create({
      role: "OWNER",
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
    if (createdEventTypeId) {
      await eventTypesRepositoryFixture.delete(createdEventTypeId);
    }
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

  it("creates a team event type with explicit hosts", () => {
    const createdSlug = `teams-event-types-created-${randomString()}`;

    // `hosts` rather than `assignAllTeamMembers: true`: the latter is only synced onto the Host table by
    // the web app's own form-submission logic (see git history: "make 'assign all team members' pure
    // frontend"), not by createEventType/updateEventType themselves - confirmed by hitting this endpoint
    // with assignAllTeamMembers alone and finding no Host row got created. Passing hosts explicitly, which
    // is what the vehicle-delivery round-robin + fallback-host flow needs anyway (per-host priority), sidesteps
    // that gap entirely.
    return request(app.getHttpServer())
      .post(`/v2/teams/${team.id}/event-types`)
      .send({
        title: "Vehicle Delivery",
        slug: createdSlug,
        description: "Created by teams-event-types.controller.e2e-spec.ts",
        lengthInMinutes: 30,
        schedulingType: "ROUND_ROBIN",
        hosts: [{ userId: user.id, mandatory: false, priority: "medium" }],
      } satisfies Partial<CreateTeamEventTypeInput_2024_06_14>)
      .expect(201)
      .then(async (res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.slug).toEqual(createdSlug);
        expect(res.body.data.teamId).toEqual(team.id);
        expect(res.body.data.schedulingType).toEqual("roundRobin");
        createdEventTypeId = res.body.data.id;

        const dbEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);
        const dbEventType = dbEventTypes.find((eventType) => eventType.id === createdEventTypeId);
        expect(dbEventType?.schedulingType).toEqual("ROUND_ROBIN");
        expect(dbEventType?.hosts.some((host) => host.userId === user.id)).toBe(true);
      });
  });

  it("updates a team event type", () => {
    const newTitle = `Vehicle Delivery (updated ${randomString()})`;

    return request(app.getHttpServer())
      .patch(`/v2/teams/${team.id}/event-types/${createdEventTypeId}`)
      .send({ title: newTitle } satisfies Partial<UpdateTeamEventTypeInput_2024_06_14>)
      .expect(200)
      .then(async (res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.title).toEqual(newTitle);

        const dbEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);
        const dbEventType = dbEventTypes.find((eventType) => eventType.id === createdEventTypeId);
        expect(dbEventType?.title).toEqual(newTitle);
      });
  });

  it("returns 404 updating a team event type that doesn't belong to the team", () => {
    return request(app.getHttpServer())
      .patch(`/v2/teams/${team.id}/event-types/999999999`)
      .send({ title: "should not apply" } satisfies Partial<UpdateTeamEventTypeInput_2024_06_14>)
      .expect(404);
  });

  it("deletes a team event type", () => {
    return request(app.getHttpServer())
      .delete(`/v2/teams/${team.id}/event-types/${createdEventTypeId}`)
      .expect(200)
      .then(async () => {
        const dbEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);
        expect(dbEventTypes.some((eventType) => eventType.id === createdEventTypeId)).toBe(false);
        // Already deleted via the API - afterAll shouldn't try to delete it again.
        createdEventTypeId = undefined;
      });
  });

  it("returns 404 deleting a team event type that doesn't belong to the team", () => {
    return request(app.getHttpServer()).delete(`/v2/teams/${team.id}/event-types/999999999`).expect(404);
  });
});
