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
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";

// Covers the RolesGuard role-hierarchy comparison itself (TEAM_MEMBER vs the TEAM_ADMIN minimum required
// by these two routes), as opposed to teams-management.e2e-spec.ts which only ever calls as an OWNER and
// so never exercises a caller who *is* a team member but doesn't meet the ADMIN bar.
describe("TeamMembershipsController permissions (e2e)", () => {
  let app: INestApplication;

  const plainMemberEmail = `team-memberships-permission-member-${randomString()}@api.com`;
  let plainMember: UserWithProfile;
  let target: UserWithProfile;
  let team: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      plainMemberEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    ).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    plainMember = await userRepositoryFixture.create({
      email: plainMemberEmail,
      username: plainMemberEmail,
    });
    target = await userRepositoryFixture.create({
      email: `team-memberships-permission-target-${randomString()}@api.com`,
      username: `team-memberships-permission-target-${randomString()}`,
    });

    team = await teamRepositoryFixture.create({
      name: `team-memberships-permission-team-${randomString()}`,
      isOrganization: false,
    });

    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: plainMember.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });
    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: target.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await teamRepositoryFixture.delete(team.id);
    await userRepositoryFixture.deleteByEmail(plainMember.email);
    await userRepositoryFixture.deleteByEmail(target.email);
    await app.close();
  });

  it("returns 403 adding a member as a plain MEMBER (below the TEAM_ADMIN minimum)", () => {
    return request(app.getHttpServer())
      .post(`/v2/teams/${team.id}/memberships`)
      .send({ userId: 999999 } satisfies CreateMembershipInputDto)
      .expect(403);
  });

  it("returns 403 removing a member as a plain MEMBER (below the TEAM_ADMIN minimum)", () => {
    return request(app.getHttpServer()).delete(`/v2/teams/${team.id}/memberships/${target.id}`).expect(403);
  });
});
