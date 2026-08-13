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
import { CreateMembershipInputDto } from "@/modules/teams/inputs/create-membership.input";
import { CreateTeamInputDto } from "@/modules/teams/inputs/create-team.input";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";

// Single authenticated identity (the team owner) exercising the happy paths + the "not a member of this
// team" denial, for the same reason documented in teams-event-types.controller.e2e-spec.ts: a second Nest
// app with a different withApiAuth override in the same test file clobbers the first app's auth globally.
// The "caller lacks ADMIN" denial needs a genuinely different role, so that's covered separately in
// team-memberships-permission.e2e-spec.ts with its own single identity.
describe("TeamsController + TeamMembershipsController (e2e)", () => {
  let app: INestApplication;

  const ownerEmail = `teams-management-owner-${randomString()}@api.com`;
  let owner: UserWithProfile;
  let memberToAdd: UserWithProfile;
  let memberToRemove: UserWithProfile;
  let neverAMember: UserWithProfile;

  let team: Team;
  let otherTeam: Team;
  let createdTeamId: number;

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
    memberToAdd = await userRepositoryFixture.create({
      email: `teams-management-add-${randomString()}@api.com`,
      username: `teams-management-add-${randomString()}`,
    });
    memberToRemove = await userRepositoryFixture.create({
      email: `teams-management-remove-${randomString()}@api.com`,
      username: `teams-management-remove-${randomString()}`,
    });
    neverAMember = await userRepositoryFixture.create({
      email: `teams-management-never-a-member-${randomString()}@api.com`,
      username: `teams-management-never-a-member-${randomString()}`,
    });

    team = await teamRepositoryFixture.create({
      name: `teams-management-team-${randomString()}`,
      isOrganization: false,
    });
    otherTeam = await teamRepositoryFixture.create({
      name: `teams-management-other-team-${randomString()}`,
      isOrganization: false,
    });

    await membershipRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: owner.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });
    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: memberToRemove.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    if (createdTeamId) {
      await teamRepositoryFixture.delete(createdTeamId);
    }
    await teamRepositoryFixture.delete(team.id);
    await teamRepositoryFixture.delete(otherTeam.id);
    await userRepositoryFixture.deleteByEmail(owner.email);
    await userRepositoryFixture.deleteByEmail(memberToAdd.email);
    await userRepositoryFixture.deleteByEmail(memberToRemove.email);
    await userRepositoryFixture.deleteByEmail(neverAMember.email);
    await app.close();
  });

  it("creates a team and makes the caller its owner", () => {
    const teamName = `teams-management-created-${randomString()}`;

    return request(app.getHttpServer())
      .post("/v2/teams")
      .send({ name: teamName } satisfies CreateTeamInputDto)
      .expect(201)
      .then(async (res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.name).toEqual(teamName);
        createdTeamId = res.body.data.id;

        const membership = await membershipRepositoryFixture.getUserMembershipByTeamId(
          owner.id,
          createdTeamId
        );
        expect(membership?.role).toEqual("OWNER");
        expect(membership?.accepted).toBe(true);
      });
  });

  it("lists teams the authenticated user belongs to", () => {
    return request(app.getHttpServer())
      .get("/v2/teams")
      .expect(200)
      .then((res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.some((t: { id: number }) => t.id === team.id)).toBe(true);
      });
  });

  it("gets a team the authenticated user is a member of", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}`)
      .expect(200)
      .then((res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.id).toEqual(team.id);
      });
  });

  it("returns 403 getting a team the authenticated user is not a member of", () => {
    return request(app.getHttpServer()).get(`/v2/teams/${otherTeam.id}`).expect(403);
  });

  it("adds a member (caller is OWNER, which satisfies the TEAM_ADMIN minimum)", () => {
    return request(app.getHttpServer())
      .post(`/v2/teams/${team.id}/memberships`)
      .send({ userId: memberToAdd.id, role: "MEMBER" } satisfies CreateMembershipInputDto)
      .expect(201)
      .then(async (res) => {
        expect(res.body.status).toEqual(SUCCESS_STATUS);
        expect(res.body.data.userId).toEqual(memberToAdd.id);
        expect(res.body.data.teamId).toEqual(team.id);

        const membership = await membershipRepositoryFixture.getUserMembershipByTeamId(
          memberToAdd.id,
          team.id
        );
        expect(membership).not.toBeNull();
      });
  });

  it("removes a member", () => {
    return request(app.getHttpServer())
      .delete(`/v2/teams/${team.id}/memberships/${memberToRemove.id}`)
      .expect(200)
      .then(async () => {
        const membership = await membershipRepositoryFixture.getUserMembershipByTeamId(
          memberToRemove.id,
          team.id
        );
        expect(membership).toBeNull();
      });
  });

  it("returns 404 removing a membership that doesn't exist", () => {
    // `owner` has TEAM_ADMIN rights on `team` (passes RolesGuard), but `neverAMember` has no membership
    // row on it - the delete itself should 404, not the guard.
    return request(app.getHttpServer())
      .delete(`/v2/teams/${team.id}/memberships/${neverAMember.id}`)
      .expect(404);
  });
});
