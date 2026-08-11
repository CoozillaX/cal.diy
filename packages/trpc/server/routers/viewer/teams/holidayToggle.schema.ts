import { z } from "zod";

export const ZHolidayToggleInputSchema = z.object({
  teamId: z.number(),
  holidayId: z.string(),
  enabled: z.boolean(),
});

export type THolidayToggleInputSchema = z.infer<typeof ZHolidayToggleInputSchema>;
