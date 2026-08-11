import { z } from "zod";

export const ZOOOCreateInputSchema = z.object({
  teamId: z.number(),
  start: z.date(),
  end: z.date(),
  notes: z.string().nullish(),
  reasonId: z.number().nullish(),
});

export type TOOOCreateInputSchema = z.infer<typeof ZOOOCreateInputSchema>;
