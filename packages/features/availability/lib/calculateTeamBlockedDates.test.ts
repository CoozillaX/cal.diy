import { beforeEach, describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { getHolidayService } from "@calcom/lib/holidays";

import { UserAvailabilityService } from "./getUserAvailability";

// calculateTeamOutOfOfficeRanges clamps a closure's start to "today" (like personal OOO does),
// so tests use dates relative to now rather than hardcoded past strings.
const FUTURE_DAY_1 = dayjs().add(30, "day");
const FUTURE_DAY_2 = dayjs().add(31, "day");
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const nextWeekday = (from: dayjs.Dayjs, targetDay: number) => {
  let date = from;
  while (date.day() !== targetDay) {
    date = date.add(1, "day");
  }
  return date;
};

const FUTURE_SATURDAY = nextWeekday(FUTURE_DAY_1, 6);
const FUTURE_SUNDAY = FUTURE_SATURDAY.add(1, "day");

vi.mock("@calcom/lib/holidays", () => ({
  getHolidayService: vi.fn(() => ({
    getHolidayDatesInRange: vi.fn(),
  })),
}));

// Helper to create working hours with proper Date types for startTime/endTime
// Times are stored as Date objects with only time component (1970-01-01)
const createWorkingHours = (days: number[]) => ({
  days,
  startTime: new Date("1970-01-01T09:00:00.000Z"), // 9 AM
  endTime: new Date("1970-01-01T17:00:00.000Z"), // 5 PM
});

const mockTeamOooRepo = {
  findTeamOOODays: vi.fn(),
};

const mockHolidayRepo = {
  findTeamSettingsSelect: vi.fn(),
};

const mockDependencies = {
  oooRepo: {} as never,
  bookingRepo: {} as never,
  redisClient: {} as never,
  eventTypeRepo: {} as never,
  holidayRepo: mockHolidayRepo as never,
  teamOooRepo: mockTeamOooRepo as never,
};

describe("UserAvailabilityService.calculateTeamOutOfOfficeRanges", () => {
  let service: UserAvailabilityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserAvailabilityService(mockDependencies);
  });

  it("returns an empty object when the team has no closures", () => {
    const result = service.calculateTeamOutOfOfficeRanges([], [createWorkingHours([1, 2, 3, 4, 5])]);
    expect(result).toEqual({});
  });

  it("expands a closure into one entry per working day in range", () => {
    const result = service.calculateTeamOutOfOfficeRanges(
      [
        {
          id: 1,
          start: FUTURE_DAY_1.toDate(),
          end: FUTURE_DAY_2.endOf("day").toDate(),
          notes: "Company retreat",
          reason: { id: 1, emoji: "🏝️", reason: "vacation" },
        },
      ],
      [createWorkingHours(ALL_DAYS)]
    );

    expect(result).toEqual({
      [FUTURE_DAY_1.utc().format("YYYY-MM-DD")]: {
        fromUser: null,
        toUser: null,
        reason: "vacation",
        emoji: "🏝️",
        notes: "Company retreat",
      },
      [FUTURE_DAY_2.utc().format("YYYY-MM-DD")]: {
        fromUser: null,
        toUser: null,
        reason: "vacation",
        emoji: "🏝️",
        notes: "Company retreat",
      },
    });
  });

  it("skips days that fall outside the team's working days", () => {
    const result = service.calculateTeamOutOfOfficeRanges(
      [
        {
          id: 1,
          start: FUTURE_SATURDAY.startOf("day").toDate(),
          end: FUTURE_SUNDAY.endOf("day").toDate(),
          notes: null,
          reason: null,
        },
      ],
      [createWorkingHours([1, 2, 3, 4, 5])] // Monday-Friday only
    );

    expect(result).toEqual({});
  });
});

describe("UserAvailabilityService.calculateTeamBlockedDates", () => {
  let service: UserAvailabilityService;
  let mockHolidayService: { getHolidayDatesInRange: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserAvailabilityService(mockDependencies);
    mockHolidayService = { getHolidayDatesInRange: vi.fn() };
    vi.mocked(getHolidayService).mockReturnValue(mockHolidayService as never);
  });

  it("returns just the team's closures when it has no holiday country configured", async () => {
    mockTeamOooRepo.findTeamOOODays.mockResolvedValue([
      {
        id: 1,
        start: FUTURE_DAY_1.startOf("day").toDate(),
        end: FUTURE_DAY_1.endOf("day").toDate(),
        notes: null,
        reason: { id: 1, emoji: "🏢", reason: "Office closed" },
      },
    ]);
    mockHolidayRepo.findTeamSettingsSelect.mockResolvedValue(null);

    const result = await service.calculateTeamBlockedDates(
      99,
      FUTURE_DAY_1.subtract(1, "day").toDate(),
      FUTURE_DAY_1.add(1, "day").toDate(),
      [createWorkingHours(ALL_DAYS)]
    );

    expect(mockHolidayService.getHolidayDatesInRange).not.toHaveBeenCalled();
    expect(result).toEqual({
      [FUTURE_DAY_1.utc().format("YYYY-MM-DD")]: {
        fromUser: null,
        toUser: null,
        reason: "Office closed",
        emoji: "🏢",
        notes: null,
      },
    });
  });

  it("merges team closures with the team's public holidays", async () => {
    mockTeamOooRepo.findTeamOOODays.mockResolvedValue([]);
    mockHolidayRepo.findTeamSettingsSelect.mockResolvedValue({
      countryCode: "US",
      disabledIds: [],
    });
    mockHolidayService.getHolidayDatesInRange.mockResolvedValue([
      {
        date: "2025-01-01",
        holiday: { id: "new_years_day_2025", name: "New Year's Day", date: "2025-01-01", year: 2025 },
      },
    ]);

    const result = await service.calculateTeamBlockedDates(
      99,
      new Date("2025-01-01"),
      new Date("2025-01-31"),
      [createWorkingHours([1, 2, 3, 4, 5])]
    );

    expect(result).toEqual({
      "2025-01-01": {
        fromUser: null,
        toUser: null,
        reason: "New Year's Day",
        emoji: "🎆",
      },
    });
  });

  it("prefers an explicit team closure over the public holiday on the same date", async () => {
    const dateKey = FUTURE_DAY_1.utc().format("YYYY-MM-DD");

    mockTeamOooRepo.findTeamOOODays.mockResolvedValue([
      {
        id: 1,
        start: FUTURE_DAY_1.startOf("day").toDate(),
        end: FUTURE_DAY_1.endOf("day").toDate(),
        notes: "Custom note",
        reason: { id: 1, emoji: "🏢", reason: "Office closed" },
      },
    ]);
    mockHolidayRepo.findTeamSettingsSelect.mockResolvedValue({
      countryCode: "US",
      disabledIds: [],
    });
    mockHolidayService.getHolidayDatesInRange.mockResolvedValue([
      { date: dateKey, holiday: { id: "some_holiday", name: "Some Holiday", date: dateKey, year: 2025 } },
    ]);

    const result = await service.calculateTeamBlockedDates(
      99,
      FUTURE_DAY_1.subtract(1, "day").toDate(),
      FUTURE_DAY_1.add(1, "day").toDate(),
      [createWorkingHours(ALL_DAYS)]
    );

    expect(result[dateKey]).toEqual({
      fromUser: null,
      toUser: null,
      reason: "Office closed",
      emoji: "🏢",
      notes: "Custom note",
    });
  });
});
