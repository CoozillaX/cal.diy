import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { MembershipRole } from "@calcom/prisma/enums";
import { describe, expect, it, vi } from "vitest";
import { PermissionCheckService } from "./PermissionCheckService";

function createService(membership: { accepted: boolean; role: MembershipRole } | null) {
  const membershipRepository = {
    findUniqueByUserIdAndTeamId: vi.fn().mockResolvedValue(membership),
    findAllByUserId: vi.fn().mockResolvedValue(membership ? [{ teamId: 1, role: membership.role }] : []),
  } as unknown as MembershipRepository;

  return new PermissionCheckService(membershipRepository);
}

describe("PermissionCheckService (webhooks)", () => {
  it("grants access when the member's role is in fallbackRoles", async () => {
    const service = createService({ accepted: true, role: MembershipRole.ADMIN });

    const result = await service.checkPermission({
      userId: 1,
      teamId: 1,
      permission: "webhook.update",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    expect(result).toBe(true);
  });

  it("denies access when the member's role is not in fallbackRoles", async () => {
    const service = createService({ accepted: true, role: MembershipRole.MEMBER });

    const result = await service.checkPermission({
      userId: 1,
      teamId: 1,
      permission: "webhook.delete",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    expect(result).toBe(false);
  });

  it("denies access when the membership is not accepted", async () => {
    const service = createService({ accepted: false, role: MembershipRole.OWNER });

    const result = await service.checkPermission({
      userId: 1,
      teamId: 1,
      permission: "webhook.read",
      fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    expect(result).toBe(false);
  });

  it("denies access when there is no membership at all", async () => {
    const service = createService(null);

    const result = await service.checkPermission({
      userId: 1,
      teamId: 1,
      permission: "webhook.read",
      fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    expect(result).toBe(false);
  });

  it("returns only the teams where the caller holds one of the fallback roles", async () => {
    const service = createService({ accepted: true, role: MembershipRole.ADMIN });

    const teamIds = await service.getTeamIdsWithPermission({
      userId: 1,
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    expect(teamIds).toEqual([1]);
  });
});
