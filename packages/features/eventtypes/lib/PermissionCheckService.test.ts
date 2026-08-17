import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hasPermissionMock = vi.fn();
vi.mock("@calcom/features/teams/di/TeamPermissionSettingService.container", () => ({
  getTeamPermissionSettingService: () => ({ hasPermission: hasPermissionMock }),
}));

import { PermissionCheckService } from "./PermissionCheckService";

function createService(membership: { accepted: boolean; role: MembershipRole } | null) {
  const membershipRepository = {
    findUniqueByUserIdAndTeamId: vi.fn().mockResolvedValue(membership),
    findAllByUserId: vi.fn().mockResolvedValue(membership ? [{ teamId: 1, role: membership.role }] : []),
  } as unknown as MembershipRepository;

  return new PermissionCheckService(membershipRepository);
}

describe("PermissionCheckService (eventtypes)", () => {
  beforeEach(() => {
    hasPermissionMock.mockReset();
  });

  it("grants access when the member's role is in fallbackRoles for a non-catalog permission", async () => {
    const service = createService({ accepted: true, role: MembershipRole.ADMIN });

    const result = await service.checkPermission({
      userId: 1,
      teamId: 1,
      permission: "team.read",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    expect(result).toBe(true);
    expect(hasPermissionMock).not.toHaveBeenCalled();
  });

  it("denies access to a plain MEMBER for a non-catalog permission requiring ADMIN/OWNER", async () => {
    const service = createService({ accepted: true, role: MembershipRole.MEMBER });

    const result = await service.checkPermission({
      userId: 1,
      teamId: 1,
      permission: "team.read",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    expect(result).toBe(false);
  });

  it("delegates catalog permissions (e.g. eventType.update) to the team's configured minimum role", async () => {
    hasPermissionMock.mockResolvedValue(true);
    const service = createService({ accepted: true, role: MembershipRole.MEMBER });

    const result = await service.checkPermission({
      userId: 1,
      teamId: 1,
      permission: "eventType.update",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    expect(result).toBe(true);
    expect(hasPermissionMock).toHaveBeenCalledWith({
      teamId: 1,
      userId: 1,
      permissionKey: "eventType.update",
    });
  });

  it("getTeamIdsWithPermission only returns teams where the caller holds a fallback role", async () => {
    const service = createService({ accepted: true, role: MembershipRole.OWNER });

    const teamIds = await service.getTeamIdsWithPermission({
      userId: 1,
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    expect(teamIds).toEqual([1]);
  });
});
