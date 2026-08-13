import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { EventTypeHostService } from "@calcom/features/host/services/EventTypeHostService";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { getTeamPermissionSettingService } from "@calcom/features/teams/di/TeamPermissionSettingService.container";
import { TEAM_PERMISSIONS } from "@calcom/features/teams/lib/teamPermissions";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "../../repositories/BookingRepository";
import { getReassignmentCandidates } from "./getReassignmentCandidates";

vi.mock("../../repositories/BookingRepository");
vi.mock("@calcom/features/membership/repositories/MembershipRepository");
vi.mock("@calcom/features/host/services/EventTypeHostService");
vi.mock("@calcom/features/teams/di/TeamPermissionSettingService.container");
vi.mock("@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB");
vi.mock("@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers");
vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

const baseBooking = {
  id: 1,
  userId: 456,
  eventTypeId: 10,
  startTime: new Date("2026-01-01T10:00:00Z"),
  endTime: new Date("2026-01-01T10:30:00Z"),
  eventType: { teamId: 100 },
};

describe("getReassignmentCandidates", () => {
  let mockBookingRepo: { findByIdWithAttendeesPaymentAndReferences: ReturnType<typeof vi.fn> };
  let mockMembershipRepo: { findMembershipsWithUserByTeamId: ReturnType<typeof vi.fn> };
  let mockHostService: { getHostsForAssignment: ReturnType<typeof vi.fn> };
  let mockPermissionService: { getEffectiveSettings: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookingRepo = { findByIdWithAttendeesPaymentAndReferences: vi.fn() };
    mockMembershipRepo = { findMembershipsWithUserByTeamId: vi.fn() };
    mockHostService = { getHostsForAssignment: vi.fn() };
    mockPermissionService = { getEffectiveSettings: vi.fn().mockResolvedValue([]) };

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo as unknown as BookingRepository;
    });
    vi.mocked(MembershipRepository).mockImplementation(function () {
      return mockMembershipRepo as unknown as MembershipRepository;
    });
    vi.mocked(EventTypeHostService).mockImplementation(function () {
      return mockHostService as unknown as EventTypeHostService;
    });
    vi.mocked(getTeamPermissionSettingService).mockReturnValue(
      mockPermissionService as unknown as ReturnType<typeof getTeamPermissionSettingService>
    );
    vi.mocked(getEventTypesFromDB).mockRejectedValue(new Error("not needed for this test"));
    vi.mocked(ensureAvailableUsers).mockResolvedValue([]);
  });

  it("throws NotFound when the booking does not exist", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(null);

    await expect(getReassignmentCandidates({ bookingId: 1 })).rejects.toThrow(/Booking 1 not found/);
  });

  it("throws BadRequest when the event type has no team", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue({
      ...baseBooking,
      eventType: { teamId: null },
    });

    await expect(getReassignmentCandidates({ bookingId: 1 })).rejects.toThrow(/does not belong to a team/);
  });

  it("returns no items when nobody on the team meets the reassign minimum role", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    mockMembershipRepo.findMembershipsWithUserByTeamId.mockResolvedValue([
      { role: MembershipRole.MEMBER, accepted: true, user: { id: 1 } },
    ]);
    mockPermissionService.getEffectiveSettings.mockResolvedValue([
      { permissionKey: TEAM_PERMISSIONS.BOOKING_REASSIGN, minimumRole: MembershipRole.ADMIN },
    ]);

    const result = await getReassignmentCandidates({ bookingId: 1 });

    expect(result).toEqual({ items: [], nextCursor: undefined, hasMore: false });
    expect(mockHostService.getHostsForAssignment).not.toHaveBeenCalled();
  });

  it("excludes the current organizer and members below the minimum role", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    mockMembershipRepo.findMembershipsWithUserByTeamId.mockResolvedValue([
      { role: MembershipRole.ADMIN, accepted: true, user: { id: 456 } }, // current organizer - excluded
      { role: MembershipRole.MEMBER, accepted: true, user: { id: 2 } }, // below minimum role - excluded
      { role: MembershipRole.ADMIN, accepted: true, user: { id: 3 } }, // eligible
      { role: MembershipRole.ADMIN, accepted: false, user: { id: 4 } }, // not accepted - excluded
    ]);
    mockPermissionService.getEffectiveSettings.mockResolvedValue([
      { permissionKey: TEAM_PERMISSIONS.BOOKING_REASSIGN, minimumRole: MembershipRole.ADMIN },
    ]);
    mockHostService.getHostsForAssignment.mockResolvedValue({
      hosts: [{ userId: 3, isFixed: false, name: "Eligible Host", email: "eligible@example.com" }],
      nextCursor: undefined,
      hasMore: false,
    });

    const result = await getReassignmentCandidates({ bookingId: 1 });

    expect(mockHostService.getHostsForAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ eventTypeId: 10, memberUserIds: [3] })
    );
    expect(result.items).toEqual([
      { id: 3, name: "Eligible Host", email: "eligible@example.com", status: "available" },
    ]);
  });

  it("filters out fixed hosts from the candidate list", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    mockMembershipRepo.findMembershipsWithUserByTeamId.mockResolvedValue([
      { role: MembershipRole.ADMIN, accepted: true, user: { id: 3 } },
    ]);
    mockHostService.getHostsForAssignment.mockResolvedValue({
      hosts: [{ userId: 3, isFixed: true, name: "Fixed Host", email: "fixed@example.com" }],
      nextCursor: undefined,
      hasMore: false,
    });

    const result = await getReassignmentCandidates({ bookingId: 1 });

    expect(result.items).toEqual([]);
  });

  it("marks a candidate unavailable when they have no free slot at the booking's time", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    mockMembershipRepo.findMembershipsWithUserByTeamId.mockResolvedValue([
      { role: MembershipRole.ADMIN, accepted: true, user: { id: 3 } },
    ]);
    mockHostService.getHostsForAssignment.mockResolvedValue({
      hosts: [{ userId: 3, isFixed: false, name: "Busy Host", email: "busy@example.com" }],
      nextCursor: undefined,
      hasMore: false,
    });
    vi.mocked(getEventTypesFromDB).mockResolvedValue({
      hosts: [{ isFixed: false, user: { id: 3, timeZone: "UTC" } }],
    } as unknown as Awaited<ReturnType<typeof getEventTypesFromDB>>);
    vi.mocked(ensureAvailableUsers).mockResolvedValue([]);

    const result = await getReassignmentCandidates({ bookingId: 1 });

    expect(result.items).toEqual([
      { id: 3, name: "Busy Host", email: "busy@example.com", status: "unavailable" },
    ]);
  });

  it("defaults every candidate to available when availability computation fails", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    mockMembershipRepo.findMembershipsWithUserByTeamId.mockResolvedValue([
      { role: MembershipRole.ADMIN, accepted: true, user: { id: 3 } },
    ]);
    mockHostService.getHostsForAssignment.mockResolvedValue({
      hosts: [{ userId: 3, isFixed: false, name: "Host", email: "host@example.com" }],
      nextCursor: undefined,
      hasMore: false,
    });
    vi.mocked(getEventTypesFromDB).mockRejectedValue(new Error("db unavailable"));

    const result = await getReassignmentCandidates({ bookingId: 1 });

    expect(result.items).toEqual([{ id: 3, name: "Host", email: "host@example.com", status: "available" }]);
  });
});
