import dayjs from "@calcom/dayjs";

import { GOOGLE_HOLIDAY_CALENDARS } from "./constants";

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
}

interface GoogleCalendarEventsResponse {
  items?: GoogleCalendarEvent[];
  error?: {
    code: number;
    message: string;
  };
}

export interface GoogleCalendarHoliday {
  id: string;
  countryCode: string;
  eventId: string;
  name: string;
  date: Date;
  year: number;
}

export class GoogleCalendarClient {
  // GOOGLE_CALENDAR_API_KEY is documented as optional (it only gates the public-holiday
  // auto-fetch feature) - throwing here would take down the whole availability/booking flow
  // for every request whenever it's unset, instead of just disabling this one feature.
  private apiKey: string | null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_CALENDAR_API_KEY || null;
    if (!this.apiKey) {
      console.warn(
        "GOOGLE_CALENDAR_API_KEY is not set - public holiday auto-fetch is disabled until it's configured."
      );
    }
  }

  async fetchHolidays(countryCode: string, year: number): Promise<GoogleCalendarHoliday[]> {
    if (!this.apiKey) {
      return [];
    }

    const calendarConfig = GOOGLE_HOLIDAY_CALENDARS[countryCode];
    if (!calendarConfig) {
      return [];
    }

    const calendarId = encodeURIComponent(calendarConfig.calendarId);

    const timeMin = dayjs(`${year}-01-01`).startOf("day").toISOString();
    const timeMax = dayjs(`${year}-12-31`).endOf("day").toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${this.apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    const response = await fetch(url);
    const data: GoogleCalendarEventsResponse = await response.json();

    if (data.error) {
      console.error(`Google Calendar API error for ${countryCode}:`, data.error);
      throw new Error(`Google Calendar API error: ${data.error.message}`);
    }

    if (!data.items) {
      return [];
    }

    return data.items.map((event) => {
      const dateStr = event.start.date || event.start.dateTime?.split("T")[0];
      const date = dateStr ? dayjs(dateStr).toDate() : new Date();

      return {
        id: `${countryCode}_${event.id}`,
        countryCode,
        eventId: event.id,
        name: event.summary,
        date,
        year,
      };
    });
  }
}

let defaultClient: GoogleCalendarClient | null = null;

export function getGoogleCalendarClient(): GoogleCalendarClient {
  if (!defaultClient) {
    defaultClient = new GoogleCalendarClient();
  }
  return defaultClient;
}
