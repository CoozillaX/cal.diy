import { z } from "zod";

export const ZHolidayUpdateSettingsInputSchema = z.object({
  teamId: z.number(),
  countryCode: z.string().nullable(),
  resetDisabledHolidays: z.boolean().optional().default(false),
});

export type THolidayUpdateSettingsInputSchema = z.infer<typeof ZHolidayUpdateSettingsInputSchema>;
