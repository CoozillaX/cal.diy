import { z } from "zod";

export const ZOOODeleteInputSchema = z.object({
  teamId: z.number(),
  id: z.number(),
});

export type TOOODeleteInputSchema = z.infer<typeof ZOOODeleteInputSchema>;
