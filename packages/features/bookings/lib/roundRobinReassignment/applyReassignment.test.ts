import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { buildCalEventFromBooking } from "@calcom/lib/buildCalEventFromBooking";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "../../repositories/BookingRepository";
import { applyReassignment } from "./applyReassignment";

vi.mock("../../repositories/BookingRepository");
vi.mock("@calcom/features/assignment-reason/repositories/AssignmentReasonRepository");
vi.mock("@calcom/features/bookings/lib/EventManager");
vi.mock("@calcom/lib/buildCalEventFromBooking");
vi.mock("@calcom/app-store/delegationCredential", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
}));
vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

const newHost = {
  id: 999,
  name: "New Host",
  email: "newhost@example.com",
  timeZone: "UTC",
  locale: "en",
};

describe("applyReassignment", () => {
  let mockBookingRepo: {
    findByIdWithAttendeesPaymentAndReferences: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockAssignmentReasonRepo: {
    createAssignmentReason: ReturnType<typeof vi.fn>;
  };
  let mockUpdateCalendarAttendees: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookingRepo = {
      findByIdWithAttendeesPaymentAndReferences: vi.fn(),
      update: vi.fn(),
    };
    mockAssignmentReasonRepo = {
      createAssignmentReason: vi.fn(),
    };
    mockUpdateCalendarAttendees = vi.fn().mockResolvedValue(undefined);

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo as unknown as BookingRepository;
    });
    vi.mocked(AssignmentReasonRepository).mockImplementation(function () {
      return mockAssignmentReasonRepo as unknown as AssignmentReasonRepository;
    });
    vi.mocked(EventManager).mockImplementation(function () {
      return { updateCalendarAttendees: mockUpdateCalendarAttendees } as unknown as EventManager;
    });
    vi.mocked(buildCalEventFromBooking).mockResolvedValue({} as never);
    vi.mocked(getUsersCredentialsIncludeServiceAccountKey).mockResolvedValue([]);
  });

  it("throws NotFound when the booking does not exist", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue(null);

    await expect(
      applyReassignment({
        bookingId: 1,
        newHost,
        reassignedById: 1,
        reassignmentType: "manual",
      })
    ).rejects.toThrow(/Booking 1 not found/);

    expect(mockBookingRepo.update).not.toHaveBeenCalled();
  });

  it("swaps the organizer and clears AWAITING_HOST back to ACCEPTED", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue({
      id: 1,
      status: BookingStatus.AWAITING_HOST,
      location: "https://meet.example.com",
      userId: 456,
    });

    const result = await applyReassignment({
      bookingId: 1,
      newHost,
      reassignedById: 42,
      reassignReason: "Fallback host was unavailable",
      reassignmentType: "manual",
    });

    expect(result).toEqual({ success: true });
    expect(mockBookingRepo.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        userId: newHost.id,
        userPrimaryEmail: newHost.email,
        reassignById: 42,
        reassignReason: "Fallback host was unavailable",
        status: BookingStatus.ACCEPTED,
      },
    });
  });

  it("does not touch status when the booking was already ACCEPTED", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue({
      id: 2,
      status: BookingStatus.ACCEPTED,
      location: null,
      userId: 456,
    });

    await applyReassignment({
      bookingId: 2,
      newHost,
      reassignedById: 42,
      reassignmentType: "roundRobin",
    });

    const updateCall = mockBookingRepo.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("status");
  });

  it("writes an assignment reason recording the reassignment", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue({
      id: 3,
      status: BookingStatus.ACCEPTED,
      location: null,
      userId: 456,
    });

    await applyReassignment({
      bookingId: 3,
      newHost,
      reassignedById: 42,
      reassignReason: "Manual pick",
      reassignmentType: "manual",
    });

    expect(mockAssignmentReasonRepo.createAssignmentReason).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 3, reasonString: "Manual pick" })
    );
  });

  it("still succeeds when best-effort calendar sync throws", async () => {
    mockBookingRepo.findByIdWithAttendeesPaymentAndReferences.mockResolvedValue({
      id: 4,
      status: BookingStatus.ACCEPTED,
      location: null,
      userId: 456,
    });
    mockUpdateCalendarAttendees.mockRejectedValue(new Error("calendar provider down"));

    const result = await applyReassignment({
      bookingId: 4,
      newHost,
      reassignedById: 42,
      reassignmentType: "manual",
    });

    expect(result).toEqual({ success: true });
    expect(mockBookingRepo.update).toHaveBeenCalled();
    expect(mockAssignmentReasonRepo.createAssignmentReason).toHaveBeenCalled();
  });
});
