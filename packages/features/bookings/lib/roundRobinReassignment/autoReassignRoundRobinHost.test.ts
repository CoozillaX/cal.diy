import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { getLuckyUserService } from "@calcom/features/di/containers/LuckyUser";
import { SchedulingType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "../../repositories/BookingRepository";
import { applyReassignment } from "./applyReassignment";
import { autoReassignRoundRobinHost } from "./autoReassignRoundRobinHost";

vi.mock("../../repositories/BookingRepository");
vi.mock("@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB");
vi.mock("@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers");
vi.mock("@calcom/features/di/containers/LuckyUser");
vi.mock("./applyReassignment", () => ({
  applyReassignment: vi.fn(),
}));
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
  eventType: {
    schedulingType: SchedulingType.ROUND_ROBIN,
    hostGroups: [{ id: "1" }],
  },
};

const otherUser = { id: 3, timeZone: "UTC", isFixed: false, groupId: "1" };

describe("autoReassignRoundRobinHost", () => {
  let mockBookingRepo: { findByIdWithAttendeesPaymentAndReferences: ReturnType<typeof vi.fn> };
  let mockGetLuckyUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookingRepo = { findByIdWithAttendeesPaymentAndReferences: vi.fn() };
    mockGetLuckyUser = vi.fn();

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo as unknown as BookingRepository;
    });
    vi.mocked(getLuckyUserService).mockReturnValue({
      getLuckyUser: mockGetLuckyUser,
    } as unknown as ReturnType<typeof getLuckyUserService>);
    vi.mocked(applyReassignment).mockResolvedValue({ success: true });
  });

  it("throws NotFound when the booking does not exist", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(null);

    await expect(autoReassignRoundRobinHost({ bookingId: 1, reassignedById: 1 })).rejects.toThrow(
      /Booking 1 not found/
    );
  });

  it("rejects non round-robin bookings", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue({
      ...baseBooking,
      eventType: { ...baseBooking.eventType, schedulingType: SchedulingType.COLLECTIVE },
    });

    await expect(autoReassignRoundRobinHost({ bookingId: 1, reassignedById: 1 })).rejects.toThrow(
      /Only round-robin bookings/
    );
  });

  it("rejects event types with multiple host groups", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue({
      ...baseBooking,
      eventType: { ...baseBooking.eventType, hostGroups: [{ id: "1" }, { id: "2" }] },
    });

    await expect(autoReassignRoundRobinHost({ bookingId: 1, reassignedById: 1 })).rejects.toThrow(
      /multiple host groups/
    );
  });

  it("rejects when no other host is configured on the event type", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    vi.mocked(getEventTypesFromDB).mockResolvedValue({
      users: [{ id: 456 }], // only the current organizer
      hosts: [],
      hostGroups: baseBooking.eventType.hostGroups,
    } as unknown as Awaited<ReturnType<typeof getEventTypesFromDB>>);

    await expect(autoReassignRoundRobinHost({ bookingId: 1, reassignedById: 1 })).rejects.toThrow(
      /No other host is configured/
    );
  });

  it("rejects when no other host is currently available", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    vi.mocked(getEventTypesFromDB).mockResolvedValue({
      users: [{ id: 456 }, otherUser],
      hosts: [{ isFixed: false, user: { id: 3 } }],
      hostGroups: baseBooking.eventType.hostGroups,
    } as unknown as Awaited<ReturnType<typeof getEventTypesFromDB>>);
    vi.mocked(ensureAvailableUsers).mockResolvedValue([]);

    await expect(autoReassignRoundRobinHost({ bookingId: 1, reassignedById: 1 })).rejects.toThrow(
      /No other host is currently available/
    );
  });

  it("picks a lucky user among the available candidates and delegates to applyReassignment", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(baseBooking);
    vi.mocked(getEventTypesFromDB).mockResolvedValue({
      users: [{ id: 456 }, otherUser],
      hosts: [{ isFixed: false, user: { id: 3 } }],
      hostGroups: baseBooking.eventType.hostGroups,
    } as unknown as Awaited<ReturnType<typeof getEventTypesFromDB>>);
    vi.mocked(ensureAvailableUsers).mockResolvedValue([otherUser] as never);
    mockGetLuckyUser.mockResolvedValue({
      id: 3,
      name: "Lucky Host",
      email: "lucky@example.com",
      timeZone: "UTC",
      locale: "en",
    });

    const result = await autoReassignRoundRobinHost({
      bookingId: 1,
      reassignedById: 42,
      reassignReason: "Round robin pick",
    });

    expect(result).toEqual({ success: true });
    expect(applyReassignment).toHaveBeenCalledWith({
      bookingId: 1,
      newHost: {
        id: 3,
        name: "Lucky Host",
        email: "lucky@example.com",
        timeZone: "UTC",
        locale: "en",
      },
      reassignedById: 42,
      reassignReason: "Round robin pick",
      reassignmentType: "roundRobin",
    });
  });
});
