import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { MembershipRole } from "@calcom/prisma/enums";
import { describe, expect, it, vi } from "vitest";
import { PermissionCheckService } from "./PermissionCheckService";

function createService(membership: { accepted: boolean; role: MembershipRole } | null) {
  const membershipRepository = {
    findUniqueByUserIdAndTeamId: vi.fn().mockResolvedValue(membership),
  } as unknown as MembershipRepository;

  return new PermissionCheckService(membershipRepository);
}

describe("PermissionCheckService (watchlist)", () => {
  it("grants access to an org OWNER/ADMIN managing watchlist entries", async () => {
    const service = createService({ accepted: true, role: MembershipRole.OWNER });

    const result = await service.checkPermission({
      userId: 1,
      teamId: 10,
      permission: "watchlist.delete",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    expect(result).toBe(true);
  });

  it("denies a plain MEMBER from managing watchlist entries", async () => {
    const service = createService({ accepted: true, role: MembershipRole.MEMBER });

    const result = await service.checkPermission({
      userId: 1,
      teamId: 10,
      permission: "watchlist.create",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    expect(result).toBe(false);
  });

  it("denies access when the caller has no membership in the organization", async () => {
    const service = createService(null);

    const result = await service.checkPermission({
      userId: 1,
      teamId: 10,
      permission: "watchlist.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    expect(result).toBe(false);
  });
});
