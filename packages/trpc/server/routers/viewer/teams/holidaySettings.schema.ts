import { z } from "zod";

export const ZHolidaySettingsInputSchema = z.object({
  teamId: z.number(),
});

export type THolidaySettingsInputSchema = z.infer<typeof ZHolidaySettingsInputSchema>;
