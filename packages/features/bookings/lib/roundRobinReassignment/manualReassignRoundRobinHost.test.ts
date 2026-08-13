import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { SchedulingType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "../../repositories/BookingRepository";
import { applyReassignment } from "./applyReassignment";
import { manualReassignRoundRobinHost } from "./manualReassignRoundRobinHost";

vi.mock("../../repositories/BookingRepository");
vi.mock("@calcom/features/host/repositories/HostRepository");
vi.mock("@calcom/features/users/repositories/UserRepository");
vi.mock("./applyReassignment", () => ({
  applyReassignment: vi.fn(),
}));
vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

const baseBooking = {
  id: 1,
  eventTypeId: 10,
  userId: 456,
  eventType: {
    schedulingType: SchedulingType.ROUND_ROBIN,
    hostGroups: [{ id: 1 }],
  },
};

describe("manualReassignRoundRobinHost", () => {
  let mockBookingRepo: { findByIdWithAttendeesPaymentAndReferences: ReturnType<typeof vi.fn> };
  let mockHostRepo: { findHostsPaginatedIncludeUserForAssignment: ReturnType<typeof vi.fn> };
  let mockUserRepo: { findById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookingRepo = { findByIdWithAttendeesPaymentAndReferences: vi.fn() };
    mockHostRepo = { findHostsPaginatedIncludeUserForAssignment: vi.fn() };
    mockUserRepo = { findById: vi.fn() };

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo as unknown as BookingRepository;
    });
    vi.mocked(HostRepository).mockImplementation(function () {
      return mockHostRepo as unknown as HostRepository;
    });
    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepo as unknown as UserRepository;
    });
    vi.mocked(applyReassignment).mockResolvedValue({ success: true });
  });

  it("throws NotFound when the booking does not exist", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(null);

    await expect(
      manualReassignRoundRobinHost({ bookingId: 1, newUserId: 999, reassignedById: 1 })
    ).rejects.toThrow(/Booking 1 not found/);
  });

  it("rejects non round-robin bookings", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue({
      ...baseBooking,
      eventType: { ...baseBooking.eventType, schedulingType: SchedulingType.COLLECTIVE },
    });

    await expect(
      manualReassignRoundRobinHost({ bookingId: 1, newUserId: 999, reassignedById: 1 })
    ).rejects.toThrow(/Only round-robin bookings/);
  });

  it("rejects event types with multiple host groups", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue({
      ...baseBooking,
      eventType: { ...baseBooking.eventType, hostGroups: [{ id: 1 }, { id: 2 }] },
    });

    await expect(
      manualReassignRoundRobinHost({ bookingId: 1, newUserId: 999, reassignedById: 1 })
    ).rejects.toThrow(/multiple host groups/);
  });

  it("rejects reassigning to the current organizer", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);

    await expect(
      manualReassignRoundRobinHost({ bookingId: 1, newUserId: 456, reassignedById: 1 })
    ).rejects.toThrow(/already assigned/);
  });

  it("rejects a target user who is not a round-robin host of the event type", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    mockHostRepo.findHostsPaginatedIncludeUserForAssignment.mockResolvedValue({ items: [] });

    await expect(
      manualReassignRoundRobinHost({ bookingId: 1, newUserId: 999, reassignedById: 1 })
    ).rejects.toThrow(/not a round-robin host/);
  });

  it("rejects a target user who is only a fixed host", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    mockHostRepo.findHostsPaginatedIncludeUserForAssignment.mockResolvedValue({
      items: [{ userId: 999, isFixed: true }],
    });

    await expect(
      manualReassignRoundRobinHost({ bookingId: 1, newUserId: 999, reassignedById: 1 })
    ).rejects.toThrow(/not a round-robin host/);
  });

  it("delegates to applyReassignment with the resolved host on success", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    mockHostRepo.findHostsPaginatedIncludeUserForAssignment.mockResolvedValue({
      items: [{ userId: 999, isFixed: false }],
    });
    mockUserRepo.findById.mockResolvedValue({
      id: 999,
      name: "New Host",
      email: "newhost@example.com",
      timeZone: "UTC",
      locale: "en",
    });

    const result = await manualReassignRoundRobinHost({
      bookingId: 1,
      newUserId: 999,
      reassignedById: 42,
      reassignReason: "Picked manually",
    });

    expect(result).toEqual({ success: true });
    expect(applyReassignment).toHaveBeenCalledWith({
      bookingId: 1,
      newHost: {
        id: 999,
        name: "New Host",
        email: "newhost@example.com",
        timeZone: "UTC",
        locale: "en",
      },
      reassignedById: 42,
      reassignReason: "Picked manually",
      reassignmentType: "manual",
    });
  });
});
